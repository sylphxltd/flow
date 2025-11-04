/**
 * Unified Storage - 統一存儲層
 * Feature-first, composable, functional approach
 */

import type { StorageConfig } from '../interfaces/unified-storage.js';
import { logger } from '../utils/logger.js';

/**
 * Base storage interface with functional approach
 */
export interface BaseStorage<T = unknown> {
  readonly type: string;
  initialize(): Promise<void>;
  close(): Promise<void>;
  getStats(): Promise<Record<string, unknown>>;

  // Core storage operations
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

/**
 * Memory storage implementation
 */
export class MemoryStorage<T = unknown> implements BaseStorage<T> {
  readonly type = 'memory';
  private data = new Map<string, T>();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    logger.debug('Memory storage initialized');
  }

  async close(): Promise<void> {
    this.data.clear();
    this.initialized = false;
    logger.debug('Memory storage closed');
  }

  async getStats(): Promise<Record<string, unknown>> {
    return {
      type: this.type,
      size: this.data.size,
      initialized: this.initialized,
    };
  }

  async get(key: string): Promise<T | null> {
    const value = this.data.get(key);
    // Return deep copy for objects to ensure immutability
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return JSON.parse(JSON.stringify(value));
    }
    if (Array.isArray(value)) {
      return [...value] as T;
    }
    return value;
  }

  async set(key: string, value: T): Promise<void> {
    // Store deep copy to ensure immutability
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      this.data.set(key, JSON.parse(JSON.stringify(value)));
    } else if (Array.isArray(value)) {
      this.data.set(key, [...value] as T);
    } else {
      this.data.set(key, value);
    }
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.data.keys());
  }

  async size(): Promise<number> {
    return this.data.size;
  }
}

/**
 * Cache storage with TTL support
 */
export class CacheStorage<T = unknown> implements BaseStorage<T> {
  readonly type = 'cache';
  private data = new Map<string, { value: T; expires: number }>();
  private defaultTTL: number;
  private initialized = false;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: StorageConfig) {
    this.defaultTTL = config.defaultTTL ?? 3600; // 1 hour default
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.startCleanupTimer();
    logger.debug('Cache storage initialized', { defaultTTL: this.defaultTTL });
  }

  async close(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.data.clear();
    this.initialized = false;
    logger.debug('Cache storage closed');
  }

  async getStats(): Promise<Record<string, unknown>> {
    const now = Date.now();
    const expired = Array.from(this.data.values()).filter(item => item.expires <= now).length;

    return {
      type: this.type,
      size: this.data.size,
      expiredItems: expired,
      initialized: this.initialized,
      defaultTTL: this.defaultTTL,
    };
  }

  private startCleanupTimer(): void {
    // Clean up expired items every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('Cache cleanup error:', error);
      });
    }, 5 * 60 * 1000);
  }

  async get(key: string): Promise<T | null> {
    const item = this.data.get(key);
    if (!item) return null;

    if (item.expires <= Date.now()) {
      this.data.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const expires = Date.now() + (ttl ?? this.defaultTTL) * 1000;
    this.data.set(key, { value, expires });
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = this.data.get(key);
    if (!item) return false;

    if (item.expires <= Date.now()) {
      this.data.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async keys(): Promise<string[]> {
    const now = Date.now();
    return Array.from(this.data.keys()).filter(key => {
      const item = this.data.get(key);
      return item && item.expires > now;
    });
  }

  async size(): Promise<number> {
    const now = Date.now();
    return Array.from(this.data.values()).filter(item => item.expires > now).length;
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.data.entries()) {
      if (item.expires <= now) {
        this.data.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Cache-specific methods
  async getWithTTL(key: string): Promise<{ value: T; ttl: number } | null> {
    const item = this.data.get(key);
    if (!item) return null;

    const now = Date.now();
    if (item.expires <= now) {
      this.data.delete(key);
      return null;
    }

    const ttl = Math.floor((item.expires - now) / 1000);
    return { value: item.value, ttl };
  }

  async setWithTTL(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, value, ttl);
  }
}

/**
 * Vector storage for embeddings
 */
export class VectorStorage implements BaseStorage<{
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}> {
  readonly type = 'vector';
  private documents = new Map<string, {
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }>();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    logger.debug('Vector storage initialized');
  }

  async close(): Promise<void> {
    this.documents.clear();
    this.initialized = false;
    logger.debug('Vector storage closed');
  }

  async getStats(): Promise<Record<string, unknown>> {
    return {
      type: this.type,
      documentCount: this.documents.size,
      initialized: this.initialized,
    };
  }

  async get(key: string): Promise<{
    id: string;
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  } | null> {
    const doc = this.documents.get(key);
    return doc ? { id: key, ...doc } : null;
  }

  async set(
    key: string,
    value: {
      content: string;
      embedding: number[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    this.documents.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.documents.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.documents.has(key);
  }

  async clear(): Promise<void> {
    this.documents.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.documents.keys());
  }

  async size(): Promise<number> {
    return this.documents.size;
  }

  // Vector-specific methods implementing the interface
  async add(document: {
    id: string;
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.documents.set(document.id, {
      content: document.content,
      embedding: document.embedding,
      metadata: document.metadata,
    });
  }

  async update(id: string, document: {
    id: string;
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.documents.has(id)) {
      throw new Error(`Document not found: ${id}`);
    }
    this.documents.set(id, {
      content: document.content,
      embedding: document.embedding,
      metadata: document.metadata,
    });
  }

  async search(
    query: number[],
    limit = 10
  ): Promise<Array<{
    document: {
      id: string;
      content: string;
      embedding: number[];
      metadata?: Record<string, unknown>;
    };
    score: number;
    distance: number;
  }>> {
    const results = Array.from(this.documents.entries())
      .map(([id, doc]) => ({
        document: { id, ...doc },
        score: this.cosineSimilarity(query, doc.embedding),
        distance: this.euclideanDistance(query, doc.embedding),
      }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
  }

  private euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }
}

/**
 * Storage factory function - functional approach
 */
export function createStorage<T = unknown>(config: StorageConfig): BaseStorage<T> {
  switch (config.type) {
    case 'memory':
      return new MemoryStorage<T>();
    case 'cache':
      return new CacheStorage<T>(config) as BaseStorage<T>;
    case 'vector':
      return new VectorStorage() as BaseStorage<T>;
    default:
      throw new Error(`Unsupported storage type: ${config.type}`);
  }
}

/**
 * Storage type guards
 */
export const StorageTypes = {
  isMemory: (storage: BaseStorage): storage is MemoryStorage => storage.type === 'memory',
  isCache: (storage: BaseStorage): storage is CacheStorage => storage.type === 'cache',
  isVector: (storage: BaseStorage): storage is VectorStorage => storage.type === 'vector',
} as const;

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