/**
 * Unified Storage Interface - 統一存儲接口
 * Consolidates all storage implementations under a single, type-safe interface
 */

import type {
  CacheStats,
  CacheStorage,
  Storage,
  VectorDocument,
  VectorSearchResult,
  VectorStorage,
} from '../interfaces/storage.js';

/**
 * Unified storage configuration
 */
export interface StorageConfig {
  /** Storage backend type */
  type: 'memory' | 'cache' | 'vector' | 'drizzle';
  /** Database connection string (if applicable) */
  connectionString?: string;
  /** Default TTL for cache operations (seconds) */
  defaultTTL?: number;
  /** Maximum cache size */
  maxCacheSize?: number;
  /** Vector dimensions for embeddings */
  vectorDimensions?: number;
  /** Storage directory for file-based databases */
  storageDir?: string;
}

/**
 * Storage adapter base interface
 */
export interface StorageAdapter<T = unknown> extends Storage<T> {
  /** Storage type identifier */
  readonly type: string;
  /** Initialize the storage adapter */
  initialize(): Promise<void>;
  /** Close the storage adapter */
  close(): Promise<void>;
  /** Get storage statistics */
  getStats(): Promise<Record<string, unknown>>;
}

/**
 * Memory storage adapter interface
 */
export interface MemoryStorageAdapter extends StorageAdapter {
  /** Store a value with optional namespace */
  set(key: string, value: unknown, namespace?: string): Promise<void>;
  /** Retrieve a value with optional namespace */
  get(key: string, namespace?: string): Promise<unknown>;
  /** Delete a value with optional namespace */
  delete(key: string, namespace?: string): Promise<boolean>;
  /** List all keys in namespace */
  keys(namespace?: string): Promise<string[]>;
  /** Clear namespace or all data */
  clear(namespace?: string): Promise<void>;
}

/**
 * Cache storage adapter interface
 */
export interface CacheStorageAdapter extends StorageAdapter, Omit<CacheStorage, 'get' | 'set'> {
  /** Store with TTL override */
  setWithTTL(key: string, value: unknown, ttl?: number): Promise<void>;
  /** Get with TTL information */
  getWithTTL(key: string): Promise<{ value: unknown; ttl: number } | null>;
  /** Clean up expired entries */
  cleanup(): Promise<number>;
  /** Get cache statistics */
  getCacheStats(): Promise<CacheStats>;
}

/**
 * Vector storage adapter interface
 */
export interface VectorStorageAdapter extends StorageAdapter<VectorDocument>, VectorStorage {
  /** Batch add documents */
  addBatch(documents: VectorDocument[]): Promise<void>;
  /** Search with filters */
  searchWithFilters(
    query: number[],
    filters?: Record<string, unknown>,
    limit?: number
  ): Promise<VectorSearchResult[]>;
  /** Get documents by metadata */
  getByMetadata(metadata: Record<string, unknown>): Promise<VectorDocument[]>;
  /** Update document metadata */
  updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void>;
}

/**
 * Storage factory interface
 */
export interface StorageFactory {
  /** Create storage adapter from configuration */
  create<T = unknown>(config: StorageConfig): Promise<StorageAdapter<T>>;
  /** Register custom storage adapter */
  register(type: string, adapter: new (config: StorageConfig) => StorageAdapter): void;
  /** Get available storage types */
  getAvailableTypes(): string[];
}

/**
 * Storage manager interface
 */
export interface StorageManager {
  /** Get storage adapter by name */
  get<T = unknown>(name: string): StorageAdapter<T> | null;
  /** Register storage adapter with name */
  register<T = unknown>(name: string, adapter: StorageAdapter<T>): void;
  /** Remove storage adapter */
  unregister(name: string): boolean;
  /** List all registered storage adapters */
  list(): string[];
  /** Close all storage adapters */
  closeAll(): Promise<void>;
}

/**
 * Storage operation result
 */
export interface StorageResult<T = unknown> {
  /** Operation success status */
  success: boolean;
  /** Operation result data */
  data?: T;
  /** Error information if failed */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  /** Operation metadata */
  metadata?: {
    operation: string;
    duration: number;
    timestamp: number;
  };
}

/**
 * Batch storage operation
 */
export interface BatchOperation {
  /** Operation type */
  type: 'set' | 'delete' | 'get';
  /** Operation key */
  key: string;
  /** Operation value (for set operations) */
  value?: unknown;
  /** Namespace (optional) */
  namespace?: string;
}

/**
 * Batch storage result
 */
export interface BatchResult<T = unknown> extends StorageResult<T[]> {
  /** Individual operation results */
  results: StorageResult[];
  /** Count of successful operations */
  successCount: number;
  /** Count of failed operations */
  failureCount: number;
}
