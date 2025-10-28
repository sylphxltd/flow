/**
 * Storage Migration Utilities
 * Helps transition from old storage implementations to the unified system
 */

import type { StorageAdapter, StorageConfig } from '../interfaces/unified-storage.js';
import { storageManager, storageFactory } from '../core/unified-storage-manager.js';
import { createMemoryStorage, createCacheStorage, createVectorStorage } from '../core/storage-factory.js';
import { MemoryStorage } from './memory-storage.js';
import { CacheStorage } from './cache-storage.js';
import { SeparatedMemoryStorage } from './separated-storage.js';
import { logger } from './logger.js';

/**
 * Migration configuration
 */
export interface MigrationConfig {
  /** Name for the new unified storage */
  name: string;
  /** Type of storage to create */
  type: 'memory' | 'cache' | 'vector' | 'drizzle';
  /** Storage configuration */
  config?: Partial<StorageConfig>;
  /** Whether to migrate data from old storage */
  migrateData?: boolean;
  /** Old storage instance to migrate from */
  oldStorage?: MemoryStorage | CacheStorage | SeparatedMemoryStorage;
}

/**
 * Storage migration result
 */
export interface MigrationResult {
  /** Migration success status */
  success: boolean;
  /** New storage adapter */
  storage?: StorageAdapter;
  /** Number of items migrated */
  itemsMigrated?: number;
  /** Migration duration in milliseconds */
  duration: number;
  /** Error if migration failed */
  error?: string;
}

/**
 * Storage migration helper
 */
export class StorageMigration {
  /**
   * Migrate from old memory storage to unified storage
   */
  static async migrateMemoryStorage(config: MigrationConfig): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting memory storage migration', { config });

      // Create new unified storage
      const newStorage = await this.createStorage(config.type, config.config);

      // Migrate data if requested
      let itemsMigrated = 0;
      if (config.migrateData && config.oldStorage) {
        itemsMigrated = await this.migrateMemoryData(config.oldStorage as MemoryStorage, newStorage);
      }

      // Register the new storage
      storageManager.register(config.name, newStorage);

      const duration = Date.now() - startTime;
      logger.info('Memory storage migration completed', {
        name: config.name,
        itemsMigrated,
        duration,
      });

      return {
        success: true,
        storage: newStorage,
        itemsMigrated,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      logger.error('Memory storage migration failed', {
        config,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * Migrate from old cache storage to unified storage
   */
  static async migrateCacheStorage(config: MigrationConfig): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting cache storage migration', { config });

      // Create new unified storage
      const newStorage = await this.createStorage(config.type, config.config);

      // Migrate data if requested
      let itemsMigrated = 0;
      if (config.migrateData && config.oldStorage) {
        itemsMigrated = await this.migrateCacheData(config.oldStorage as CacheStorage, newStorage);
      }

      // Register the new storage
      storageManager.register(config.name, newStorage);

      const duration = Date.now() - startTime;
      logger.info('Cache storage migration completed', {
        name: config.name,
        itemsMigrated,
        duration,
      });

      return {
        success: true,
        storage: newStorage,
        itemsMigrated,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      logger.error('Cache storage migration failed', {
        config,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * Migrate from separated storage to unified storage
   */
  static async migrateSeparatedStorage(
    memoryConfig: MigrationConfig,
    cacheConfig: MigrationConfig
  ): Promise<{
    memory: MigrationResult;
    cache: MigrationResult;
  }> {
    logger.info('Starting separated storage migration', {
      memoryConfig,
      cacheConfig,
    });

    const [memoryResult, cacheResult] = await Promise.all([
      this.migrateMemoryStorage(memoryConfig),
      this.migrateCacheStorage(cacheConfig),
    ]);

    logger.info('Separated storage migration completed', {
      memorySuccess: memoryResult.success,
      cacheSuccess: cacheResult.success,
      totalItemsMigrated: (memoryResult.itemsMigrated || 0) + (cacheResult.itemsMigrated || 0),
    });

    return {
      memory: memoryResult,
      cache: cacheResult,
    };
  }

  /**
   * Create a storage adapter
   */
  private static async createStorage(
    type: string,
    config?: Partial<StorageConfig>
  ): Promise<StorageAdapter> {
    switch (type) {
      case 'memory':
        return createMemoryStorage(config);
      case 'cache':
        return createCacheStorage(config);
      case 'vector':
        return createVectorStorage(config);
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }

  /**
   * Migrate data from old memory storage
   */
  private static async migrateMemoryData(
    oldStorage: MemoryStorage,
    newStorage: StorageAdapter
  ): Promise<number> {
    logger.debug('Starting memory data migration');

    // Get all keys from old storage
    const keys = await oldStorage.keys();
    let migratedCount = 0;

    // Migrate data in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const migrationPromises = batch.map(async (key) => {
        try {
          const value = await oldStorage.get(key);
          if (value !== null) {
            await newStorage.set(key, value);
            return true;
          }
          return false;
        } catch (error) {
          logger.warn('Failed to migrate memory entry', {
            key,
            error: (error as Error).message,
          });
          return false;
        }
      });

      const results = await Promise.allSettled(migrationPromises);
      migratedCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length;

      logger.debug('Memory migration batch completed', {
        batchIndex: Math.floor(i / batchSize),
        batchSize: batch.length,
        migratedInBatch: results.filter(r => r.status === 'fulfilled' && r.value === true).length,
      });
    }

    logger.info('Memory data migration completed', {
      totalKeys: keys.length,
      migratedCount,
    });

    return migratedCount;
  }

  /**
   * Migrate data from old cache storage
   */
  private static async migrateCacheData(
    oldStorage: CacheStorage,
    newStorage: StorageAdapter
  ): Promise<number> {
    logger.debug('Starting cache data migration');

    // Get all keys from old storage
    const keys = await oldStorage.keys();
    let migratedCount = 0;

    // Migrate data in batches
    const batchSize = 100;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const migrationPromises = batch.map(async (key) => {
        try {
          const result = await oldStorage.getWithTTL(key);
          if (result !== null) {
            // Preserve TTL if the new storage supports it
            if ('setWithTTL' in newStorage && typeof newStorage.setWithTTL === 'function') {
              await (newStorage as any).setWithTTL(key, result.value, result.ttl);
            } else {
              await newStorage.set(key, result.value);
            }
            return true;
          }
          return false;
        } catch (error) {
          logger.warn('Failed to migrate cache entry', {
            key,
            error: (error as Error).message,
          });
          return false;
        }
      });

      const results = await Promise.allSettled(migrationPromises);
      migratedCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length;

      logger.debug('Cache migration batch completed', {
        batchIndex: Math.floor(i / batchSize),
        batchSize: batch.length,
        migratedInBatch: results.filter(r => r.status === 'fulfilled' && r.value === true).length,
      });
    }

    logger.info('Cache data migration completed', {
      totalKeys: keys.length,
      migratedCount,
    });

    return migratedCount;
  }

  /**
   * Validate migration configuration
   */
  static validateConfig(config: MigrationConfig): void {
    if (!config.name) {
      throw new Error('Migration config must have a name');
    }

    if (!config.type) {
      throw new Error('Migration config must have a type');
    }

    if (config.migrateData && !config.oldStorage) {
      throw new Error('oldStorage is required when migrateData is true');
    }

    const validTypes = ['memory', 'cache', 'vector', 'drizzle'];
    if (!validTypes.includes(config.type)) {
      throw new Error(`Invalid storage type: ${config.type}. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Create migration configuration for common scenarios
   */
  static createMigrationConfigs(): {
    memory: (name: string, oldStorage?: MemoryStorage) => MigrationConfig;
    cache: (name: string, oldStorage?: CacheStorage) => MigrationConfig;
    separated: (memoryName: string, cacheName: string, oldStorage?: SeparatedMemoryStorage) => {
      memory: MigrationConfig;
      cache: MigrationConfig;
    };
  } {
    return {
      memory: (name: string, oldStorage?: MemoryStorage) => ({
        name,
        type: 'memory',
        migrateData: !!oldStorage,
        oldStorage,
      }),

      cache: (name: string, oldStorage?: CacheStorage) => ({
        name,
        type: 'cache',
        migrateData: !!oldStorage,
        oldStorage,
      }),

      separated: (memoryName: string, cacheName: string, oldStorage?: SeparatedMemoryStorage) => ({
        memory: {
          name: memoryName,
          type: 'memory',
          migrateData: !!oldStorage,
          oldStorage,
        },
        cache: {
          name: cacheName,
          type: 'cache',
          migrateData: !!oldStorage,
          oldStorage,
        },
      }),
    };
  }
}

/**
 * Convenience function for quick migration
 */
export async function migrateToUnifiedStorage(
  oldStorage: MemoryStorage | CacheStorage | SeparatedMemoryStorage,
  newName: string
): Promise<MigrationResult> {
  if (oldStorage instanceof MemoryStorage) {
    return StorageMigration.migrateMemoryStorage({
      name: newName,
      type: 'memory',
      migrateData: true,
      oldStorage,
    });
  } else if (oldStorage instanceof CacheStorage) {
    return StorageMigration.migrateCacheStorage({
      name: newName,
      type: 'cache',
      migrateData: true,
      oldStorage,
    });
  } else if (oldStorage instanceof SeparatedMemoryStorage) {
    const configs = StorageMigration.createMigrationConfigs().separated(
      `${newName}-memory`,
      `${newName}-cache`,
      oldStorage
    );
    const results = await StorageMigration.migrateSeparatedStorage(
      configs.memory,
      configs.cache
    );
    // Return combined result
    return {
      success: results.memory.success && results.cache.success,
      itemsMigrated: (results.memory.itemsMigrated || 0) + (results.cache.itemsMigrated || 0),
      duration: results.memory.duration + results.cache.duration,
      error: results.memory.error || results.cache.error,
    };
  } else {
    throw new Error('Unsupported storage type for migration');
  }
}