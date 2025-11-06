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
import { randomUUID } from 'node:crypto';
import { sessions, messages, messageParts, messageAttachments, messageUsage, todos, messageTodoSnapshots, } from './schema.js';
/**
 * Retry helper for handling SQLITE_BUSY errors
 * Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms
 */
async function retryOnBusy(operation, maxRetries = 5) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
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
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Create a new session
     */
    async createSession(provider, model, agentId = 'coder', enabledRuleIds = []) {
        const now = Date.now();
        const sessionId = `session-${now}`;
        const newSession = {
            id: sessionId,
            provider,
            model,
            agentId,
            enabledRuleIds,
            nextTodoId: 1,
            created: now,
            updated: now,
        };
        await this.db.insert(sessions).values(newSession);
        return {
            id: sessionId,
            provider,
            model,
            agentId,
            enabledRuleIds,
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
    async createSessionFromData(sessionData) {
        await retryOnBusy(async () => {
            const newSession = {
                id: sessionData.id,
                title: sessionData.title || null,
                provider: sessionData.provider,
                model: sessionData.model,
                agentId: sessionData.agentId || 'coder',
                enabledRuleIds: sessionData.enabledRuleIds || [],
                nextTodoId: sessionData.nextTodoId,
                created: sessionData.created,
                updated: sessionData.updated,
            };
            await this.db.insert(sessions).values(newSession);
        });
    }
    /**
     * Get recent sessions metadata ONLY (cursor-based pagination)
     * DATA ON DEMAND: Returns only id, title, provider, model, created, updated
     * NO messages, NO todos - client fetches those separately when needed
     *
     * CURSOR-BASED PAGINATION: More efficient than offset for large datasets
     * - Cursor = updated timestamp of last item
     * - Works even with concurrent updates
     */
    async getRecentSessionsMetadata(limit = 20, cursor) {
        // Build query with cursor
        const query = this.db
            .select()
            .from(sessions)
            .orderBy(desc(sessions.updated))
            .limit(limit + 1); // Fetch one extra to determine if there's a next page
        if (cursor) {
            query.where(sql `${sessions.updated} < ${cursor}`);
        }
        const sessionRecords = await query;
        // Check if there are more results
        const hasMore = sessionRecords.length > limit;
        const sessionsToReturn = hasMore ? sessionRecords.slice(0, limit) : sessionRecords;
        const nextCursor = hasMore ? sessionsToReturn[sessionsToReturn.length - 1].updated : null;
        // Get message counts for all sessions in one query (OPTIMIZED!)
        const sessionIds = sessionsToReturn.map(s => s.id);
        const messageCounts = await this.db
            .select({
            sessionId: messages.sessionId,
            count: sql `count(*)`,
        })
            .from(messages)
            .where(inArray(messages.sessionId, sessionIds))
            .groupBy(messages.sessionId);
        // Create lookup map
        const countMap = new Map(messageCounts.map(m => [m.sessionId, m.count]));
        return {
            sessions: sessionsToReturn.map(s => ({
                id: s.id,
                title: s.title || undefined,
                provider: s.provider,
                model: s.model,
                agentId: s.agentId,
                created: s.created,
                updated: s.updated,
                messageCount: countMap.get(s.id) || 0,
            })),
            nextCursor,
        };
    }
    /**
     * Get recent sessions with full data (for backward compatibility)
     * DEPRECATED: Use getRecentSessionsMetadata + getSessionById instead
     */
    async getRecentSessions(limit = 20, offset = 0) {
        // Get session metadata only (no messages yet - lazy loading!)
        const sessionRecords = await this.db
            .select()
            .from(sessions)
            .orderBy(desc(sessions.updated))
            .limit(limit)
            .offset(offset);
        // For each session, load messages, todos, etc.
        const fullSessions = await Promise.all(sessionRecords.map((session) => this.getSessionById(session.id)));
        return fullSessions.filter((s) => s !== null);
    }
    /**
     * Get session by ID with all related data
     */
    async getSessionById(sessionId) {
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
        const result = {
            id: session.id,
            title: session.title || undefined,
            provider: session.provider,
            model: session.model,
            agentId: session.agentId,
            enabledRuleIds: session.enabledRuleIds || [],
            messages: sessionMessages,
            todos: sessionTodos,
            nextTodoId: session.nextTodoId,
            created: session.created,
            updated: session.updated,
        };
        return result;
    }
    /**
     * Get messages for a session with cursor-based pagination
     * DATA ON DEMAND: Fetch only needed messages, not entire history
     * CURSOR-BASED PAGINATION: Use message timestamp as cursor
     */
    async getMessagesBySession(sessionId, limit = 50, cursor) {
        // Get messages with pagination
        const queryBuilder = this.db
            .select()
            .from(messages)
            .where(eq(messages.sessionId, sessionId))
            .orderBy(messages.ordering)
            .limit(limit + 1);
        if (cursor) {
            queryBuilder.where(and(eq(messages.sessionId, sessionId), sql `${messages.timestamp} > ${cursor}`));
        }
        const messageRecords = await queryBuilder;
        const hasMore = messageRecords.length > limit;
        const messagesToReturn = hasMore ? messageRecords.slice(0, limit) : messageRecords;
        const nextCursor = hasMore ? messagesToReturn[messagesToReturn.length - 1].timestamp : null;
        if (messagesToReturn.length === 0) {
            return { messages: [], nextCursor: null };
        }
        // Batch fetch all related data
        const messageIds = messagesToReturn.map((m) => m.id);
        const [allParts, allAttachments, allUsage, allSnapshots] = await Promise.all([
            this.db
                .select()
                .from(messageParts)
                .where(inArray(messageParts.messageId, messageIds))
                .orderBy(messageParts.ordering),
            this.db
                .select()
                .from(messageAttachments)
                .where(inArray(messageAttachments.messageId, messageIds)),
            this.db
                .select()
                .from(messageUsage)
                .where(inArray(messageUsage.messageId, messageIds)),
            this.db
                .select()
                .from(messageTodoSnapshots)
                .where(inArray(messageTodoSnapshots.messageId, messageIds))
                .orderBy(messageTodoSnapshots.ordering),
        ]);
        // Group by message ID
        const partsByMessage = new Map();
        const attachmentsByMessage = new Map();
        const usageByMessage = new Map();
        const snapshotsByMessage = new Map();
        for (const part of allParts) {
            if (!partsByMessage.has(part.messageId)) {
                partsByMessage.set(part.messageId, []);
            }
            partsByMessage.get(part.messageId).push(part);
        }
        for (const attachment of allAttachments) {
            if (!attachmentsByMessage.has(attachment.messageId)) {
                attachmentsByMessage.set(attachment.messageId, []);
            }
            attachmentsByMessage.get(attachment.messageId).push(attachment);
        }
        for (const usage of allUsage) {
            usageByMessage.set(usage.messageId, usage);
        }
        for (const snapshot of allSnapshots) {
            if (!snapshotsByMessage.has(snapshot.messageId)) {
                snapshotsByMessage.set(snapshot.messageId, []);
            }
            snapshotsByMessage.get(snapshot.messageId).push(snapshot);
        }
        // Assemble messages
        const fullMessages = messagesToReturn.map((msg) => {
            const parts = partsByMessage.get(msg.id) || [];
            const attachments = attachmentsByMessage.get(msg.id) || [];
            const usage = usageByMessage.get(msg.id);
            const todoSnap = snapshotsByMessage.get(msg.id) || [];
            const sessionMessage = {
                role: msg.role,
                content: parts.map((p) => JSON.parse(p.content)),
                timestamp: msg.timestamp,
                status: msg.status || 'completed',
            };
            if (msg.metadata) {
                sessionMessage.metadata = JSON.parse(msg.metadata);
            }
            if (attachments.length > 0) {
                const validAttachments = attachments.filter((a) => a && typeof a === 'object' && a.path && a.relativePath);
                if (validAttachments.length > 0) {
                    sessionMessage.attachments = validAttachments.map((a) => ({
                        path: a.path,
                        relativePath: a.relativePath,
                        size: a.size || undefined,
                    }));
                }
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
                    status: t.status,
                    ordering: t.ordering,
                }));
            }
            return sessionMessage;
        });
        return { messages: fullMessages, nextCursor };
    }
    /**
     * Get messages for a session (all messages)
     * Assembles message parts, attachments, usage into SessionMessage format
     * OPTIMIZED: Batch queries instead of N+1 queries
     */
    async getSessionMessages(sessionId) {
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
        const partsByMessage = new Map();
        const attachmentsByMessage = new Map();
        const usageByMessage = new Map();
        const snapshotsByMessage = new Map();
        for (const part of allParts) {
            if (!partsByMessage.has(part.messageId)) {
                partsByMessage.set(part.messageId, []);
            }
            partsByMessage.get(part.messageId).push(part);
        }
        for (const attachment of allAttachments) {
            if (!attachmentsByMessage.has(attachment.messageId)) {
                attachmentsByMessage.set(attachment.messageId, []);
            }
            attachmentsByMessage.get(attachment.messageId).push(attachment);
        }
        for (const usage of allUsage) {
            usageByMessage.set(usage.messageId, usage);
        }
        for (const snapshot of allSnapshots) {
            if (!snapshotsByMessage.has(snapshot.messageId)) {
                snapshotsByMessage.set(snapshot.messageId, []);
            }
            snapshotsByMessage.get(snapshot.messageId).push(snapshot);
        }
        // Assemble messages using grouped data
        const fullMessages = messageRecords.map((msg) => {
            const parts = partsByMessage.get(msg.id) || [];
            const attachments = attachmentsByMessage.get(msg.id) || [];
            const usage = usageByMessage.get(msg.id);
            const todoSnap = snapshotsByMessage.get(msg.id) || [];
            const sessionMessage = {
                role: msg.role,
                content: parts.map((p) => JSON.parse(p.content)),
                timestamp: msg.timestamp,
                status: msg.status || 'completed',
            };
            if (msg.metadata) {
                sessionMessage.metadata = JSON.parse(msg.metadata);
            }
            // Self-healing: Normalize attachments on read
            // Old/corrupted data might have invalid entries - filter them out
            if (attachments.length > 0) {
                const validAttachments = attachments.filter((a) => a && typeof a === 'object' && a.path && a.relativePath);
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
                    status: t.status,
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
    async getSessionTodos(sessionId) {
        const todoRecords = await this.db
            .select()
            .from(todos)
            .where(eq(todos.sessionId, sessionId))
            .orderBy(todos.ordering);
        return todoRecords.map((t) => ({
            id: t.id,
            content: t.content,
            activeForm: t.activeForm,
            status: t.status,
            ordering: t.ordering,
        }));
    }
    /**
     * Add message to session
     * Atomically inserts message with all parts, attachments, usage
     */
    async addMessage(sessionId, role, content, attachments, usage, finishReason, metadata, todoSnapshot, status) {
        return await retryOnBusy(async () => {
            const messageId = randomUUID();
            const now = Date.now();
            // Get current message count for ordering
            const [{ count }] = await this.db
                .select({ count: sql `count(*)` })
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
    async updateSessionTitle(sessionId, title) {
        await this.db
            .update(sessions)
            .set({ title, updated: Date.now() })
            .where(eq(sessions.id, sessionId));
    }
    /**
     * Update session model
     */
    async updateSessionModel(sessionId, model) {
        await this.db
            .update(sessions)
            .set({ model, updated: Date.now() })
            .where(eq(sessions.id, sessionId));
    }
    /**
     * Update session provider and model
     */
    async updateSessionProvider(sessionId, provider, model) {
        await this.db
            .update(sessions)
            .set({ provider, model, updated: Date.now() })
            .where(eq(sessions.id, sessionId));
    }
    /**
     * Update session (partial update)
     */
    async updateSession(sessionId, updates) {
        await this.db
            .update(sessions)
            .set({ ...updates, updated: Date.now() })
            .where(eq(sessions.id, sessionId));
    }
    /**
     * Update message parts (used during streaming)
     * Replaces all parts for a message atomically
     */
    async updateMessageParts(messageId, parts) {
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
    async updateMessageStatus(messageId, status, finishReason) {
        await retryOnBusy(async () => {
            // Only update finishReason if explicitly provided
            const updates = { status };
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
    async updateMessageUsage(messageId, usage) {
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
            }
            else {
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
    async deleteSession(sessionId) {
        await this.db.delete(sessions).where(eq(sessions.id, sessionId));
    }
    /**
     * Search sessions by title (metadata only, cursor-based)
     * DATA ON DEMAND: Returns only metadata, no messages
     * CURSOR-BASED PAGINATION: Efficient for large result sets
     */
    async searchSessionsMetadata(query, limit = 20, cursor) {
        const queryBuilder = this.db
            .select()
            .from(sessions)
            .where(like(sessions.title, `%${query}%`))
            .orderBy(desc(sessions.updated))
            .limit(limit + 1);
        if (cursor) {
            queryBuilder.where(and(like(sessions.title, `%${query}%`), sql `${sessions.updated} < ${cursor}`));
        }
        const sessionRecords = await queryBuilder;
        const hasMore = sessionRecords.length > limit;
        const sessionsToReturn = hasMore ? sessionRecords.slice(0, limit) : sessionRecords;
        const nextCursor = hasMore ? sessionsToReturn[sessionsToReturn.length - 1].updated : null;
        // Get message counts
        const sessionIds = sessionsToReturn.map(s => s.id);
        const messageCounts = sessionIds.length > 0 ? await this.db
            .select({
            sessionId: messages.sessionId,
            count: sql `count(*)`,
        })
            .from(messages)
            .where(inArray(messages.sessionId, sessionIds))
            .groupBy(messages.sessionId) : [];
        const countMap = new Map(messageCounts.map(m => [m.sessionId, m.count]));
        return {
            sessions: sessionsToReturn.map(s => ({
                id: s.id,
                title: s.title || undefined,
                provider: s.provider,
                model: s.model,
                agentId: s.agentId,
                created: s.created,
                updated: s.updated,
                messageCount: countMap.get(s.id) || 0,
            })),
            nextCursor,
        };
    }
    /**
     * Search sessions by title (full data)
     * DEPRECATED: Use searchSessionsMetadata + getSessionById instead
     */
    async searchSessionsByTitle(query, limit = 20) {
        const sessionRecords = await this.db
            .select()
            .from(sessions)
            .where(like(sessions.title, `%${query}%`))
            .orderBy(desc(sessions.updated))
            .limit(limit);
        const fullSessions = await Promise.all(sessionRecords.map((session) => this.getSessionById(session.id)));
        return fullSessions.filter((s) => s !== null);
    }
    /**
     * Get session count
     * Efficient: No need to load sessions into memory
     */
    async getSessionCount() {
        const [{ count }] = await this.db
            .select({ count: sql `count(*)` })
            .from(sessions);
        return count;
    }
    /**
     * Get message count for session
     * Efficient: No need to load messages
     */
    async getMessageCount(sessionId) {
        const [{ count }] = await this.db
            .select({ count: sql `count(*)` })
            .from(messages)
            .where(eq(messages.sessionId, sessionId));
        return count;
    }
    /**
     * Get most recently updated session (for headless mode continuation)
     * Returns the last active session
     */
    async getLastSession() {
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
    async updateTodos(sessionId, newTodos, nextTodoId) {
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
    /**
     * Get recent user messages for command history (cursor-based pagination)
     * DATA ON DEMAND: Returns only needed messages with pagination
     * CURSOR-BASED PAGINATION: Efficient for large datasets
     */
    async getRecentUserMessages(limit = 100, cursor) {
        return retryOnBusy(async () => {
            // Query user messages with cursor
            const queryBuilder = this.db
                .select({
                messageId: messages.id,
                timestamp: messages.timestamp,
            })
                .from(messages)
                .where(eq(messages.role, 'user'))
                .orderBy(desc(messages.timestamp))
                .limit(limit + 1);
            if (cursor) {
                queryBuilder.where(and(eq(messages.role, 'user'), sql `${messages.timestamp} < ${cursor}`));
            }
            const userMessages = await queryBuilder;
            const hasMore = userMessages.length > limit;
            const messagesToReturn = hasMore ? userMessages.slice(0, limit) : userMessages;
            const nextCursor = hasMore ? messagesToReturn[messagesToReturn.length - 1].timestamp : null;
            if (messagesToReturn.length === 0) {
                return { messages: [], nextCursor: null };
            }
            // Get text parts for these messages
            const messageIds = messagesToReturn.map(m => m.messageId);
            const parts = await this.db
                .select()
                .from(messageParts)
                .where(and(inArray(messageParts.messageId, messageIds), eq(messageParts.type, 'text')))
                .orderBy(messageParts.ordering);
            // Group parts by message and extract text content
            const messageTexts = new Map();
            for (const part of parts) {
                const content = JSON.parse(part.content);
                const text = content.content || '';
                if (text.trim()) {
                    if (!messageTexts.has(part.messageId)) {
                        messageTexts.set(part.messageId, []);
                    }
                    messageTexts.get(part.messageId).push(text);
                }
            }
            // Build result in timestamp order (most recent first)
            const result = [];
            for (const msg of messagesToReturn) {
                const texts = messageTexts.get(msg.messageId);
                if (texts && texts.length > 0) {
                    const fullText = texts.join(' ').trim();
                    if (fullText) {
                        result.push(fullText);
                    }
                }
            }
            return { messages: result, nextCursor };
        });
    }
}
//# sourceMappingURL=session-repository.js.map