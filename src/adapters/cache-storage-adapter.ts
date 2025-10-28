/**
 * Cache Storage Adapter Implementation
 * Wraps the existing CacheStorage class with the unified interface
 */

import type {
  CacheStorageAdapter,
  StorageConfig,
  StorageResult,
  CacheStats,
} from '../interfaces/unified-storage.js';
import { StorageUtils } from '../core/unified-storage-manager.js';
import { CacheStorage } from '../utils/cache-storage.js';
import { logger } from '../utils/logger.js';

/**
 * Cache storage adapter implementation
 */
export class CacheStorageAdapter implements CacheStorageAdapter {
  readonly type = 'cache';
  private storage: CacheStorage;
  private config: StorageConfig;
  private initialized = false;
  private defaultTTL: number;

  constructor(config: StorageConfig) {
    this.config = config;
    this.defaultTTL = config.defaultTTL || 3600; // 1 hour default
    this.storage = new CacheStorage();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await StorageUtils.executeOperation(
      async () => {
        await this.storage.initialize();
        this.initialized = true;
        logger.info('Cache storage adapter initialized', {
          config: this.config,
          defaultTTL: this.defaultTTL
        });
      },
      'cache.initialize'
    );
  }

  async close(): Promise<void> {
    await StorageUtils.executeOperation(
      async () => {
        // Perform cleanup before closing
        const cleaned = await this.cleanup();
        if (cleaned > 0) {
          logger.debug('Cleaned up expired cache entries during close', { count: cleaned });
        }
        this.initialized = false;
        logger.debug('Cache storage adapter closed');
      },
      'cache.close'
    );
  }

  async getStats(): Promise<Record<string, unknown>> {
    return StorageUtils.executeOperation(
      async () => {
        const cacheStats = await this.getCacheStats();
        const size = await this.size();

        return {
          type: this.type,
          size,
          ...cacheStats,
          initialized: this.initialized,
          config: this.config,
        };
      },
      'cache.getStats'
    );
  }

  async get(key: string): Promise<unknown> {
    return StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const result = await this.storage.get(key);
        logger.debug('Cache get operation', { key, found: result !== null });
        return result;
      },
      'cache.get'
    );
  }

  async set(key: string, value: unknown): Promise<void> {
    await StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        await this.storage.set(key, value, this.defaultTTL);
        logger.debug('Cache set operation', { key, ttl: this.defaultTTL });
      },
      'cache.set'
    );
  }

  async delete(key: string): Promise<boolean> {
    return StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const result = await this.storage.delete(key);
        logger.debug('Cache delete operation', { key, deleted: result });
        return result;
      },
      'cache.delete'
    );
  }

  async exists(key: string): Promise<boolean> {
    return StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const result = await this.get(key);
        return result !== null;
      },
      'cache.exists'
    );
  }

  async keys(): Promise<string[]> {
    return StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const keys = await this.storage.keys();
        logger.debug('Cache keys operation', { count: keys.length });
        return keys;
      },
      'cache.keys'
    );
  }

  async size(): Promise<number> {
    return StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const keys = await this.keys();
        return keys.length;
      },
      'cache.size'
    );
  }

  async clear(): Promise<void> {
    await StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        await this.storage.clear();
        logger.debug('Cache clear operation');
      },
      'cache.clear'
    );
  }

  async getWithTTL(key: string): Promise<{ value: unknown; ttl: number } | null> {
    return StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const result = await this.storage.getWithTTL(key);
        logger.debug('Cache get with TTL', {
          key,
          found: result !== null,
          ttl: result?.ttl
        });
        return result;
      },
      'cache.getWithTTL'
    );
  }

  async setWithTTL(key: string, value: unknown, ttl?: number): Promise<void> {
    await StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const actualTTL = ttl ?? this.defaultTTL;
        await this.storage.setWithTTL(key, value, actualTTL);
        logger.debug('Cache set with TTL', { key, ttl: actualTTL });
      },
      'cache.setWithTTL'
    );
  }

  async cleanup(): Promise<number> {
    return StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const cleaned = await this.storage.cleanup();
        logger.debug('Cache cleanup', { cleaned });
        return cleaned;
      },
      'cache.cleanup'
    );
  }

  async getCacheStats(): Promise<CacheStats> {
    return StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const stats = await this.storage.getStats();
        logger.debug('Cache stats retrieved', stats);
        return stats;
      },
      'cache.getCacheStats'
    );
  }

  /**
   * Get or set with automatic TTL
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    return StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();

        // Try to get from cache first
        const cached = await this.get(key);
        if (cached !== null) {
          logger.debug('Cache hit', { key });
          return cached as T;
        }

        // Cache miss - generate value
        logger.debug('Cache miss, generating value', { key });
        const value = await factory();

        // Store in cache
        await this.setWithTTL(key, value, ttl);

        return value;
      },
      'cache.getOrSet'
    );
  }

  /**
   * Set multiple values with the same TTL
   */
  async setBatch(entries: Array<{ key: string; value: unknown; ttl?: number }>): Promise<void> {
    await StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const promises = entries.map(({ key, value, ttl }) =>
          this.setWithTTL(key, value, ttl)
        );
        await Promise.all(promises);
        logger.debug('Cache batch set operation', { count: entries.length });
      },
      'cache.setBatch'
    );
  }

  /**
   * Get multiple values in parallel
   */
  async getBatch(keys: string[]): Promise<Array<{ key: string; value: unknown; ttl?: number }>> {
    return StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const promises = keys.map(async (key) => {
          const result = await this.getWithTTL(key);
          return {
            key,
            value: result?.value,
            ttl: result?.ttl
          };
        });
        const results = await Promise.all(promises);
        logger.debug('Cache batch get operation', { count: keys.length });
        return results;
      },
      'cache.getBatch'
    );
  }

  /**
   * Touch entries to extend their TTL
   */
  async touch(keys: string[], ttl?: number): Promise<void> {
    await StorageUtils.executeOperation(
      async () => {
        this.ensureInitialized();
        const promises = keys.map(async (key) => {
          const value = await this.get(key);
          if (value !== null) {
            await this.setWithTTL(key, value, ttl);
          }
        });
        await Promise.all(promises);
        logger.debug('Cache touch operation', { count: keys.length, ttl });
      },
      'cache.touch'
    );
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Cache storage adapter not initialized. Call initialize() first.');
    }
  }
}