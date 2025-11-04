/**
 * Storage Factory - 簡化存儲工廠
 * Feature-first, composable approach
 */

import type { StorageConfig } from '../interfaces/unified-storage.js';
import { createStorage } from './unified-storage.js';
import { logger } from '../utils/logger.js';

/**
 * Storage configuration builders
 */
export const StorageConfig = {
  memory: (options?: Partial<StorageConfig>): StorageConfig => ({
    type: 'memory',
    ...options,
  }),

  cache: (options?: {
    defaultTTL?: number;
    maxCacheSize?: number;
    storageDir?: string;
  }): StorageConfig => ({
    type: 'cache',
    defaultTTL: options?.defaultTTL || 3600,
    maxCacheSize: options?.maxCacheSize,
    storageDir: options?.storageDir,
  }),

  vector: (options?: {
    vectorDimensions?: number;
    connectionString?: string;
    storageDir?: string;
  }): StorageConfig => ({
    type: 'vector',
    vectorDimensions: options?.vectorDimensions || 1536,
    connectionString: options?.connectionString,
    storageDir: options?.storageDir,
  }),
} as const;

/**
 * Create storage from configuration
 */
export async function createStorageFromConfig<T = unknown>(config: StorageConfig) {
  try {
    const storage = createStorage<T>(config);
    await storage.initialize();
    logger.info('Storage created successfully', { type: config.type });
    return storage;
  } catch (error) {
    logger.error('Failed to create storage', { type: config.type, error });
    throw error;
  }
}

/**
 * Convenience functions for creating storage
 */
export async function createMemoryStorage<T = unknown>(options?: Partial<StorageConfig>) {
  return createStorageFromConfig<T>(StorageConfig.memory(options));
}

export async function createCacheStorage<T = unknown>(options?: {
  defaultTTL?: number;
  maxCacheSize?: number;
  storageDir?: string;
}) {
  return createStorageFromConfig<T>(StorageConfig.cache(options));
}

export async function createVectorStorage<T = unknown>(options?: {
  vectorDimensions?: number;
  connectionString?: string;
  storageDir?: string;
}) {
  return createStorageFromConfig<T>(StorageConfig.vector(options));
}

/**
 * Create storage from environment configuration
 */
export async function createStorageFromEnv<T = unknown>(type?: string): Promise<any> {
  const storageType = type || process.env.STORAGE_TYPE || 'memory';

  const config: StorageConfig = { type: storageType as any };

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

  return createStorageFromConfig<T>(config);
}