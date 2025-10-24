/**
 * Base database client - 基礎數據庫客戶端
 * 提供共用的數據庫連接和管理功能
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { ConnectionError, DatabaseError } from '../utils/database-errors.js';

export abstract class BaseDatabaseClient<TSchema extends Record<string, unknown>> {
  protected client: ReturnType<typeof createClient>;
  public db: ReturnType<typeof drizzle<TSchema>>;
  protected dbName: string;

  constructor(dbName: string, schema: TSchema) {
    this.dbName = dbName;

    try {
      const dbDir = path.join(process.cwd(), '.sylphx-flow');

      // Ensure directory exists
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const dbPath = path.join(dbDir, `${dbName}.db`);

      this.client = createClient({
        url: `file:${dbPath}`,
      });

      this.db = drizzle(this.client, { schema });
    } catch (error) {
      throw new ConnectionError(
        `Failed to initialize ${dbName} database connection`,
        { url: `file:${path.join(process.cwd(), '.sylphx-flow', `${dbName}.db`)}` },
        error as Error
      );
    }
  }

  /**
   * Initialize database schema - 子類必須實現
   */
  abstract initialize(): Promise<void>;

  /**
   * Get migration status - 子類必須實現
   */
  abstract getMigrationStatus(): Promise<{
    isMigrated: boolean;
    migrationCount: number;
  }>;

  /**
   * Perform database health check - 子類必須實現
   */
  abstract healthCheck(): Promise<{
    healthy: boolean;
    error?: string;
    details?: any;
  }>;

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
    return path.join(process.cwd(), '.sylphx-flow', `${this.dbName}.db`);
  }

  /**
   * Create tables directly with common pattern
   */
  protected async createTable(definition: string): Promise<void> {
    try {
      await this.client.execute(definition);
    } catch (error) {
      throw new DatabaseError(
        `Failed to create table for ${this.dbName}`,
        `${this.dbName}.createTable`,
        error as Error
      );
    }
  }

  /**
   * Create index with common pattern
   */
  protected async createIndex(definition: string): Promise<void> {
    try {
      await this.client.execute(definition);
    } catch (error) {
      throw new DatabaseError(
        `Failed to create index for ${this.dbName}`,
        `${this.dbName}.createIndex`,
        error as Error
      );
    }
  }

  /**
   * Check if table exists
   */
  protected async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.client.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='${tableName}'
      `);
      return result.rows.length > 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to check if table ${tableName} exists`,
        `${this.dbName}.tableExists`,
        error as Error
      );
    }
  }
}
