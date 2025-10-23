/**
 * Drizzle ORM schema for Sylphx Flow
 * Type-safe database schema with migrations support
 */

import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core';

// Memory table for persistent storage
export const memory = sqliteTable(
  'memory',
  {
    key: text('key').notNull(),
    namespace: text('namespace').notNull().default('default'),
    value: text('value').notNull(),
    timestamp: integer('timestamp').notNull(),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.key, table.namespace] }),
    namespaceIdx: index('idx_memory_namespace').on(table.namespace),
    timestampIdx: index('idx_memory_timestamp').on(table.timestamp),
    keyIdx: index('idx_memory_key').on(table.key),
  })
);

// Codebase files table
export const codebaseFiles = sqliteTable(
  'codebase_files',
  {
    path: text('path').primaryKey(),
    mtime: integer('mtime').notNull(),
    hash: text('hash').notNull(),
    content: text('content'), // Optional full content
    language: text('language'), // Detected programming language
    size: integer('size'), // File size in bytes
    indexedAt: text('indexed_at').notNull(),
  },
  (table) => ({
    mtimeIdx: index('idx_codebase_files_mtime').on(table.mtime),
    hashIdx: index('idx_codebase_files_hash').on(table.hash),
  })
);

// TF-IDF terms table
export const tfidfTerms = sqliteTable(
  'tfidf_terms',
  {
    filePath: text('file_path')
      .notNull()
      .references(() => codebaseFiles.path, { onDelete: 'cascade' }),
    term: text('term').notNull(),
    frequency: real('frequency').notNull(),
  },
  (table) => ({
    termIdx: index('idx_tfidf_terms_term').on(table.term),
    fileIdx: index('idx_tfidf_terms_file').on(table.filePath),
  })
);

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

// Export types for TypeScript
export type Memory = typeof memory.$inferSelect;
export type NewMemory = typeof memory.$inferInsert;

export type CodebaseFile = typeof codebaseFiles.$inferSelect;
export type NewCodebaseFile = typeof codebaseFiles.$inferInsert;

export type TfidfTerm = typeof tfidfTerms.$inferSelect;
export type NewTfidfTerm = typeof tfidfTerms.$inferInsert;

export type TfidfDocument = typeof tfidfDocuments.$inferSelect;
export type NewTfidfDocument = typeof tfidfDocuments.$inferInsert;

export type TfidfIdf = typeof tfidfIdf.$inferSelect;
export type NewTfidfIdf = typeof tfidfIdf.$inferInsert;

export type CodebaseMetadata = typeof codebaseMetadata.$inferSelect;
export type NewCodebaseMetadata = typeof codebaseMetadata.$inferInsert;
