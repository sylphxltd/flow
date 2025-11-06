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
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { Session as SessionType, SessionMessage, MessagePart, FileAttachment, TokenUsage, MessageMetadata } from '../types/session.types.js';
import type { Todo as TodoType } from '../types/todo.types.js';
import type { ProviderId } from '../config/ai-config.js';
export declare class SessionRepository {
    private db;
    constructor(db: LibSQLDatabase);
    /**
     * Create a new session
     */
    createSession(provider: ProviderId, model: string, agentId?: string, enabledRuleIds?: string[]): Promise<SessionType>;
    /**
     * Create session with specific ID and timestamps (for migration)
     */
    createSessionFromData(sessionData: {
        id: string;
        provider: ProviderId;
        model: string;
        agentId?: string;
        title?: string;
        enabledRuleIds?: string[];
        nextTodoId: number;
        created: number;
        updated: number;
    }): Promise<void>;
    /**
     * Get recent sessions metadata ONLY (cursor-based pagination)
     * DATA ON DEMAND: Returns only id, title, provider, model, created, updated
     * NO messages, NO todos - client fetches those separately when needed
     *
     * CURSOR-BASED PAGINATION: More efficient than offset for large datasets
     * - Cursor = updated timestamp of last item
     * - Works even with concurrent updates
     */
    getRecentSessionsMetadata(limit?: number, cursor?: number): Promise<{
        sessions: Array<{
            id: string;
            title?: string;
            provider: ProviderId;
            model: string;
            agentId: string;
            created: number;
            updated: number;
            messageCount: number;
        }>;
        nextCursor: number | null;
    }>;
    /**
     * Get recent sessions with full data (for backward compatibility)
     * DEPRECATED: Use getRecentSessionsMetadata + getSessionById instead
     */
    getRecentSessions(limit?: number, offset?: number): Promise<SessionType[]>;
    /**
     * Get session by ID with all related data
     */
    getSessionById(sessionId: string): Promise<SessionType | null>;
    /**
     * Get messages for a session with cursor-based pagination
     * DATA ON DEMAND: Fetch only needed messages, not entire history
     * CURSOR-BASED PAGINATION: Use message timestamp as cursor
     */
    getMessagesBySession(sessionId: string, limit?: number, cursor?: number): Promise<{
        messages: SessionMessage[];
        nextCursor: number | null;
    }>;
    /**
     * Get messages for a session (all messages)
     * Assembles message parts, attachments, usage into SessionMessage format
     * OPTIMIZED: Batch queries instead of N+1 queries
     */
    private getSessionMessages;
    /**
     * Get todos for a session
     */
    private getSessionTodos;
    /**
     * Add message to session
     * Atomically inserts message with all parts, attachments, usage
     */
    addMessage(sessionId: string, role: 'user' | 'assistant', content: MessagePart[], attachments?: FileAttachment[], usage?: TokenUsage, finishReason?: string, metadata?: MessageMetadata, todoSnapshot?: TodoType[], status?: 'active' | 'completed' | 'error' | 'abort'): Promise<string>;
    /**
     * Update session title
     */
    updateSessionTitle(sessionId: string, title: string): Promise<void>;
    /**
     * Update session model
     */
    updateSessionModel(sessionId: string, model: string): Promise<void>;
    /**
     * Update session provider and model
     */
    updateSessionProvider(sessionId: string, provider: ProviderId, model: string): Promise<void>;
    /**
     * Update session (partial update)
     */
    updateSession(sessionId: string, updates: {
        title?: string;
        provider?: ProviderId;
        model?: string;
        agentId?: string;
        enabledRuleIds?: string[];
    }): Promise<void>;
    /**
     * Update message parts (used during streaming)
     * Replaces all parts for a message atomically
     */
    updateMessageParts(messageId: string, parts: MessagePart[]): Promise<void>;
    /**
     * Update message status (used when streaming completes/aborts)
     */
    updateMessageStatus(messageId: string, status: 'active' | 'completed' | 'error' | 'abort', finishReason?: string): Promise<void>;
    /**
     * Update message usage (used when streaming completes)
     * Inserts or replaces usage data for a message
     */
    updateMessageUsage(messageId: string, usage: TokenUsage): Promise<void>;
    /**
     * Delete session (CASCADE will delete all related data)
     */
    deleteSession(sessionId: string): Promise<void>;
    /**
     * Search sessions by title (metadata only, cursor-based)
     * DATA ON DEMAND: Returns only metadata, no messages
     * CURSOR-BASED PAGINATION: Efficient for large result sets
     */
    searchSessionsMetadata(query: string, limit?: number, cursor?: number): Promise<{
        sessions: Array<{
            id: string;
            title?: string;
            provider: ProviderId;
            model: string;
            agentId: string;
            created: number;
            updated: number;
            messageCount: number;
        }>;
        nextCursor: number | null;
    }>;
    /**
     * Search sessions by title (full data)
     * DEPRECATED: Use searchSessionsMetadata + getSessionById instead
     */
    searchSessionsByTitle(query: string, limit?: number): Promise<SessionType[]>;
    /**
     * Get session count
     * Efficient: No need to load sessions into memory
     */
    getSessionCount(): Promise<number>;
    /**
     * Get message count for session
     * Efficient: No need to load messages
     */
    getMessageCount(sessionId: string): Promise<number>;
    /**
     * Get most recently updated session (for headless mode continuation)
     * Returns the last active session
     */
    getLastSession(): Promise<SessionType | null>;
    /**
     * Update todos for session
     */
    updateTodos(sessionId: string, newTodos: TodoType[], nextTodoId: number): Promise<void>;
    /**
     * Get recent user messages for command history (cursor-based pagination)
     * DATA ON DEMAND: Returns only needed messages with pagination
     * CURSOR-BASED PAGINATION: Efficient for large datasets
     */
    getRecentUserMessages(limit?: number, cursor?: number): Promise<{
        messages: string[];
        nextCursor: number | null;
    }>;
}
//# sourceMappingURL=session-repository.d.ts.map