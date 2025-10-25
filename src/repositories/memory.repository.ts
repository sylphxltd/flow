/**
 * Memory Repository Implementation
 *
 * Handles persistence of memory data with version control and namespace support
 */

import type { IDatabaseConnection, ILogger } from '../core/interfaces.js';
import { BaseRepository } from './base.repository.js';

export interface MemoryEntry {
  key: string;
  namespace: string;
  value: string;
  timestamp: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMemoryData {
  key: string;
  namespace?: string;
  value: string;
  timestamp?: number;
}

export interface UpdateMemoryData {
  value?: string;
  timestamp?: number;
  updated_at?: string;
}

export interface MemorySearchParams {
  namespace?: string;
  keyPattern?: string;
  valuePattern?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  offset?: number;
}

export class MemoryRepository extends BaseRepository<MemoryEntry> {
  constructor(db: IDatabaseConnection, logger: ILogger) {
    super(db, logger, 'memory_table');
  }

  /**
   * Get a memory entry by key and namespace
   */
  async getByKey(key: string, namespace = 'default'): Promise<MemoryEntry | null> {
    try {
      const result = await this.db.execute(
        `SELECT * FROM ${this.tableName} WHERE key = ? AND namespace = ? LIMIT 1`,
        [key, namespace]
      );

      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`Failed to get memory entry: ${key} in namespace: ${namespace}`, error);
      throw error;
    }
  }

  /**
   * Set a memory entry (create or update)
   */
  async setMemory(data: CreateMemoryData): Promise<MemoryEntry> {
    const { key, namespace = 'default', value, timestamp = Date.now() } = data;
    const now = new Date().toISOString();

    try {
      // Try to update first
      const updateResult = await this.db.execute(
        `UPDATE ${this.tableName}
         SET value = ?, timestamp = ?, updated_at = ?
         WHERE key = ? AND namespace = ?
         RETURNING *`,
        [value, timestamp, now, key, namespace]
      );

      if (updateResult.rows.length > 0) {
        return updateResult.rows[0];
      }

      // If no rows were updated, create a new entry
      const insertResult = await this.db.execute(
        `INSERT INTO ${this.tableName} (key, namespace, value, timestamp, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [key, namespace, value, timestamp, now, now]
      );

      return insertResult.rows[0];
    } catch (error) {
      this.logger.error(`Failed to set memory entry: ${key} in namespace: ${namespace}`, error);
      throw error;
    }
  }

  /**
   * Delete a memory entry by key and namespace
   */
  async deleteMemory(key: string, namespace = 'default'): Promise<boolean> {
    try {
      const result = await this.db.execute(
        `DELETE FROM ${this.tableName} WHERE key = ? AND namespace = ?`,
        [key, namespace]
      );

      return result.rowsAffected > 0;
    } catch (error) {
      this.logger.error(`Failed to delete memory entry: ${key} in namespace: ${namespace}`, error);
      throw error;
    }
  }

  /**
   * List all keys in a namespace
   */
  async listKeys(namespace = 'default'): Promise<string[]> {
    try {
      const result = await this.db.execute(
        `SELECT DISTINCT key FROM ${this.tableName} WHERE namespace = ? ORDER BY key`,
        [namespace]
      );

      return result.rows.map((row: any) => row.key);
    } catch (error) {
      this.logger.error(`Failed to list keys in namespace: ${namespace}`, error);
      throw error;
    }
  }

  /**
   * Search memory entries with various filters
   */
  async searchMemory(params: MemorySearchParams): Promise<MemoryEntry[]> {
    const {
      namespace,
      keyPattern,
      valuePattern,
      fromTimestamp,
      toTimestamp,
      limit = 50,
      offset = 0,
    } = params;

    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const queryParams: any[] = [];
      const conditions: string[] = [];

      // Build WHERE conditions
      if (namespace) {
        conditions.push('namespace = ?');
        queryParams.push(namespace);
      }

      if (keyPattern) {
        conditions.push('key LIKE ?');
        queryParams.push(`%${keyPattern}%`);
      }

      if (valuePattern) {
        conditions.push('value LIKE ?');
        queryParams.push(`%${valuePattern}%`);
      }

      if (fromTimestamp) {
        conditions.push('timestamp >= ?');
        queryParams.push(fromTimestamp);
      }

      if (toTimestamp) {
        conditions.push('timestamp <= ?');
        queryParams.push(toTimestamp);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Add ordering and pagination
      query += ' ORDER BY timestamp DESC, updated_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);

      const result = await this.db.execute(query, queryParams);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to search memory entries', error);
      throw error;
    }
  }

  /**
   * Count memory entries in a namespace
   */
  async countMemory(namespace = 'default'): Promise<number> {
    try {
      const result = await this.db.execute(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE namespace = ?`,
        [namespace]
      );

      return result.rows[0].count;
    } catch (error) {
      this.logger.error(`Failed to count memory entries in namespace: ${namespace}`, error);
      throw error;
    }
  }

  /**
   * Clear all memory entries in a namespace
   */
  async clearNamespace(namespace = 'default'): Promise<number> {
    try {
      const result = await this.db.execute(`DELETE FROM ${this.tableName} WHERE namespace = ?`, [
        namespace,
      ]);

      return result.rowsAffected;
    } catch (error) {
      this.logger.error(`Failed to clear namespace: ${namespace}`, error);
      throw error;
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    namespaces: Array<{
      name: string;
      count: number;
      oldestTimestamp?: number;
      newestTimestamp?: number;
    }>;
    totalSize: number;
  }> {
    try {
      // Get total entries
      const totalResult = await this.db.execute(`SELECT COUNT(*) as total FROM ${this.tableName}`);
      const totalEntries = totalResult.rows[0].total;

      // Get namespace statistics
      const namespaceResult = await this.db.execute(`
        SELECT
          namespace,
          COUNT(*) as count,
          MIN(timestamp) as oldest_timestamp,
          MAX(timestamp) as newest_timestamp
        FROM ${this.tableName}
        GROUP BY namespace
        ORDER BY count DESC
      `);

      const namespaces = namespaceResult.rows.map((row: any) => ({
        name: row.namespace,
        count: row.count,
        oldestTimestamp: row.oldest_timestamp,
        newestTimestamp: row.newest_timestamp,
      }));

      // Estimate total size (rough calculation)
      const sizeResult = await this.db.execute(`
        SELECT SUM(LENGTH(key) + LENGTH(value) + LENGTH(namespace)) as total_size
        FROM ${this.tableName}
      `);
      const totalSize = sizeResult.rows[0].total_size || 0;

      return {
        totalEntries,
        namespaces,
        totalSize,
      };
    } catch (error) {
      this.logger.error('Failed to get memory statistics', error);
      throw error;
    }
  }

  /**
   * Clean up old memory entries based on retention policy
   */
  async cleanupOldEntries(maxAge: number): Promise<number> {
    try {
      const cutoffTimestamp = Date.now() - maxAge;

      const result = await this.db.execute(`DELETE FROM ${this.tableName} WHERE timestamp < ?`, [
        cutoffTimestamp,
      ]);

      this.logger.info(`Cleaned up ${result.rowsAffected} old memory entries`);
      return result.rowsAffected;
    } catch (error) {
      this.logger.error('Failed to cleanup old memory entries', error);
      throw error;
    }
  }
}
