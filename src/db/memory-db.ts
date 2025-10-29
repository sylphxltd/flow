/**
 * Memory database client - 永久記憶數據庫
 * 負責管理需要持久化和版本控制的記憶數據
 */

import * as path from 'node:path';
import type { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { DatabaseError } from '../utils/database-errors.js';
import { BaseDatabaseClient } from './base-database-client.js';
import * as schema from './memory-schema.js';

export type MemoryDatabase = ReturnType<typeof drizzle<typeof schema>>;

export class MemoryDatabaseClient extends BaseDatabaseClient<typeof schema> {
  constructor() {
    super('memory', schema);
  }

  /**
   * Initialize memory database schema
   */
  async initialize(): Promise<void> {
    try {
      // Check if tables already exist
      const migrationStatus = await this.getMigrationStatus();

      if (migrationStatus.isMigrated) {
        // Tables already exist, skip logging to reduce noise
        return;
      }

      // Run migrations
      const _migrationsPath = path.join(process.cwd(), 'drizzle', 'memory');

      // For now, create tables directly since we don't have migration files yet
      await this.createTables();
      console.error('[INFO] Memory database tables created');
    } catch (error) {
      throw new DatabaseError(
        'Failed to initialize memory database',
        'memory.initialize',
        error as Error
      );
    }
  }

  /**
   * Create tables directly (fallback)
   */
  private async createTables(): Promise<void> {
    // Create memory table
    await this.createTable(`
        CREATE TABLE IF NOT EXISTS memory_table (
          key TEXT NOT NULL,
          namespace TEXT NOT NULL DEFAULT 'default',
          value TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (key, namespace)
        )
      `);

    // Create indexes
    await this.createIndex(`
        CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory_table (namespace)
      `);

    await this.createIndex(`
        CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory_table (timestamp)
      `);

    await this.createIndex(`
        CREATE INDEX IF NOT EXISTS idx_memory_key ON memory_table (key)
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
      const exists = await this.tableExists('memory_table');
      return {
        isMigrated: exists,
        migrationCount: exists ? 1 : 0,
      };
    } catch (error) {
      throw new DatabaseError(
        'Failed to check memory database migration status',
        'memory.getMigrationStatus',
        error as Error
      );
    }
  }

  /**
   * Perform database health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    try {
      // Test basic connectivity
      await this.client.execute('SELECT 1');

      // Check if memory table exists
      const migrationStatus = await this.getMigrationStatus();

      // Test basic read/write operation
      const testResult = await this.client.execute(`
        SELECT count(*) as count FROM memory_table
      `);

      return {
        healthy: true,
        details: {
          tablesExist: migrationStatus.isMigrated,
          memoryEntries: testResult.rows[0]?.count || 0,
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
    const memoryDir = path.join(process.cwd(), '.sylphx-flow');
    return path.join(memoryDir, 'memory.db');
  }
}

// Export schema and types
export * from './memory-schema.js';
export { schema };
