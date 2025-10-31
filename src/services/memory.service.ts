/**
 * Memory Service Layer
 *
 * Business logic layer for memory operations
 * Handles memory management with validation, caching, and business rules
 * Uses functional Result type for error handling
 */

import { type Result, tryCatchAsync } from '../core/functional/result.js';
import type { ILogger } from '../core/interfaces.js';
import {
  MemoryError,
  type MemoryErrorType,
  MemoryNotFoundError,
  MemorySizeError,
  MemoryValidationError,
} from '../errors/memory-errors.js';
import type {
  CreateMemoryData,
  MemoryEntry,
  MemoryRepository,
  MemorySearchParams,
} from '../repositories/memory.repository.js';
import type { MemoryStatsResult, MemoryValue } from '../types/memory-types.js';
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

/**
 * Dependencies for MemoryService
 */
export interface MemoryServiceDeps {
  readonly repository: MemoryRepository;
  readonly logger: ILogger;
}

/**
 * Internal state for MemoryService
 */
interface MemoryServiceState {
  readonly cache: CacheState<string, MemoryEntry>;
  readonly cleanupTimer?: NodeJS.Timeout;
}

/**
 * MemoryService Interface
 * Business logic layer for memory operations
 */
export interface MemoryService {
  readonly get: (key: string, namespace?: string) => Promise<Result<MemoryValue, MemoryErrorType>>;
  readonly set: (
    key: string,
    value: string,
    namespace?: string
  ) => Promise<Result<MemoryEntry, MemoryErrorType>>;
  readonly delete: (key: string, namespace?: string) => Promise<Result<boolean, MemoryError>>;
  readonly list: (namespace?: string) => Promise<Result<string[], MemoryError>>;
  readonly search: (params: MemorySearchParams) => Promise<Result<MemoryEntry[], MemoryError>>;
  readonly clear: (namespace?: string) => Promise<Result<number, MemoryError>>;
  readonly getStats: () => Promise<Result<MemoryStatsResult, MemoryError>>;
  readonly bulkSet: (
    entries: Array<{ key: string; value: string; namespace?: string }>,
    namespace?: string
  ) => Promise<Result<MemoryEntry[], MemoryError>>;
  readonly dispose: () => Promise<void>;
}

/**
 * Create Memory Service (Factory Function)
 * Handles memory management with validation, caching, and business rules
 */
export const createMemoryService = (
  deps: MemoryServiceDeps,
  config: MemoryServiceConfig = {}
): MemoryService => {
  // Service configuration in closure
  const serviceConfig: MemoryServiceConfig = {
    defaultNamespace: 'default',
    enableCaching: true,
    cacheMaxSize: 1000,
    ...config,
  };

  // Mutable state in closure (will be updated immutably)
  let state: MemoryServiceState = {
    cache: createCache(),
    cleanupTimer: undefined,
  };

  // Helper: Update state immutably
  const updateState = (updates: Partial<MemoryServiceState>): void => {
    state = { ...state, ...updates };
  };

  /**
   * Get a memory value
   */
  const get = async (
    key: string,
    namespace: string = serviceConfig.defaultNamespace || 'default'
  ): Promise<Result<MemoryValue, MemoryErrorType>> => {
    return await tryCatchAsync(
      async () => {
        // Check cache first if enabled
        if (serviceConfig.enableCaching) {
          const cacheKey = `${namespace}:${key}`;
          // FUNCTIONAL: Use immutable cache get
          const cached = cacheGet(state.cache, cacheKey);
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
        const entry = await deps.repository.getByKey(key, namespace);

        if (!entry) {
          throw new MemoryNotFoundError(key, namespace);
        }

        // Cache the result if enabled
        if (serviceConfig.enableCaching) {
          updateCache(entry);
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
        deps.logger.error(`Failed to get memory entry: ${key}`, error);
        return new MemoryError(`Failed to get memory entry: ${key}`, error);
      }
    );
  };

  /**
   * Set a memory value
   */
  const set = async (
    key: string,
    value: string,
    namespace: string = serviceConfig.defaultNamespace || 'default'
  ): Promise<Result<MemoryEntry, MemoryErrorType>> => {
    return await tryCatchAsync(
      async () => {
        // Validate inputs
        const validationError = validateMemoryEntry(key, value);
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
        const entry = await deps.repository.setMemory(data);

        // Update cache if enabled
        if (serviceConfig.enableCaching) {
          updateCache(entry);
          enforceCacheLimit();
        }

        deps.logger.debug(`Memory entry set: ${key} in namespace: ${namespace}`);

        return entry;
      },
      (error) => {
        if (error instanceof MemoryValidationError || error instanceof MemorySizeError) {
          return error;
        }
        deps.logger.error(`Failed to set memory entry: ${key}`, error);
        return new MemoryError(`Failed to set memory entry: ${key}`, error);
      }
    );
  };

  /**
   * Delete a memory entry
   */
  const deleteEntry = async (
    key: string,
    namespace: string = serviceConfig.defaultNamespace || 'default'
  ): Promise<Result<boolean, MemoryError>> => {
    return await tryCatchAsync(
      async () => {
        const deleted = await deps.repository.deleteMemory(key, namespace);

        // Remove from cache if present
        if (serviceConfig.enableCaching) {
          const cacheKey = `${namespace}:${key}`;
          // FUNCTIONAL: Use immutable cache delete, returns new state
          updateState({ cache: cacheDelete(state.cache, cacheKey) });
        }

        deps.logger.debug(`Memory entry deleted: ${key} in namespace: ${namespace}`);

        return deleted;
      },
      (error) => {
        deps.logger.error(`Failed to delete memory entry: ${key}`, error);
        return new MemoryError(`Failed to delete memory entry: ${key}`, error);
      }
    );
  };

  /**
   * List all keys in a namespace
   */
  const list = async (
    namespace: string = serviceConfig.defaultNamespace || 'default'
  ): Promise<Result<string[], MemoryError>> => {
    return await tryCatchAsync(
      async () => {
        const keys = await deps.repository.listKeys(namespace);
        return keys;
      },
      (error) => {
        deps.logger.error(`Failed to list keys in namespace: ${namespace}`, error);
        return new MemoryError(`Failed to list keys in namespace: ${namespace}`, error);
      }
    );
  };

  /**
   * Search memory entries
   */
  const search = async (
    params: MemorySearchParams
  ): Promise<Result<MemoryEntry[], MemoryError>> => {
    return await tryCatchAsync(
      async () => {
        const entries = await deps.repository.searchMemory(params);
        return entries;
      },
      (error) => {
        deps.logger.error('Failed to search memory entries', error);
        return new MemoryError('Failed to search memory entries', error);
      }
    );
  };

  /**
   * Clear all entries in a namespace
   */
  const clear = async (
    namespace: string = serviceConfig.defaultNamespace || 'default'
  ): Promise<Result<number, MemoryError>> => {
    return await tryCatchAsync(
      async () => {
        const deletedCount = await deps.repository.clearNamespace(namespace);

        // Clear cache entries for this namespace
        if (serviceConfig.enableCaching) {
          // FUNCTIONAL: Use immutable cache deleteWhere, returns new state
          updateState({
            cache: cacheDeleteWhere(state.cache, (key) => key.startsWith(`${namespace}:`)),
          });
        }

        deps.logger.info(`Cleared ${deletedCount} entries from namespace: ${namespace}`);

        return deletedCount;
      },
      (error) => {
        deps.logger.error(`Failed to clear namespace: ${namespace}`, error);
        return new MemoryError(`Failed to clear namespace: ${namespace}`, error);
      }
    );
  };

  /**
   * Get memory statistics
   */
  const getStats = async (): Promise<Result<MemoryStatsResult, MemoryError>> => {
    return await tryCatchAsync(
      async () => {
        const stats = await deps.repository.getStats();

        return {
          totalEntries: stats.totalEntries,
          totalSize: stats.totalSize,
          namespaces: stats.namespaces,
          oldestEntry: stats.oldestEntry,
          newestEntry: stats.newestEntry,
        };
      },
      (error) => {
        deps.logger.error('Failed to get memory statistics', error);
        return new MemoryError('Failed to get memory statistics', error);
      }
    );
  };

  /**
   * Perform bulk operations
   */
  const bulkSet = async (
    entries: Array<{ key: string; value: string; namespace?: string }>,
    namespace: string = serviceConfig.defaultNamespace || 'default'
  ): Promise<Result<MemoryEntry[], MemoryError>> => {
    return await tryCatchAsync(
      async () => {
        const results: MemoryEntry[] = [];
        const errors: string[] = [];

        for (const entry of entries) {
          const result = await set(entry.key, entry.value, entry.namespace || namespace);
          if (result._tag === 'Success') {
            results.push(result.value);
          } else {
            errors.push(`${entry.key}: ${result.error.message}`);
          }
        }

        if (errors.length > 0) {
          deps.logger.warn(`Bulk set completed with ${errors.length} errors`, { errors });
          throw new MemoryError(`Bulk set completed with errors: ${errors.join('; ')}`);
        }

        return results;
      },
      (error) => {
        if (error instanceof MemoryError) {
          return error;
        }
        deps.logger.error('Failed to perform bulk set', error);
        return new MemoryError('Failed to perform bulk set', error);
      }
    );
  };

  /**
   * Validate memory entry data
   */
  const validateMemoryEntry = (
    key: string,
    value: string
  ): MemoryValidationError | MemorySizeError | null => {
    if (!key || key.trim().length === 0) {
      return new MemoryValidationError('Key cannot be empty', 'key', key);
    }

    if (key.length > 255) {
      return new MemoryValidationError('Key cannot exceed 255 characters', 'key', key);
    }

    if (serviceConfig.maxEntrySize && value.length > serviceConfig.maxEntrySize) {
      return new MemorySizeError(value.length, serviceConfig.maxEntrySize);
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
  };

  /**
   * Update cache with new entry
   * FUNCTIONAL: Returns new cache state instead of mutating
   */
  const updateCache = (entry: MemoryEntry): void => {
    const cacheKey = `${entry.namespace}:${entry.key}`;
    // FUNCTIONAL: Use immutable cache set, returns new state
    updateState({ cache: cacheSet(state.cache, cacheKey, entry) });
  };

  /**
   * Enforce cache size limit
   * FUNCTIONAL: Uses immutable cache operations
   */
  const enforceCacheLimit = (): void => {
    if (serviceConfig.cacheMaxSize && state.cache.size > serviceConfig.cacheMaxSize) {
      // FUNCTIONAL: Use immutable cache enforceLimit, returns new state
      const entriesToRemove = state.cache.size - serviceConfig.cacheMaxSize;
      updateState({ cache: cacheEnforceLimit(state.cache, serviceConfig.cacheMaxSize) });
      deps.logger.debug(`Cache eviction: removed ${entriesToRemove} entries`);
    }
  };

  /**
   * Setup cleanup timer for retention policy
   */
  const setupCleanupTimer = (): void => {
    if (serviceConfig.retentionPolicy?.enabled && serviceConfig.retentionPolicy.cleanupInterval) {
      const timer = setInterval(async () => {
        try {
          const deletedCount = await deps.repository.cleanupOldEntries(
            serviceConfig.retentionPolicy?.maxAge
          );
          if (deletedCount > 0) {
            deps.logger.info(`Automatic cleanup: removed ${deletedCount} old entries`);
          }
        } catch (error) {
          deps.logger.error('Automatic cleanup failed', error);
        }
      }, serviceConfig.retentionPolicy.cleanupInterval);
      updateState({ cleanupTimer: timer });
    }
  };

  /**
   * Cleanup resources
   */
  const dispose = async (): Promise<void> => {
    if (state.cleanupTimer) {
      clearInterval(state.cleanupTimer);
      updateState({ cleanupTimer: undefined });
    }

    // FUNCTIONAL: Replace cache with new empty cache instead of clearing
    updateState({ cache: createCache() });
    deps.logger.info('Memory service disposed');
  };

  // Initialize cleanup timer
  setupCleanupTimer();

  // Return service interface
  return {
    get,
    set,
    delete: deleteEntry,
    list,
    search,
    clear,
    getStats,
    bulkSet,
    dispose,
  };
};
