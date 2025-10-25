/**
 * Memory Storage Implementation - 記憶存儲實現
 * 專門處理需要持久化嘅 memory 數據（應該上 Git）
 */

import { and, count, desc, eq, like, or } from 'drizzle-orm';
import { type MemoryDatabase, MemoryDatabaseClient } from '../db/memory-db.js';
import { memory } from '../db/memory-schema.js';

// Memory entry interface
export interface MemoryEntry {
  key: string;
  namespace: string;
  value: any;
  timestamp: number;
  created_at: string;
  updated_at: string;
}

/**
 * Memory storage implementation
 */
export class MemoryStorage {
  private memoryDb: MemoryDatabaseClient;
  private memory: MemoryDatabase;

  constructor() {
    this.memoryDb = new MemoryDatabaseClient();
    this.memory = this.memoryDb.db;
  }

  async initialize(): Promise<void> {
    await this.memoryDb.initialize();
  }

  /**
   * Safely serialize a value to JSON string
   */
  private safeSerialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new Error(`Failed to serialize value: ${(error as Error).message}`);
    }
  }

  /**
   * Safely deserialize a JSON string to value
   */
  private safeDeserialize(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Failed to deserialize value: ${(error as Error).message}`);
    }
  }

  /**
   * Set a memory entry
   */
  async set(key: string, value: any, namespace = 'default'): Promise<void> {
    const errorMessage = `Failed to set memory entry: ${namespace}:${key}`;

    try {
      const now = new Date().toISOString();
      const timestamp = Date.now();
      const serializedValue = this.safeSerialize(value);

      // Check if entry exists
      const existing = await this.memory
        .select()
        .from(memory)
        .where(and(eq(memory.key, key), eq(memory.namespace, namespace)))
        .limit(1);

      if (existing.length > 0) {
        // Update existing entry
        await this.memory
          .update(memory)
          .set({
            value: serializedValue,
            timestamp,
            updated_at: now,
          })
          .where(and(eq(memory.key, key), eq(memory.namespace, namespace)));
      } else {
        // Insert new entry
        await this.memory.insert(memory).values({
          key,
          namespace,
          value: serializedValue,
          timestamp,
          created_at: now,
          updated_at: now,
        });
      }
    } catch (error) {
      throw new Error(`${errorMessage}: ${(error as Error).message}`);
    }
  }

  /**
   * Get a memory entry
   */
  async get(key: string, namespace = 'default'): Promise<MemoryEntry | null> {
    const errorMessage = `Failed to get memory entry: ${namespace}:${key}`;

    try {
      const result = await this.memory
        .select()
        .from(memory)
        .where(and(eq(memory.key, key), eq(memory.namespace, namespace)))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const entry = result[0];
      return {
        key: entry.key,
        namespace: entry.namespace,
        value: this.safeDeserialize(entry.value),
        timestamp: entry.timestamp,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
      };
    } catch (error) {
      throw new Error(`${errorMessage}: ${(error as Error).message}`);
    }
  }

  /**
   * Get all memory entries
   */
  async getAll(namespace?: string): Promise<MemoryEntry[]> {
    const errorMessage = 'Failed to get all memory entries';

    try {
      let query = this.memory.select().from(memory);

      if (namespace && namespace !== 'all') {
        query = query.where(eq(memory.namespace, namespace));
      }

      const results = await query.orderBy(desc(memory.timestamp));

      return results.map((entry) => ({
        key: entry.key,
        namespace: entry.namespace,
        value: this.safeDeserialize(entry.value),
        timestamp: entry.timestamp,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
      }));
    } catch (error) {
      throw new Error(`${errorMessage}: ${(error as Error).message}`);
    }
  }

  /**
   * Search memory entries
   */
  async search(pattern: string, namespace?: string): Promise<MemoryEntry[]> {
    const errorMessage = `Failed to search memory entries: ${pattern}`;

    try {
      let query = this.memory
        .select()
        .from(memory)
        .where(or(like(memory.key, `%${pattern}%`), like(memory.value, `%${pattern}%`)));

      if (namespace && namespace !== 'all') {
        query = query.where(
          and(
            eq(memory.namespace, namespace),
            or(like(memory.key, `%${pattern}%`), like(memory.value, `%${pattern}%`))
          )
        );
      }

      const results = await query.orderBy(desc(memory.timestamp));

      return results.map((entry) => ({
        key: entry.key,
        namespace: entry.namespace,
        value: this.safeDeserialize(entry.value),
        timestamp: entry.timestamp,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
      }));
    } catch (error) {
      throw new Error(`${errorMessage}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a memory entry
   */
  async delete(key: string, namespace = 'default'): Promise<boolean> {
    const errorMessage = `Failed to delete memory entry: ${namespace}:${key}`;

    try {
      const _result = await this.memory
        .delete(memory)
        .where(and(eq(memory.key, key), eq(memory.namespace, namespace)));

      // For libSQL, check if deletion was successful by trying to select the record
      const exists = await this.memory
        .select()
        .from(memory)
        .where(and(eq(memory.key, key), eq(memory.namespace, namespace)))
        .limit(1);

      return exists.length === 0;
    } catch (error) {
      throw new Error(`${errorMessage}: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all memory entries in a namespace
   */
  async clear(namespace = 'default'): Promise<void> {
    const errorMessage = `Failed to clear memory namespace: ${namespace}`;

    try {
      await this.memory.delete(memory).where(eq(memory.namespace, namespace));
    } catch (error) {
      throw new Error(`${errorMessage}: ${(error as Error).message}`);
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(namespace?: string): Promise<{
    totalEntries: number;
    namespaces: string[];
  }> {
    const errorMessage = 'Failed to get memory statistics';

    try {
      let baseQuery = this.memory.select({ count: count() }).from(memory);

      if (namespace && namespace !== 'all') {
        baseQuery = baseQuery.where(eq(memory.namespace, namespace));
      }

      const totalResult = await baseQuery;
      const totalEntries = totalResult[0]?.count || 0;

      // Get unique namespaces
      const namespaceResults = await this.memory
        .selectDistinct({ namespace: memory.namespace })
        .from(memory);

      const namespaces = namespaceResults.map((row) => row.namespace);

      return {
        totalEntries,
        namespaces,
      };
    } catch (error) {
      throw new Error(`${errorMessage}: ${(error as Error).message}`);
    }
  }
}
