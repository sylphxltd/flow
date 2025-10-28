/**
 * Memory Service Layer
 *
 * Business logic layer for memory operations
 * Handles memory management with validation, caching, and business rules
 */

import type { ILogger, IStorage } from '../core/interfaces.js';
import type { MemoryRepository } from '../repositories/memory.repository.js';
import type {
  CreateMemoryData,
  MemoryEntry,
  MemorySearchParams,
  UpdateMemoryData,
} from '../repositories/memory.repository.js';

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

export interface MemoryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    namespace: string;
    timestamp: number;
    size?: number;
  };
}

export class MemoryService {
  private cache = new Map<string, MemoryEntry>();
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
  ): Promise<MemoryResult<string>> {
    try {
      // Check cache first if enabled
      if (this.config.enableCaching) {
        const cacheKey = `${namespace}:${key}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached.value,
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
        return {
          success: false,
          error: `Memory entry not found: ${key}`,
        };
      }

      // Cache the result if enabled
      if (this.config.enableCaching) {
        this.updateCache(entry);
      }

      return {
        success: true,
        data: entry.value,
        metadata: {
          namespace,
          timestamp: entry.timestamp,
          size: entry.value.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get memory entry: ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Set a memory value
   */
  async set(
    key: string,
    value: string,
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<MemoryResult<MemoryEntry>> {
    try {
      // Validate inputs
      const validationError = this.validateMemoryEntry(key, value);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
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

      return {
        success: true,
        data: entry,
        metadata: {
          namespace,
          timestamp: entry.timestamp,
          size: value.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to set memory entry: ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a memory entry
   */
  async delete(
    key: string,
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<MemoryResult<boolean>> {
    try {
      const deleted = await this.repository.deleteMemory(key, namespace);

      // Remove from cache if present
      if (this.config.enableCaching) {
        const cacheKey = `${namespace}:${key}`;
        this.cache.delete(cacheKey);
      }

      this.logger.debug(`Memory entry deleted: ${key} in namespace: ${namespace}`);

      return {
        success: true,
        data: deleted,
      };
    } catch (error) {
      this.logger.error(`Failed to delete memory entry: ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all keys in a namespace
   */
  async list(
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<MemoryResult<string[]>> {
    try {
      const keys = await this.repository.listKeys(namespace);

      return {
        success: true,
        data: keys,
        metadata: {
          namespace,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to list keys in namespace: ${namespace}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Search memory entries
   */
  async search(params: MemorySearchParams): Promise<MemoryResult<MemoryEntry[]>> {
    try {
      const entries = await this.repository.searchMemory(params);

      return {
        success: true,
        data: entries,
        metadata: {
          namespace: params.namespace || this.config.defaultNamespace || 'default',
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to search memory entries', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Clear all entries in a namespace
   */
  async clear(
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<MemoryResult<number>> {
    try {
      const deletedCount = await this.repository.clearNamespace(namespace);

      // Clear cache entries for this namespace
      if (this.config.enableCaching) {
        for (const [key] of this.cache) {
          if (key.startsWith(`${namespace}:`)) {
            this.cache.delete(key);
          }
        }
      }

      this.logger.info(`Cleared ${deletedCount} entries from namespace: ${namespace}`);

      return {
        success: true,
        data: deletedCount,
        metadata: {
          namespace,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to clear namespace: ${namespace}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryResult<any>> {
    try {
      const stats = await this.repository.getStats();

      return {
        success: true,
        data: {
          ...stats,
          cacheSize: this.cache.size,
          config: this.config,
        },
        metadata: {
          namespace: 'all',
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get memory statistics', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Perform bulk operations
   */
  async bulkSet(
    entries: Array<{ key: string; value: string; namespace?: string }>,
    namespace: string = this.config.defaultNamespace || 'default'
  ): Promise<MemoryResult<MemoryEntry[]>> {
    const results: MemoryEntry[] = [];
    const errors: string[] = [];

    for (const entry of entries) {
      const result = await this.set(entry.key, entry.value, entry.namespace || namespace);
      if (result.success && result.data) {
        results.push(result.data);
      } else {
        errors.push(`${entry.key}: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`Bulk set completed with ${errors.length} errors`, { errors });
    }

    return {
      success: errors.length === 0,
      data: results,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      metadata: {
        namespace,
        timestamp: Date.now(),
        processed: results.length,
        errors: errors.length,
      },
    };
  }

  /**
   * Validate memory entry data
   */
  private validateMemoryEntry(key: string, value: string): string | null {
    if (!key || key.trim().length === 0) {
      return 'Key cannot be empty';
    }

    if (key.length > 255) {
      return 'Key cannot exceed 255 characters';
    }

    if (this.config.maxEntrySize && value.length > this.config.maxEntrySize) {
      return `Value cannot exceed ${this.config.maxEntrySize} characters`;
    }

    // Validate key format (no special characters that could cause issues)
    if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
      return 'Key can only contain alphanumeric characters, dots, hyphens, and underscores';
    }

    return null;
  }

  /**
   * Update cache with new entry
   */
  private updateCache(entry: MemoryEntry): void {
    const cacheKey = `${entry.namespace}:${entry.key}`;
    this.cache.set(cacheKey, entry);
  }

  /**
   * Enforce cache size limit
   */
  private enforceCacheLimit(): void {
    if (this.config.cacheMaxSize && this.cache.size > this.config.cacheMaxSize) {
      // Remove oldest entries (FIFO)
      const entriesToRemove = this.cache.size - this.config.cacheMaxSize;
      const keys = Array.from(this.cache.keys()).slice(0, entriesToRemove);

      for (const key of keys) {
        this.cache.delete(key);
      }

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

    this.cache.clear();
    this.logger.info('Memory service disposed');
  }
}
