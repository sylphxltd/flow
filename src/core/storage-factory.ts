/**
 * Storage Factory Implementation
 * Creates and manages storage adapters with proper registration
 */

import { CacheStorageAdapter } from '../adapters/cache-storage-adapter.js';
import { MemoryStorageAdapter } from '../adapters/memory-storage-adapter.js';
import { VectorStorageAdapter } from '../adapters/vector-storage-adapter.js';
import type {
  StorageAdapter,
  StorageConfig,
  StorageFactory,
} from '../interfaces/unified-storage.js';
import { logger } from '../utils/logger.js';
import { DefaultStorageFactory } from './unified-storage-manager.js';

/**
 * Enhanced storage factory with all adapters pre-registered
 */
export class StorageFactoryImpl extends DefaultStorageFactory {
  constructor() {
    super();
    this.registerBuiltinAdapters();
  }

  private registerBuiltinAdapters(): void {
    // Register memory storage adapter
    this.register('memory', MemoryStorageAdapter);
    logger.debug('Memory storage adapter registered');

    // Register cache storage adapter
    this.register('cache', CacheStorageAdapter);
    logger.debug('Cache storage adapter registered');

    // Register vector storage adapter
    this.register('vector', VectorStorageAdapter);
    logger.debug('Vector storage adapter registered');

    // Drizzle adapter will be added when we implement it
    // this.register('drizzle', DrizzleStorageAdapter);

    logger.info('All builtin storage adapters registered', {
      types: this.getAvailableTypes(),
    });
  }
}

/**
 * Create storage configurations for common use cases
 */
export class StorageConfigBuilder {
  /**
   * Create memory storage configuration
   */
  static memory(options?: Partial<StorageConfig>): StorageConfig {
    return {
      type: 'memory',
      ...options,
    };
  }

  /**
   * Create cache storage configuration
   */
  static cache(options?: {
    defaultTTL?: number;
    maxCacheSize?: number;
    storageDir?: string;
  }): StorageConfig {
    return {
      type: 'cache',
      defaultTTL: options?.defaultTTL || 3600, // 1 hour
      maxCacheSize: options?.maxCacheSize,
      storageDir: options?.storageDir,
    };
  }

  /**
   * Create vector storage configuration
   */
  static vector(options?: {
    vectorDimensions?: number;
    connectionString?: string;
    storageDir?: string;
  }): StorageConfig {
    return {
      type: 'vector',
      vectorDimensions: options?.vectorDimensions || 1536,
      connectionString: options?.connectionString,
      storageDir: options?.storageDir,
    };
  }

  /**
   * Create drizzle storage configuration
   */
  static drizzle(options?: {
    connectionString?: string;
    storageDir?: string;
  }): StorageConfig {
    return {
      type: 'drizzle',
      connectionString: options?.connectionString,
      storageDir: options?.storageDir,
    };
  }
}

/**
 * Storage factory singleton
 */
export const storageFactory = new StorageFactoryImpl();

/**
 * Convenience functions for creating storage adapters
 */
export async function createMemoryStorage(
  config?: Partial<StorageConfig>
): Promise<StorageAdapter> {
  const finalConfig = StorageConfigBuilder.memory(config);
  return storageFactory.create(finalConfig);
}

export async function createCacheStorage(options?: {
  defaultTTL?: number;
  maxCacheSize?: number;
  storageDir?: string;
}): Promise<StorageAdapter> {
  const config = StorageConfigBuilder.cache(options);
  return storageFactory.create(config);
}

export async function createVectorStorage(options?: {
  vectorDimensions?: number;
  connectionString?: string;
  storageDir?: string;
}): Promise<StorageAdapter> {
  const config = StorageConfigBuilder.vector(options);
  return storageFactory.create(config);
}

export async function createDrizzleStorage(options?: {
  connectionString?: string;
  storageDir?: string;
}): Promise<StorageAdapter> {
  const config = StorageConfigBuilder.drizzle(options);
  return storageFactory.create(config);
}

/**
 * Create storage from environment configuration
 */
export async function createStorageFromEnv(type: string): Promise<StorageAdapter> {
  const config = createConfigFromEnv(type);
  return storageFactory.create(config);
}

/**
 * Create storage configuration from environment variables
 */
export function createConfigFromEnv(type: string): StorageConfig {
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
