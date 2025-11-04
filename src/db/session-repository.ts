/**
 * Session Repository
 * Database operations for chat sessions using Drizzle ORM
 *
 * Advantages over file-based storage:
 * - Indexed queries: Fast search by title, provider, date
 * - Pagination: Load only needed sessions (no memory bloat)
 * - Aggregations: Count messages without loading full session
 * - Transactions: Data consistency for complex operations
 * - Concurrent access: Proper locking and consistency
 * - Efficient updates: Update specific fields without rewriting entire file
 */

import { eq, desc, and, like, sql, inArray } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { randomUUID } from 'node:crypto';
import {
  sessions,
  messages,
  messageParts,
  messageAttachments,
  messageUsage,
  todos,
  messageTodoSnapshots,
  type Session,
  type NewSession,
  type Message,
  type NewMessage,
} from './schema.js';
import type {
  Session as SessionType,
  SessionMessage,
  MessagePart,
  FileAttachment,
  TokenUsage,
  MessageMetadata,
  StreamingPart,
} from '../types/session.types.js';
import type { Todo as TodoType } from '../types/todo.types.js';
import type { ProviderId } from '../config/ai-config.js';

/**
 * Retry helper for handling SQLITE_BUSY errors
 * Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms
 */
async function retryOnBusy<T>(
  operation: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Only retry on SQLITE_BUSY errors
      if (error.message?.includes('SQLITE_BUSY') || error.code === 'SQLITE_BUSY') {
        const delay = 50 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Other errors: throw immediately
      throw error;
    }
  }

  // Max retries exceeded
  throw lastError;
}

export class SessionRepository {
  constructor(private db: LibSQLDatabase) {}

  /**
   * Create a new session
   */
  async createSession(provider: ProviderId, model: string): Promise<SessionType> {
    const now = Date.now();
    const sessionId = `session-${now}`;

    const newSession: NewSession = {
      id: sessionId,
      provider,
      model,
      nextTodoId: 1,
      created: now,
      updated: now,
    };

    await this.db.insert(sessions).values(newSession);

    return {
      id: sessionId,
      provider,
      model,
      messages: [],
      todos: [],
      nextTodoId: 1,
      created: now,
      updated: now,
    };
  }

  /**
   * Create session with specific ID and timestamps (for migration)
   */
  async createSessionFromData(sessionData: {
    id: string;
    provider: ProviderId;
    model: string;
    title?: string;
    nextTodoId: number;
    created: number;
    updated: number;
  }): Promise<void> {
    await retryOnBusy(async () => {
      const newSession: NewSession = {
        id: sessionData.id,
        title: sessionData.title || null,
        provider: sessionData.provider,
        model: sessionData.model,
        nextTodoId: sessionData.nextTodoId,
        created: sessionData.created,
        updated: sessionData.updated,
      };

      await this.db.insert(sessions).values(newSession);
    });
  }

  /**
   * Get recent sessions with pagination
   * HUGE performance improvement: Only load 20 recent sessions instead of all
   */
  async getRecentSessions(limit = 20, offset = 0): Promise<SessionType[]> {
    // Get session metadata only (no messages yet - lazy loading!)
    const sessionRecords = await this.db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.updated))
      .limit(limit)
      .offset(offset);

    // For each session, load messages, todos, etc.
    const fullSessions = await Promise.all(
      sessionRecords.map((session) => this.getSessionById(session.id))
    );

    return fullSessions.filter((s): s is SessionType => s !== null);
  }

  /**
   * Get session by ID with all related data
   */
  async getSessionById(sessionId: string): Promise<SessionType | null> {
    // Get session metadata
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session) {
      return null;
    }

    // Get messages with all parts, attachments, usage
    const sessionMessages = await this.getSessionMessages(sessionId);

    // Get todos
    const sessionTodos = await this.getSessionTodos(sessionId);

    // Build return object
    const result: SessionType = {
      id: session.id,
      title: session.title || undefined,
      provider: session.provider as ProviderId,
      model: session.model,
      messages: sessionMessages,
      todos: sessionTodos,
      nextTodoId: session.nextTodoId,
      created: session.created,
      updated: session.updated,
    };

    return result;
  }

  /**
   * Get messages for a session
   * Assembles message parts, attachments, usage into SessionMessage format
   * OPTIMIZED: Batch queries instead of N+1 queries
   */
  private async getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
    // Get all messages for session
    const messageRecords = await this.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.ordering);

    if (messageRecords.length === 0) {
      return [];
    }

    // Batch fetch all related data (MASSIVE performance improvement!)
    const messageIds = messageRecords.map((m) => m.id);

    // Fetch all parts, attachments, usage, snapshots in parallel (OPTIMIZED!)
    const [allParts, allAttachments, allUsage, allSnapshots] = await Promise.all([
      // Get all message parts for all messages
      this.db
        .select()
        .from(messageParts)
        .where(inArray(messageParts.messageId, messageIds))
        .orderBy(messageParts.ordering),

      // Get all attachments for all messages
      this.db
        .select()
        .from(messageAttachments)
        .where(inArray(messageAttachments.messageId, messageIds)),

      // Get all usage for all messages
      this.db
        .select()
        .from(messageUsage)
        .where(inArray(messageUsage.messageId, messageIds)),

      // Get all todo snapshots for all messages
      this.db
        .select()
        .from(messageTodoSnapshots)
        .where(inArray(messageTodoSnapshots.messageId, messageIds))
        .orderBy(messageTodoSnapshots.ordering),
    ]);

    // Group by message ID for O(1) lookup
    const partsByMessage = new Map<string, typeof allParts>();
    const attachmentsByMessage = new Map<string, typeof allAttachments>();
    const usageByMessage = new Map<string, (typeof allUsage)[0]>();
    const snapshotsByMessage = new Map<string, typeof allSnapshots>();

    for (const part of allParts) {
      if (!partsByMessage.has(part.messageId)) {
        partsByMessage.set(part.messageId, []);
      }
      partsByMessage.get(part.messageId)!.push(part);
    }

    for (const attachment of allAttachments) {
      if (!attachmentsByMessage.has(attachment.messageId)) {
        attachmentsByMessage.set(attachment.messageId, []);
      }
      attachmentsByMessage.get(attachment.messageId)!.push(attachment);
    }

    for (const usage of allUsage) {
      usageByMessage.set(usage.messageId, usage);
    }

    for (const snapshot of allSnapshots) {
      if (!snapshotsByMessage.has(snapshot.messageId)) {
        snapshotsByMessage.set(snapshot.messageId, []);
      }
      snapshotsByMessage.get(snapshot.messageId)!.push(snapshot);
    }

    // Assemble messages using grouped data
    const fullMessages = messageRecords.map((msg) => {
      const parts = partsByMessage.get(msg.id) || [];
      const attachments = attachmentsByMessage.get(msg.id) || [];
      const usage = usageByMessage.get(msg.id);
      const todoSnap = snapshotsByMessage.get(msg.id) || [];

      const sessionMessage: SessionMessage = {
        role: msg.role as 'user' | 'assistant',
        content: parts.map((p) => JSON.parse(p.content) as MessagePart),
        timestamp: msg.timestamp,
        status: (msg.status as 'active' | 'completed' | 'error' | 'abort') || 'completed',
      };

      if (msg.metadata) {
        sessionMessage.metadata = JSON.parse(msg.metadata) as MessageMetadata;
      }

      // Self-healing: Normalize attachments on read
      // Old/corrupted data might have invalid entries - filter them out
      if (attachments.length > 0) {
        const validAttachments = attachments.filter((a) =>
          a && typeof a === 'object' && a.path && a.relativePath
        );

        if (validAttachments.length > 0) {
          sessionMessage.attachments = validAttachments.map((a) => ({
            path: a.path,
            relativePath: a.relativePath,
            size: a.size || undefined,
          }));
        }
        // If all invalid, leave attachments undefined (no broken data in memory)
      }

      if (usage) {
        sessionMessage.usage = {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        };
      }

      if (msg.finishReason) {
        sessionMessage.finishReason = msg.finishReason;
      }

      if (todoSnap.length > 0) {
        sessionMessage.todoSnapshot = todoSnap.map((t) => ({
          id: t.todoId,
          content: t.content,
          activeForm: t.activeForm,
          status: t.status as 'pending' | 'in_progress' | 'completed',
          ordering: t.ordering,
        }));
      }

      return sessionMessage;
    });

    return fullMessages;
  }

  /**
   * Get todos for a session
   */
  private async getSessionTodos(sessionId: string): Promise<TodoType[]> {
    const todoRecords = await this.db
      .select()
      .from(todos)
      .where(eq(todos.sessionId, sessionId))
      .orderBy(todos.ordering);

    return todoRecords.map((t) => ({
      id: t.id,
      content: t.content,
      activeForm: t.activeForm,
      status: t.status as 'pending' | 'in_progress' | 'completed',
      ordering: t.ordering,
    }));
  }

  /**
   * Add message to session
   * Atomically inserts message with all parts, attachments, usage
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: MessagePart[],
    attachments?: FileAttachment[],
    usage?: TokenUsage,
    finishReason?: string,
    metadata?: MessageMetadata,
    todoSnapshot?: TodoType[],
    status?: 'active' | 'completed' | 'error' | 'abort'
  ): Promise<string> {
    return await retryOnBusy(async () => {
      const messageId = randomUUID();
      const now = Date.now();

      // Get current message count for ordering
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.sessionId, sessionId));

      const ordering = count;

      // Insert in transaction
      await this.db.transaction(async (tx) => {
      // Insert message
      await tx.insert(messages).values({
        id: messageId,
        sessionId,
        role,
        timestamp: now,
        ordering,
        finishReason: finishReason || null,
        status: status || 'completed',
        metadata: metadata ? JSON.stringify(metadata) : null,
      });

      // Insert message parts
      for (let i = 0; i < content.length; i++) {
        await tx.insert(messageParts).values({
          id: randomUUID(),
          messageId,
          ordering: i,
          type: content[i].type,
          content: JSON.stringify(content[i]),
        });
      }

      // Insert attachments
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          await tx.insert(messageAttachments).values({
            id: randomUUID(),
            messageId,
            path: att.path,
            relativePath: att.relativePath,
            size: att.size || null,
          });
        }
      }

      // Insert usage
      if (usage) {
        await tx.insert(messageUsage).values({
          messageId,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        });
      }

      // Insert todo snapshot
      if (todoSnapshot && todoSnapshot.length > 0) {
        for (const todo of todoSnapshot) {
          await tx.insert(messageTodoSnapshots).values({
            id: randomUUID(),
            messageId,
            todoId: todo.id,
            content: todo.content,
            activeForm: todo.activeForm,
            status: todo.status,
            ordering: todo.ordering,
          });
        }
      }

      // Update session timestamp
      await tx
        .update(sessions)
        .set({ updated: now })
        .where(eq(sessions.id, sessionId));
      });

      return messageId;
    });
  }

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ title, updated: Date.now() })
      .where(eq(sessions.id, sessionId));
  }

  /**
   * Update session model
   */
  async updateSessionModel(sessionId: string, model: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ model, updated: Date.now() })
      .where(eq(sessions.id, sessionId));
  }

  /**
   * Update session provider and model
   */
  async updateSessionProvider(sessionId: string, provider: ProviderId, model: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ provider, model, updated: Date.now() })
      .where(eq(sessions.id, sessionId));
  }

  /**
   * Update message parts (used during streaming)
   * Replaces all parts for a message atomically
   */
  async updateMessageParts(messageId: string, parts: MessagePart[]): Promise<void> {
    await retryOnBusy(async () => {
      await this.db.transaction(async (tx) => {
        // Delete existing parts
        await tx.delete(messageParts).where(eq(messageParts.messageId, messageId));

        // Insert new parts
        for (let i = 0; i < parts.length; i++) {
          await tx.insert(messageParts).values({
            id: randomUUID(),
            messageId,
            ordering: i,
            type: parts[i].type,
            content: JSON.stringify(parts[i]),
          });
        }
      });
    });
  }

  /**
   * Update message status (used when streaming completes/aborts)
   */
  async updateMessageStatus(
    messageId: string,
    status: 'active' | 'completed' | 'error' | 'abort',
    finishReason?: string
  ): Promise<void> {
    await retryOnBusy(async () => {
      // Only update finishReason if explicitly provided
      const updates: {
        status: 'active' | 'completed' | 'error' | 'abort';
        finishReason?: string | null;
      } = { status };

      if (finishReason !== undefined) {
        updates.finishReason = finishReason || null;
      }

      await this.db
        .update(messages)
        .set(updates)
        .where(eq(messages.id, messageId));
    });
  }

  /**
   * Update message usage (used when streaming completes)
   * Inserts or replaces usage data for a message
   */
  async updateMessageUsage(messageId: string, usage: TokenUsage): Promise<void> {
    await retryOnBusy(async () => {
      // Check if usage already exists
      const [existing] = await this.db
        .select()
        .from(messageUsage)
        .where(eq(messageUsage.messageId, messageId))
        .limit(1);

      if (existing) {
        // Update existing usage
        await this.db
          .update(messageUsage)
          .set({
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          })
          .where(eq(messageUsage.messageId, messageId));
      } else {
        // Insert new usage
        await this.db.insert(messageUsage).values({
          messageId,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        });
      }
    });
  }

  /**
   * Delete session (CASCADE will delete all related data)
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  /**
   * Search sessions by title
   * HUGE performance improvement: Uses index, no need to load all sessions
   */
  async searchSessionsByTitle(query: string, limit = 20): Promise<SessionType[]> {
    const sessionRecords = await this.db
      .select()
      .from(sessions)
      .where(like(sessions.title, `%${query}%`))
      .orderBy(desc(sessions.updated))
      .limit(limit);

    const fullSessions = await Promise.all(
      sessionRecords.map((session) => this.getSessionById(session.id))
    );

    return fullSessions.filter((s): s is SessionType => s !== null);
  }

  /**
   * Get session count
   * Efficient: No need to load sessions into memory
   */
  async getSessionCount(): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(sessions);

    return count;
  }

  /**
   * Get message count for session
   * Efficient: No need to load messages
   */
  async getMessageCount(sessionId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.sessionId, sessionId));

    return count;
  }

  /**
   * Get most recently updated session (for headless mode continuation)
   * Returns the last active session
   */
  async getLastSession(): Promise<SessionType | null> {
    // Get most recent session by updated timestamp
    const [lastSession] = await this.db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.updated))
      .limit(1);

    if (!lastSession) {
      return null;
    }

    // Load full session data
    return this.getSessionById(lastSession.id);
  }

  /**
   * Update todos for session
   */
  async updateTodos(sessionId: string, newTodos: TodoType[], nextTodoId: number): Promise<void> {
    await retryOnBusy(async () => {
      await this.db.transaction(async (tx) => {
        // Delete existing todos
        await tx.delete(todos).where(eq(todos.sessionId, sessionId));

        // Insert new todos
        for (const todo of newTodos) {
          await tx.insert(todos).values({
            id: todo.id,
            sessionId,
            content: todo.content,
            activeForm: todo.activeForm,
            status: todo.status,
            ordering: todo.ordering,
          });
        }

        // Update nextTodoId and timestamp
        await tx
          .update(sessions)
          .set({ nextTodoId, updated: Date.now() })
          .where(eq(sessions.id, sessionId));
      });
    });
  }
}
