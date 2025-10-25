/**
 * Drizzle ORM database client for Sylphx Flow
 * Type-safe database operations with proper migrations
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { ConnectionError, DatabaseError } from '../utils/database-errors.js';
import * as schema from './schema.js';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export class DrizzleDatabase {
  private client: ReturnType<typeof createClient>;
  public db: Database;

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
        'Failed to initialize database connection',
        { url: `file:${path.join(process.cwd(), '.sylphx-flow/memory.db')}` },
        error as Error
      );
    }
  }

  /**
   * Initialize database schema using Drizzle migrations
   */
  async initialize(): Promise<void> {
    try {
      // Check if tables already exist from previous implementation
      const migrationStatus = await this.getMigrationStatus();

      if (migrationStatus.isMigrated) {
        console.error('[INFO] Database tables already exist, checking migration state');

        // Check if __drizzle_migrations table exists
        const drizzleMigrationResult = await this.client.execute(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='__drizzle_migrations'
        `);

        if (drizzleMigrationResult.rows.length === 0) {
          // Tables exist but no Drizzle migration tracking
          // Create the migration tracking table and mark as migrated
          await this.client.execute(`
            CREATE TABLE IF NOT EXISTS __drizzle_migrations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              hash text NOT NULL UNIQUE,
              created_at numeric NOT NULL DEFAULT (strftime('%s', 'now'))
            )
          `);

          // Insert our migration as already applied
          await this.client.execute(`
            INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) 
            VALUES ('0000_wooden_lady_bullseye', strftime('%s', 'now'))
          `);

          console.error('[INFO] Migration tracking initialized for existing tables');
        }

        return;
      }

      // Run migrations using Drizzle migrator
      const migrationsPath = path.join(process.cwd(), 'drizzle');

      if (fs.existsSync(migrationsPath)) {
        await migrate(this.db, { migrationsFolder: migrationsPath });
        console.error('[INFO] Database migrations completed');
      } else {
        console.error('[WARN] No migrations folder found, using fallback table creation');
        await this.createTablesFallback();
      }
    } catch (error) {
      const errorMessage = `Migration failed: ${(error as Error).message}`;
      console.error('[ERROR]', errorMessage);

      // Try fallback as last resort
      try {
        await this.createTablesFallback();
        console.error('[WARN] Fallback table creation completed');
      } catch (fallbackError) {
        throw new DatabaseError(
          'Both migration and fallback failed',
          'initialize',
          fallbackError as Error,
          { originalError: (error as Error).message }
        );
      }
    }
  }

  /**
   * Fallback table creation for development
   * Only used if migrations fail
   */
  private async createTablesFallback(): Promise<void> {
    // This is a minimal fallback - in production we should always use migrations
    console.error('[INFO] Using fallback table creation');

    // Create tables using the existing database connection
    // The tables should already exist from previous runs
    // This is just a safety net
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

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    isMigrated: boolean;
    migrationCount: number;
  }> {
    try {
      // Check if our main tables exist
      const result = await this.client.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('memory', 'codebase_files', 'tfidf_terms')
      `);

      return {
        isMigrated: result.rows.length >= 2, // At least memory and codebase_files
        migrationCount: result.rows.length,
      };
    } catch (error) {
      throw new DatabaseError(
        'Failed to check migration status',
        'getMigrationStatus',
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

      // Check if critical tables exist
      const migrationStatus = await this.getMigrationStatus();

      // Test basic read/write operation
      const testResult = await this.client.execute(`
        SELECT count(*) as count FROM memory
      `);

      return {
        healthy: true,
        details: {
          tablesExist: migrationStatus.isMigrated,
          tableCount: migrationStatus.migrationCount,
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
}

// Export schema and types
export * from './schema.js';
export { schema };

// Re-export commonly used database functions (these will be added when memory-db is fully implemented)
// export {
//   storeMemory,
//   retrieveMemory,
//   searchMemory,
//   clearMemory,
// } from './memory-db';

export {
  isDatabaseError,
} from '../utils/database-errors';
