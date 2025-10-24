/**
 * Cache database schema - 臨時索引數據 (不應該上 Git)
 * 包含代碼庫索引、搜索詞彙等可以重新生成的數據
 */

import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core';

// Codebase files table (代碼庫檔案索引)
export const codebaseFiles = sqliteTable(
  'codebase_files_table',
  {
    path: text('path').primaryKey(),
    mtime: integer('mtime').notNull(),
    hash: text('hash').notNull(),
    content: text('content'), // Optional full content
    language: text('language'), // Detected programming language
    size: integer('size'), // File size in bytes
    indexedAt: text('indexed_at').notNull(),
  },
  (table) => [
    index('idx_codebase_files_mtime').on(table.mtime),
    index('idx_codebase_files_hash').on(table.hash),
  ]
);

// Codebase metadata table (代碼庫元數據)
export const codebaseMetadata = sqliteTable('codebase_metadata_table', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// TF-IDF terms table (搜索詞彙)
export const tfidfTerms = sqliteTable(
  'tfidf_terms_table',
  {
    filePath: text('file_path')
      .notNull()
      .references(() => codebaseFiles.path, { onDelete: 'cascade' }),
    term: text('term').notNull(),
    frequency: real('frequency').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.filePath, table.term] }),
    index('idx_tfidf_terms_term').on(table.term),
    index('idx_tfidf_terms_file').on(table.filePath),
  ]
);

// TF-IDF documents table (文檔向量)
export const tfidfDocuments = sqliteTable('tfidf_documents_table', {
  filePath: text('file_path')
    .primaryKey()
    .references(() => codebaseFiles.path, { onDelete: 'cascade' }),
  magnitude: real('magnitude').notNull(),
  termCount: integer('term_count').notNull(),
  rawTerms: text('raw_terms').notNull(), // JSON string
});

// TF-IDF IDF values table (IDF 計算結果)
export const tfidfIdf = sqliteTable('tfidf_idf_table', {
  term: text('term').primaryKey(),
  idfValue: real('idf_value').notNull(),
});

// Types for cache database
export type CodebaseFile = typeof codebaseFiles.$inferSelect;
export type NewCodebaseFile = typeof codebaseFiles.$inferInsert;
export type CodebaseMetadata = typeof codebaseMetadata.$inferSelect;
export type NewCodebaseMetadata = typeof codebaseMetadata.$inferInsert;
export type TfidfTerm = typeof tfidfTerms.$inferSelect;
export type NewTfidfTerm = typeof tfidfTerms.$inferInsert;
export type TfidfDocument = typeof tfidfDocuments.$inferSelect;
export type NewTfidfDocument = typeof tfidfDocuments.$inferInsert;
export type TfidfIdf = typeof tfidfIdf.$inferSelect;
export type NewTfidfIdf = typeof tfidfIdf.$inferInsert;
