/**
 * Memory Storage Adapter Implementation
 * Wraps the existing MemoryStorage class with the unified interface
 */

import { StorageUtils } from '../core/unified-storage-manager.js';
import type {
  MemoryStorageAdapter as IMemoryStorageAdapter,
  StorageConfig,
  StorageResult,
} from '../interfaces/unified-storage.js';
import { logger } from '../utils/logger.js';
import { type MemoryEntry, MemoryStorage } from '../utils/memory-storage.js';

/**
 * In-memory storage adapter implementation
 */
export class MemoryStorageAdapter implements IMemoryStorageAdapter {
  readonly type = 'memory';
  private storage: MemoryStorage;
  private config: StorageConfig;
  private initialized = false;

  constructor(config: StorageConfig) {
    this.config = config;
    this.storage = new MemoryStorage();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await StorageUtils.executeOperation(async () => {
      await this.storage.initialize();
      this.initialized = true;
      logger.info('Memory storage adapter initialized', { config: this.config });
    }, 'memory.initialize');
  }

  async close(): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      // Memory storage doesn't need explicit cleanup
      this.initialized = false;
      logger.debug('Memory storage adapter closed');
    }, 'memory.close');
  }

  async getStats(): Promise<Record<string, unknown>> {
    return StorageUtils.executeOperation(async () => {
      const size = await this.size();
      const keys = await this.keys();

      return {
        type: this.type,
        size,
        keyCount: keys.length,
        initialized: this.initialized,
        config: this.config,
      };
    }, 'memory.getStats');
  }

  async get(key: string, namespace = 'default'): Promise<unknown> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const result = await this.storage.get(key, namespace);
      logger.debug('Memory get operation', { key, namespace, found: result !== null });
      return result?.value;
    }, 'memory.get');
  }

  async set(key: string, value: unknown, namespace = 'default'): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      await this.storage.set(key, value, namespace);
      logger.debug('Memory set operation', { key, namespace });
    }, 'memory.set');
  }

  async delete(key: string, namespace = 'default'): Promise<boolean> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const result = await this.storage.delete(key, namespace);
      logger.debug('Memory delete operation', { key, namespace, deleted: result });
      return result;
    }, 'memory.delete');
  }

  async exists(key: string): Promise<boolean> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const result = await this.get(key);
      return result !== null;
    }, 'memory.exists');
  }

  async keys(namespace?: string): Promise<string[]> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const keys = await this.storage.keys(namespace);
      logger.debug('Memory keys operation', { namespace, count: keys.length });
      return keys;
    }, 'memory.keys');
  }

  async size(): Promise<number> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const keys = await this.keys();
      return keys.length;
    }, 'memory.size');
  }

  async clear(namespace?: string): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      await this.storage.clear(namespace);
      logger.debug('Memory clear operation', { namespace });
    }, 'memory.clear');
  }

  /**
   * Get memory entries with full metadata
   */
  async getEntries(namespace?: string): Promise<MemoryEntry[]> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const keys = await this.keys(namespace);

      // Use parallel operations for better performance
      const entryPromises = keys.map(async (key) => {
        const entry = await this.storage.get(key, namespace);
        return entry;
      });

      const resolvedEntries = await Promise.all(entryPromises);
      return resolvedEntries.filter((entry): entry is MemoryEntry => entry !== null);
    }, 'memory.getEntries');
  }

  /**
   * Set multiple values in a batch operation
   */
  async setBatch(
    entries: Array<{ key: string; value: unknown; namespace?: string }>
  ): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const promises = entries.map(({ key, value, namespace = 'default' }) =>
        this.set(key, value, namespace)
      );
      await Promise.all(promises);
      logger.debug('Memory batch set operation', { count: entries.length });
    }, 'memory.setBatch');
  }

  /**
   * Get multiple values in a batch operation
   */
  async getBatch(
    keys: string[],
    namespace = 'default'
  ): Promise<Array<{ key: string; value: unknown }>> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const promises = keys.map(async (key) => {
        const value = await this.get(key, namespace);
        return { key, value };
      });
      const results = await Promise.all(promises);
      logger.debug('Memory batch get operation', { count: keys.length, namespace });
      return results;
    }, 'memory.getBatch');
  }

  /**
   * Search memory entries by value pattern
   */
  async searchByValue(pattern: string | RegExp, namespace = 'default'): Promise<MemoryEntry[]> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const entries = await this.getEntries(namespace);
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');

      const filtered = entries.filter((entry) => {
        const valueStr = JSON.stringify(entry.value);
        return regex.test(valueStr);
      });

      logger.debug('Memory search by value', {
        pattern: pattern.toString(),
        namespace,
        results: filtered.length,
      });

      return filtered;
    }, 'memory.searchByValue');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Memory storage adapter not initialized. Call initialize() first.');
    }
  }
}
