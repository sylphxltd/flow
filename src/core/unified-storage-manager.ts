/**
 * Unified Storage Manager Implementation
 * Provides a single interface for all storage operations
 */

import type {
  BatchOperation,
  BatchResult,
  CacheStorageAdapter,
  MemoryStorageAdapter,
  StorageAdapter,
  StorageConfig,
  StorageFactory,
  StorageManager,
  StorageResult,
  VectorStorageAdapter,
} from '../interfaces/unified-storage.js';
import { logger } from '../utils/logger.js';

/**
 * Default storage factory implementation
 */
export class DefaultStorageFactory implements StorageFactory {
  private adapters = new Map<string, new (config: StorageConfig) => StorageAdapter>();

  constructor() {
    this.registerDefaultAdapters();
  }

  async create<T = unknown>(config: StorageConfig): Promise<StorageAdapter<T>> {
    const AdapterClass = this.adapters.get(config.type);
    if (!AdapterClass) {
      throw new Error(`Unknown storage type: ${config.type}`);
    }

    try {
      const adapter = new AdapterClass(config);
      await adapter.initialize();
      logger.info('Storage adapter created', { type: config.type, config });
      return adapter as StorageAdapter<T>;
    } catch (error) {
      logger.error('Failed to create storage adapter', {
        type: config.type,
        config,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  register(type: string, adapter: new (config: StorageConfig) => StorageAdapter): void {
    this.adapters.set(type, adapter);
    logger.info('Storage adapter registered', { type });
  }

  getAvailableTypes(): string[] {
    return Array.from(this.adapters.keys());
  }

  private registerDefaultAdapters(): void {
    // Will be populated with actual adapter implementations
    // This is where we'll register MemoryAdapter, CacheAdapter, etc.
  }
}

/**
 * Default storage manager implementation
 */
export class DefaultStorageManager implements StorageManager {
  private adapters = new Map<string, StorageAdapter>();
  private factory: StorageFactory;

  constructor(factory?: StorageFactory) {
    this.factory = factory || new DefaultStorageFactory();
  }

  get<T = unknown>(name: string): StorageAdapter<T> | null {
    return (this.adapters.get(name) as StorageAdapter<T>) || null;
  }

  register<T = unknown>(name: string, adapter: StorageAdapter<T>): void {
    if (this.adapters.has(name)) {
      logger.warn('Storage adapter already exists, replacing', { name });
    }
    this.adapters.set(name, adapter);
    logger.info('Storage adapter registered', { name, type: adapter.type });
  }

  unregister(name: string): boolean {
    const existed = this.adapters.has(name);
    if (existed) {
      const adapter = this.adapters.get(name)!;
      adapter.close().catch((error) => {
        logger.error('Error closing storage adapter during unregistration', {
          name,
          error: (error as Error).message,
        });
      });
      this.adapters.delete(name);
      logger.info('Storage adapter unregistered', { name });
    }
    return existed;
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.adapters.entries()).map(async ([name, adapter]) => {
      try {
        await adapter.close();
        logger.info('Storage adapter closed', { name });
      } catch (error) {
        logger.error('Error closing storage adapter', {
          name,
          error: (error as Error).message,
        });
      }
    });

    await Promise.allSettled(closePromises);
    this.adapters.clear();
    logger.info('All storage adapters closed');
  }

  /**
   * Create and register a storage adapter from configuration
   */
  async createFromConfig<T = unknown>(
    name: string,
    config: StorageConfig
  ): Promise<StorageAdapter<T>> {
    const adapter = await this.factory.create<T>(config);
    this.register(name, adapter);
    return adapter;
  }
}

/**
 * Storage utilities
 */
export class StorageUtils {
  /**
   * Execute storage operation with error handling and timing
   */
  static async executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<StorageResult<T>> {
    const startTime = Date.now();
    try {
      const data = await operation();
      const duration = Date.now() - startTime;

      logger.debug('Storage operation completed', {
        operation: operationName,
        duration,
      });

      return {
        success: true,
        data,
        metadata: {
          operation: operationName,
          duration,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      logger.error('Storage operation failed', {
        operation: operationName,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: errorMessage,
          details: { operation: operationName },
        },
        metadata: {
          operation: operationName,
          duration,
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Execute batch operations
   */
  static async executeBatch<T>(
    operations: BatchOperation[],
    executor: (operation: BatchOperation) => Promise<StorageResult<T>>
  ): Promise<BatchResult<T>> {
    const startTime = Date.now();
    const results: StorageResult[] = [];

    // Execute operations in parallel for better performance
    const operationPromises = operations.map(async (operation) => {
      try {
        const result = await executor(operation);
        results.push(result);
        return result;
      } catch (error) {
        const errorResult: StorageResult = {
          success: false,
          error: {
            code: 'BATCH_ERROR',
            message: (error as Error).message,
            details: { operation },
          },
        };
        results.push(errorResult);
        return errorResult;
      }
    });

    await Promise.allSettled(operationPromises);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;
    const duration = Date.now() - startTime;

    const successfulData = results
      .filter((r) => r.success && r.data !== undefined)
      .map((r) => r.data as T);

    logger.info('Batch operations completed', {
      totalOperations: operations.length,
      successCount,
      failureCount,
      duration,
    });

    return {
      success: failureCount === 0,
      data: successfulData,
      results,
      successCount,
      failureCount,
      metadata: {
        operation: 'batch',
        duration,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Create storage configuration from environment variables
   */
  static createConfigFromEnv(type: string): StorageConfig {
    const config: StorageConfig = { type };

    // Load configuration from environment variables
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    if (connectionString) {
      config.connectionString = connectionString;
    }

    const storageDir = process.env.STORAGE_DIR;
    if (storageDir) {
      config.storageDir = storageDir;
    }

    const defaultTTL = process.env.CACHE_DEFAULT_TTL;
    if (defaultTTL) {
      config.defaultTTL = Number.parseInt(defaultTTL, 10);
    }

    const maxCacheSize = process.env.CACHE_MAX_SIZE;
    if (maxCacheSize) {
      config.maxCacheSize = Number.parseInt(maxCacheSize, 10);
    }

    const vectorDimensions = process.env.VECTOR_DIMENSIONS;
    if (vectorDimensions) {
      config.vectorDimensions = Number.parseInt(vectorDimensions, 10);
    }

    return config;
  }
}

// Global storage manager instance
export const storageManager = new DefaultStorageManager();

/**
 * Convenience functions for global storage operations
 */
export async function getStorage<T = unknown>(name: string): Promise<StorageAdapter<T> | null> {
  return storageManager.get<T>(name);
}

export async function createStorage<T = unknown>(
  name: string,
  config: StorageConfig
): Promise<StorageAdapter<T>> {
  return storageManager.createFromConfig<T>(name, config);
}

export async function closeAllStorage(): Promise<void> {
  return storageManager.closeAll();
}
