/**
 * Memory database client - 永久記憶數據庫
 * 負責管理需要持久化和版本控制的記憶數據
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as schema from './memory-schema.js';
import { ConnectionError, DatabaseError } from '../utils/database-errors.js';

export type MemoryDatabase = ReturnType<typeof drizzle<typeof schema>>;

export class MemoryDatabaseClient {
  private client: ReturnType<typeof createClient>;
  public db: MemoryDatabase;

  constructor() {
    try {
      const memoryDir = path.join(process.cwd(), '.sylphx-flow');

      // Ensure directory exists
      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
      }

      const dbPath = path.join(memoryDir, 'memory.db');

      this.client = createClient({
        url: `file:${dbPath}`,
      });

      this.db = drizzle(this.client, { schema });
    } catch (error) {
      throw new ConnectionError(
        'Failed to initialize memory database connection',
        { url: `file:${path.join(process.cwd(), '.sylphx-flow/memory.db')}` },
        error as Error
      );
    }
  }

  /**
   * Initialize memory database schema
   */
  async initialize(): Promise<void> {
    try {
      // Check if tables already exist
      const migrationStatus = await this.getMigrationStatus();

      if (migrationStatus.isMigrated) {
        console.error('[INFO] Memory database tables already exist');
        return;
      }

      // Run migrations
      const migrationsPath = path.join(process.cwd(), 'drizzle', 'memory');

      if (fs.existsSync(migrationsPath)) {
        await migrate(this.db, { migrationsFolder: migrationsPath });
        console.error('[INFO] Memory database migrations completed');
      } else {
        // Create tables directly if no migrations
        await this.createTables();
        console.error('[INFO] Memory database tables created');
      }
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
    await this.client.execute(`
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
    await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory_table (namespace)
      `);

    await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory_table (timestamp)
      `);

    await this.client.execute(`
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
      const result = await this.client.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='memory_table'
      `);

      return {
        isMigrated: result.rows.length > 0,
        migrationCount: result.rows.length,
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
  async healthCheck(): Promise<{ healthy: boolean; error?: string; details?: any }> {
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
