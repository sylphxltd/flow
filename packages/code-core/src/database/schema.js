/**
 * Drizzle ORM schema for Sylphx Flow
 * Type-safe database schema with migrations support
 */
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// Memory table for persistent storage
export const memory = sqliteTable('memory', {
    key: text('key').notNull(),
    namespace: text('namespace').notNull().default('default'),
    value: text('value').notNull(),
    timestamp: integer('timestamp').notNull(),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.key, table.namespace] }),
    namespaceIdx: index('idx_memory_namespace').on(table.namespace),
    timestampIdx: index('idx_memory_timestamp').on(table.timestamp),
    keyIdx: index('idx_memory_key').on(table.key),
}));
// Codebase files table
export const codebaseFiles = sqliteTable('codebase_files', {
    path: text('path').primaryKey(),
    mtime: integer('mtime').notNull(),
    hash: text('hash').notNull(),
    content: text('content'), // Optional full content
    language: text('language'), // Detected programming language
    size: integer('size'), // File size in bytes
    indexedAt: text('indexed_at').notNull(),
}, (table) => ({
    mtimeIdx: index('idx_codebase_files_mtime').on(table.mtime),
    hashIdx: index('idx_codebase_files_hash').on(table.hash),
}));
// TF-IDF terms table
export const tfidfTerms = sqliteTable('tfidf_terms', {
    filePath: text('file_path')
        .notNull()
        .references(() => codebaseFiles.path, { onDelete: 'cascade' }),
    term: text('term').notNull(),
    frequency: real('frequency').notNull(),
}, (table) => ({
    termIdx: index('idx_tfidf_terms_term').on(table.term),
    fileIdx: index('idx_tfidf_terms_file').on(table.filePath),
}));
// TF-IDF documents table (document vectors)
export const tfidfDocuments = sqliteTable('tfidf_documents', {
    filePath: text('file_path')
        .primaryKey()
        .references(() => codebaseFiles.path, { onDelete: 'cascade' }),
    magnitude: real('magnitude').notNull(),
    termCount: integer('term_count').notNull(),
    rawTerms: text('raw_terms').notNull(), // JSON string of Record<string, number>
});
// IDF values table
export const tfidfIdf = sqliteTable('tfidf_idf', {
    term: text('term').primaryKey(),
    idfValue: real('idf_value').notNull(),
});
// Codebase metadata table
export const codebaseMetadata = sqliteTable('codebase_metadata', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
});
// ============================================
// Session Management Tables
// ============================================
/**
 * Sessions table - Main chat sessions
 * Stores session metadata and configuration
 */
export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(),
    title: text('title'),
    provider: text('provider').notNull(), // 'anthropic' | 'openai' | 'google' | 'openrouter'
    model: text('model').notNull(),
    agentId: text('agent_id').notNull().default('coder'), // Agent configuration per session
    enabledRuleIds: text('enabled_rule_ids', { mode: 'json' }).notNull().default('[]').$type(), // Enabled rules for this session
    nextTodoId: integer('next_todo_id').notNull().default(1),
    // Note: Streaming state moved to messages table (message-level, not session-level)
    // Each message can be in streaming state with isStreaming flag
    created: integer('created').notNull(), // Unix timestamp (ms)
    updated: integer('updated').notNull(), // Unix timestamp (ms)
}, (table) => ({
    updatedIdx: index('idx_sessions_updated').on(table.updated),
    createdIdx: index('idx_sessions_created').on(table.created),
    providerIdx: index('idx_sessions_provider').on(table.provider),
    titleIdx: index('idx_sessions_title').on(table.title),
}));
/**
 * Messages table - Chat messages in sessions
 * Stores message metadata and role
 */
export const messages = sqliteTable('messages', {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
        .notNull()
        .references(() => sessions.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'user' | 'assistant'
    timestamp: integer('timestamp').notNull(), // Unix timestamp (ms)
    ordering: integer('ordering').notNull(), // For display order
    finishReason: text('finish_reason'), // 'stop' | 'length' | 'tool-calls' | 'error'
    // Message status - unified state for all messages
    status: text('status').notNull().default('completed'), // 'active' | 'completed' | 'error' | 'abort'
    // Metadata stored as JSON: { cpu?: string, memory?: string }
    metadata: text('metadata'), // JSON string
}, (table) => ({
    sessionIdx: index('idx_messages_session').on(table.sessionId),
    orderingIdx: index('idx_messages_ordering').on(table.sessionId, table.ordering),
    timestampIdx: index('idx_messages_timestamp').on(table.timestamp),
    statusIdx: index('idx_messages_status').on(table.status),
}));
/**
 * Message parts table - Content parts of messages
 * Stores text, reasoning, tool calls, errors
 * Content structure varies by type, stored as JSON
 *
 * ALL parts have unified status field: 'active' | 'completed' | 'error' | 'abort'
 */
export const messageParts = sqliteTable('message_parts', {
    id: text('id').primaryKey(),
    messageId: text('message_id')
        .notNull()
        .references(() => messages.id, { onDelete: 'cascade' }),
    ordering: integer('ordering').notNull(), // Order within message
    type: text('type').notNull(), // 'text' | 'reasoning' | 'tool' | 'error'
    // Content structure (JSON) - ALL parts include status field:
    // - text: { type: 'text', content: string, status: 'active' | 'completed' | ... }
    // - reasoning: { type: 'reasoning', content: string, status: ..., duration?: number }
    // - tool: { type: 'tool', name: string, status: ..., duration?: number, args?: any, result?: any, error?: string }
    // - error: { type: 'error', error: string, status: 'completed' }
    content: text('content').notNull(), // JSON string
}, (table) => ({
    messageIdx: index('idx_message_parts_message').on(table.messageId),
    orderingIdx: index('idx_message_parts_ordering').on(table.messageId, table.ordering),
    typeIdx: index('idx_message_parts_type').on(table.type),
}));
/**
 * Message attachments table - File attachments to messages
 */
export const messageAttachments = sqliteTable('message_attachments', {
    id: text('id').primaryKey(),
    messageId: text('message_id')
        .notNull()
        .references(() => messages.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    relativePath: text('relative_path').notNull(),
    size: integer('size'),
}, (table) => ({
    messageIdx: index('idx_message_attachments_message').on(table.messageId),
    pathIdx: index('idx_message_attachments_path').on(table.path),
}));
/**
 * Message usage table - Token usage for messages
 * 1:1 relationship with messages (only assistant messages have usage)
 */
export const messageUsage = sqliteTable('message_usage', {
    messageId: text('message_id')
        .primaryKey()
        .references(() => messages.id, { onDelete: 'cascade' }),
    promptTokens: integer('prompt_tokens').notNull(),
    completionTokens: integer('completion_tokens').notNull(),
    totalTokens: integer('total_tokens').notNull(),
});
/**
 * Todos table - Per-session todo lists
 */
export const todos = sqliteTable('todos', {
    id: integer('id').notNull(), // Per-session ID (not globally unique!)
    sessionId: text('session_id')
        .notNull()
        .references(() => sessions.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    activeForm: text('active_form').notNull(),
    status: text('status').notNull(), // 'pending' | 'in_progress' | 'completed'
    ordering: integer('ordering').notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.sessionId, table.id] }),
    sessionIdx: index('idx_todos_session').on(table.sessionId),
    statusIdx: index('idx_todos_status').on(table.status),
    orderingIdx: index('idx_todos_ordering').on(table.sessionId, table.ordering),
}));
/**
 * Message todo snapshots table - Snapshot of todos at message creation time
 * Enables rewind feature - can restore todo state at any point in conversation
 */
export const messageTodoSnapshots = sqliteTable('message_todo_snapshots', {
    id: text('id').primaryKey(),
    messageId: text('message_id')
        .notNull()
        .references(() => messages.id, { onDelete: 'cascade' }),
    todoId: integer('todo_id').notNull(), // ID from snapshot (not FK!)
    content: text('content').notNull(),
    activeForm: text('active_form').notNull(),
    status: text('status').notNull(),
    ordering: integer('ordering').notNull(),
}, (table) => ({
    messageIdx: index('idx_message_todo_snapshots_message').on(table.messageId),
}));
//# sourceMappingURL=schema.js.map