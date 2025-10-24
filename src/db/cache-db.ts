/**
 * Cache database client - 臨時索引數據庫
 * 負責管理可以重新生成的緩存數據（代碼索引、搜索詞彙等）
 */

import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as path from 'node:path';
import * as schema from './cache-schema.js';
import { BaseDatabaseClient } from './base-database-client.js';
import { DatabaseError } from '../utils/database-errors.js';

export type CacheDatabase = ReturnType<typeof drizzle<typeof schema>>;

export class CacheDatabaseClient extends BaseDatabaseClient<typeof schema> {
  constructor() {
    super('cache', schema);
  }

  /**
   * Initialize cache database schema
   */
  async initialize(): Promise<void> {
    try {
      // Check if tables already exist
      const migrationStatus = await this.getMigrationStatus();

      if (migrationStatus.isMigrated) {
        console.error('[INFO] Cache database tables already exist');
        return;
      }

      // For now, create tables directly since we don't have migration files yet
      await this.createTables();
      console.error('[INFO] Cache database tables created');
    } catch (error) {
      throw new DatabaseError(
        'Failed to initialize cache database',
        'cache.initialize',
        error as Error
      );
    }
  }

  /**
   * Create tables directly (fallback)
   */
  private async createTables(): Promise<void> {
    // Create codebase_files table
    await this.createTable(`
      CREATE TABLE IF NOT EXISTS codebase_files_table (
        path TEXT PRIMARY KEY,
        mtime INTEGER NOT NULL,
        hash TEXT NOT NULL,
        content TEXT,
        language TEXT,
        size INTEGER,
        indexed_at TEXT NOT NULL
      )
    `);

    // Create codebase_metadata table
    await this.createTable(`
      CREATE TABLE IF NOT EXISTS codebase_metadata_table (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Create tfidf_documents table
    await this.createTable(`
      CREATE TABLE IF NOT EXISTS tfidf_documents_table (
        file_path TEXT PRIMARY KEY,
        magnitude REAL NOT NULL,
        term_count INTEGER NOT NULL,
        raw_terms TEXT NOT NULL,
        FOREIGN KEY (file_path) REFERENCES codebase_files_table(path) ON DELETE CASCADE
      )
    `);

    // Create tfidf_idf table
    await this.createTable(`
      CREATE TABLE IF NOT EXISTS tfidf_idf_table (
        term TEXT PRIMARY KEY,
        idf_value REAL NOT NULL
      )
    `);

    // Create tfidf_terms table
    await this.createTable(`
      CREATE TABLE IF NOT EXISTS tfidf_terms_table (
        file_path TEXT NOT NULL,
        term TEXT NOT NULL,
        frequency REAL NOT NULL,
        PRIMARY KEY (file_path, term),
        FOREIGN KEY (file_path) REFERENCES codebase_files_table(path) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await this.createIndex(`
      CREATE INDEX IF NOT EXISTS idx_codebase_files_mtime ON codebase_files_table (mtime)
    `);

    await this.createIndex(`
      CREATE INDEX IF NOT EXISTS idx_codebase_files_hash ON codebase_files_table (hash)
    `);

    await this.createIndex(`
      CREATE INDEX IF NOT EXISTS idx_tfidf_terms_term ON tfidf_terms_table (term)
    `);

    await this.createIndex(`
      CREATE INDEX IF NOT EXISTS idx_tfidf_terms_file ON tfidf_terms_table (file_path)
    `);
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    isMigrated: boolean;
    migrationCount: number;
  }> {
    try {
      const tables = ['codebase_files_table', 'tfidf_terms_table', 'tfidf_documents_table'];
      let existingCount = 0;

      for (const table of tables) {
        if (await this.tableExists(table)) {
          existingCount++;
        }
      }

      return {
        isMigrated: existingCount >= 2, // At least codebase_files and tfidf_terms
        migrationCount: existingCount,
      };
    } catch (error) {
      throw new DatabaseError(
        'Failed to check cache database migration status',
        'cache.getMigrationStatus',
        error as Error
      );
    }
  }

  /**
   * Clear all cache data (useful for rebuilding)
   */
  async clearCache(): Promise<void> {
    try {
      await this.client.execute('DELETE FROM tfidf_terms_table');
      await this.client.execute('DELETE FROM tfidf_documents_table');
      await this.client.execute('DELETE FROM tfidf_idf_table');
      await this.client.execute('DELETE FROM codebase_files_table');
      await this.client.execute('DELETE FROM codebase_metadata_table');

      console.error('[INFO] Cache database cleared');
    } catch (error) {
      throw new DatabaseError('Failed to clear cache database', 'cache.clearCache', error as Error);
    }
  }

  /**
   * Perform database health check
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string; details?: any }> {
    try {
      // Test basic connectivity
      await this.client.execute('SELECT 1');

      // Check if cache tables exist
      const migrationStatus = await this.getMigrationStatus();

      // Test basic read/write operation
      const testResult = await this.client.execute(`
        SELECT count(*) as count FROM codebase_files_table
      `);

      return {
        healthy: true,
        details: {
          tablesExist: migrationStatus.isMigrated,
          tableCount: migrationStatus.migrationCount,
          cachedFiles: testResult.rows[0]?.count || 0,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    // libSQL client doesn't have explicit close for file-based databases
  }

  /**
   * Get database path for debugging
   */
  getDatabasePath(): string {
    const cacheDir = path.join(process.cwd(), '.sylphx-flow');
    return path.join(cacheDir, 'cache.db');
  }
}

// Export schema and types
export * from './cache-schema.js';
export { schema };
