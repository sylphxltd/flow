/**
 * Memory database schema - 永久記憶數據 (應該上 Git)
 * 包含用戶記憶、協調數據等需要持久化的信息
 */

import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';

// Memory table for persistent storage (永久記憶)
export const memory = sqliteTable(
  'memory_table',
  {
    key: text('key').notNull(),
    namespace: text('namespace').notNull().default('default'),
    value: text('value').notNull(),
    timestamp: integer('timestamp').notNull(),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.namespace] }),
    index('idx_memory_namespace').on(table.namespace),
    index('idx_memory_timestamp').on(table.timestamp),
    index('idx_memory_key').on(table.key),
  ]
);

// Types for memory database
export type Memory = typeof memory.$inferSelect;
export type NewMemory = typeof memory.$inferInsert;
