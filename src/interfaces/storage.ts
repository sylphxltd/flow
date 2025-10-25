/**
 * Storage module interfaces
 * Defines contracts for storage and database operations
 */

/**
 * Generic storage interface
 */
export interface Storage<T = unknown> {
  /**
   * Get an item by key
   */
  get(key: string): Promise<T | null>;

  /**
   * Set an item with key and value
   */
  set(key: string, value: T): Promise<void>;

  /**
   * Delete an item by key
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Clear all items
   */
  clear(): Promise<void>;

  /**
   * Get all keys
   */
  keys(): Promise<string[]>;

  /**
   * Get storage size
   */
  size(): Promise<number>;
}

/**
 * Vector storage interface for embeddings
 */
export interface VectorStorage {
  /**
   * Add vector document
   */
  add(document: VectorDocument): Promise<void>;

  /**
   * Search for similar vectors
   */
  search(query: number[], limit?: number): Promise<VectorSearchResult[]>;

  /**
   * Delete document by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Update document
   */
  update(id: string, document: VectorDocument): Promise<void>;

  /**
   * Get document by ID
   */
  get(id: string): Promise<VectorDocument | null>;
}

/**
 * Vector document interface
 */
export interface VectorDocument {
  /**
   * Document ID
   */
  id: string;

  /**
   * Document content
   */
  content: string;

  /**
   * Vector embedding
   */
  embedding: number[];

  /**
   * Document metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  /**
   * Document
   */
  document: VectorDocument;

  /**
   * Similarity score (0-1)
   */
  score: number;

  /**
   * Distance from query vector
   */
  distance: number;
}

/**
 * Cache storage interface
 */
export interface CacheStorage extends Storage {
  /**
   * Get item with TTL check
   */
  getWithTTL(key: string): Promise<{ value: unknown; ttl: number } | null>;

  /**
   * Set item with TTL
   */
  setWithTTL(key: string, value: unknown, ttl: number): Promise<void>;

  /**
   * Clean up expired items
   */
  cleanup(): Promise<number>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /**
   * Total items in cache
   */
  totalItems: number;

  /**
   * Expired items
   */
  expiredItems: number;

  /**
   * Hit rate
   */
  hitRate: number;

  /**
   * Miss rate
   */
  missRate: number;

  /**
   * Cache size in bytes
   */
  sizeBytes: number;
}
