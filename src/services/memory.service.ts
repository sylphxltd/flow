/**
 * Memory Service Layer
 *
 * Business logic layer for memory operations
 * Handles memory management with validation, caching, and business rules
 * Uses functional Result type for error handling
 */

import type { ILogger } from '../core/interfaces.js';
import { type Result, tryCatchAsync } from '../core/functional/result.js';
import {
  MemoryError,
  MemoryNotFoundError,
  MemorySizeError,
  MemoryValidationError,
  type MemoryErrorType,
} from '../errors/memory-errors.js';
import type { MemoryRepository } from '../repositories/memory.repository.js';
import type {
  CreateMemoryData,
  MemoryEntry,
  MemorySearchParams,
} from '../repositories/memory.repository.js';
import type { MemoryValue } from '../types/memory-types.js';
import {
  type CacheState,
  cacheDelete,
  cacheDeleteWhere,
  cacheEnforceLimit,
  cacheGet,
  cacheSet,
  createCache,
} from '../utils/immutable-cache.js';

export interface MemoryServiceConfig {
  defaultNamespace?: string;
  maxEntrySize?: number;
  enableCaching?: boolean;
  cacheMaxSize?: number;
  retentionPolicy?: {
    enabled: boolean;
    maxAge: number; // milliseconds
    cleanupInterval?: number; // milliseconds
  };
}

export class MemoryService {
  // FUNCTIONAL: Use immutable cache instead of mutable Map
  private cache: CacheState<string, MemoryEntry> = createCache();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly repository: MemoryRepository,
    private readonly logger: ILogger,
    private readonly config: MemoryServiceConfig = {}
  ) {
    this.setupCleanupTimer();
  }

  /**
   * Get a memory value
   */
  async get(
    key: string,
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<Result<MemoryValue, MemoryErrorType>> {
    return await tryCatchAsync(
      async () => {
        // Check cache first if enabled
        if (this.config.enableCaching) {
          const cacheKey = `${namespace}:${key}`;
          // FUNCTIONAL: Use immutable cache get
          const cached = cacheGet(this.cache, cacheKey);
          if (cached) {
            return {
              value: cached.value,
              metadata: {
                namespace,
                timestamp: cached.timestamp,
                size: cached.value.length,
              },
            };
          }
        }

        // Fetch from repository
        const entry = await this.repository.getByKey(key, namespace);

        if (!entry) {
          throw new MemoryNotFoundError(key, namespace);
        }

        // Cache the result if enabled
        if (this.config.enableCaching) {
          this.updateCache(entry);
        }

        return {
          value: entry.value,
          metadata: {
            namespace,
            timestamp: entry.timestamp,
            size: entry.value.length,
          },
        };
      },
      (error) => {
        if (error instanceof MemoryNotFoundError) {
          return error;
        }
        this.logger.error(`Failed to get memory entry: ${key}`, error);
        return new MemoryError(`Failed to get memory entry: ${key}`, error);
      }
    );
  }

  /**
   * Set a memory value
   */
  async set(
    key: string,
    value: string,
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<Result<MemoryEntry, MemoryErrorType>> {
    return await tryCatchAsync(
      async () => {
        // Validate inputs
        const validationError = this.validateMemoryEntry(key, value);
        if (validationError) {
          throw validationError;
        }

        const timestamp = Date.now();
        const data: CreateMemoryData = {
          key,
          namespace,
          value,
          timestamp,
        };

        // Store in repository
        const entry = await this.repository.setMemory(data);

        // Update cache if enabled
        if (this.config.enableCaching) {
          this.updateCache(entry);
          this.enforceCacheLimit();
        }

        this.logger.debug(`Memory entry set: ${key} in namespace: ${namespace}`);

        return entry;
      },
      (error) => {
        if (error instanceof MemoryValidationError || error instanceof MemorySizeError) {
          return error;
        }
        this.logger.error(`Failed to set memory entry: ${key}`, error);
        return new MemoryError(`Failed to set memory entry: ${key}`, error);
      }
    );
  }

  /**
   * Delete a memory entry
   */
  async delete(
    key: string,
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<Result<boolean, MemoryError>> {
    return await tryCatchAsync(
      async () => {
        const deleted = await this.repository.deleteMemory(key, namespace);

        // Remove from cache if present
        if (this.config.enableCaching) {
          const cacheKey = `${namespace}:${key}`;
          // FUNCTIONAL: Use immutable cache delete, returns new state
          this.cache = cacheDelete(this.cache, cacheKey);
        }

        this.logger.debug(`Memory entry deleted: ${key} in namespace: ${namespace}`);

        return deleted;
      },
      (error) => {
        this.logger.error(`Failed to delete memory entry: ${key}`, error);
        return new MemoryError(`Failed to delete memory entry: ${key}`, error);
      }
    );
  }

  /**
   * List all keys in a namespace
   */
  async list(
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<Result<string[], MemoryError>> {
    return await tryCatchAsync(
      async () => {
        const keys = await this.repository.listKeys(namespace);
        return keys;
      },
      (error) => {
        this.logger.error(`Failed to list keys in namespace: ${namespace}`, error);
        return new MemoryError(`Failed to list keys in namespace: ${namespace}`, error);
      }
    );
  }

  /**
   * Search memory entries
   */
  async search(params: MemorySearchParams): Promise<Result<MemoryEntry[], MemoryError>> {
    return await tryCatchAsync(
      async () => {
        const entries = await this.repository.searchMemory(params);
        return entries;
      },
      (error) => {
        this.logger.error('Failed to search memory entries', error);
        return new MemoryError('Failed to search memory entries', error);
      }
    );
  }

  /**
   * Clear all entries in a namespace
   */
  async clear(
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<Result<number, MemoryError>> {
    return await tryCatchAsync(
      async () => {
        const deletedCount = await this.repository.clearNamespace(namespace);

        // Clear cache entries for this namespace
        if (this.config.enableCaching) {
          // FUNCTIONAL: Use immutable cache deleteWhere, returns new state
          this.cache = cacheDeleteWhere(
            this.cache,
            (key) => key.startsWith(`${namespace}:`)
          );
        }

        this.logger.info(`Cleared ${deletedCount} entries from namespace: ${namespace}`);

        return deletedCount;
      },
      (error) => {
        this.logger.error(`Failed to clear namespace: ${namespace}`, error);
        return new MemoryError(`Failed to clear namespace: ${namespace}`, error);
      }
    );
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<Result<MemoryStatsResult, MemoryError>> {
    return await tryCatchAsync(
      async () => {
        const stats = await this.repository.getStats();

        return {
          totalEntries: stats.totalEntries,
          totalSize: stats.totalSize,
          namespaces: stats.namespaces,
          oldestEntry: stats.oldestEntry,
          newestEntry: stats.newestEntry,
        };
      },
      (error) => {
        this.logger.error('Failed to get memory statistics', error);
        return new MemoryError('Failed to get memory statistics', error);
      }
    );
  }

  /**
   * Perform bulk operations
   */
  async bulkSet(
    entries: Array<{ key: string; value: string; namespace?: string }>,
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<Result<MemoryEntry[], MemoryError>> {
    return await tryCatchAsync(
      async () => {
        const results: MemoryEntry[] = [];
        const errors: string[] = [];

        for (const entry of entries) {
          const result = await this.set(entry.key, entry.value, entry.namespace || namespace);
          if (result._tag === 'Success') {
            results.push(result.value);
          } else {
            errors.push(`${entry.key}: ${result.error.message}`);
          }
        }

        if (errors.length > 0) {
          this.logger.warn(`Bulk set completed with ${errors.length} errors`, { errors });
          throw new MemoryError(`Bulk set completed with errors: ${errors.join('; ')}`);
        }

        return results;
      },
      (error) => {
        if (error instanceof MemoryError) {
          return error;
        }
        this.logger.error('Failed to perform bulk set', error);
        return new MemoryError('Failed to perform bulk set', error);
      }
    );
  }

  /**
   * Validate memory entry data
   */
  private validateMemoryEntry(key: string, value: string): MemoryValidationError | MemorySizeError | null {
    if (!key || key.trim().length === 0) {
      return new MemoryValidationError('Key cannot be empty', 'key', key);
    }

    if (key.length > 255) {
      return new MemoryValidationError('Key cannot exceed 255 characters', 'key', key);
    }

    if (this.config.maxEntrySize && value.length > this.config.maxEntrySize) {
      return new MemorySizeError(value.length, this.config.maxEntrySize);
    }

    // Validate key format (no special characters that could cause issues)
    if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
      return new MemoryValidationError(
        'Key can only contain alphanumeric characters, dots, hyphens, and underscores',
        'key',
        key
      );
    }

    return null;
  }

  /**
   * Update cache with new entry
   * FUNCTIONAL: Returns new cache state instead of mutating
   */
  private updateCache(entry: MemoryEntry): void {
    const cacheKey = `${entry.namespace}:${entry.key}`;
    // FUNCTIONAL: Use immutable cache set, returns new state
    this.cache = cacheSet(this.cache, cacheKey, entry);
  }

  /**
   * Enforce cache size limit
   * FUNCTIONAL: Uses immutable cache operations
   */
  private enforceCacheLimit(): void {
    if (this.config.cacheMaxSize && this.cache.size > this.config.cacheMaxSize) {
      // FUNCTIONAL: Use immutable cache enforceLimit, returns new state
      const entriesToRemove = this.cache.size - this.config.cacheMaxSize;
      this.cache = cacheEnforceLimit(this.cache, this.config.cacheMaxSize);
      this.logger.debug(`Cache eviction: removed ${entriesToRemove} entries`);
    }
  }

  /**
   * Setup cleanup timer for retention policy
   */
  private setupCleanupTimer(): void {
    if (this.config.retentionPolicy?.enabled && this.config.retentionPolicy.cleanupInterval) {
      this.cleanupTimer = setInterval(async () => {
        try {
          const deletedCount = await this.repository.cleanupOldEntries(
            this.config.retentionPolicy?.maxAge
          );
          if (deletedCount > 0) {
            this.logger.info(`Automatic cleanup: removed ${deletedCount} old entries`);
          }
        } catch (error) {
          this.logger.error('Automatic cleanup failed', error);
        }
      }, this.config.retentionPolicy.cleanupInterval);
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // FUNCTIONAL: Replace cache with new empty cache instead of clearing
    this.cache = createCache();
    this.logger.info('Memory service disposed');
  }
}
