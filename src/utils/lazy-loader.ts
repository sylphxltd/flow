/**
 * Lazy Loading Utility
 *
 * Provides lazy loading for expensive modules and resources
 * with caching and memory management
 */

export interface LazyLoadOptions {
  cache?: boolean;
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  cleanupInterval?: number; // Cleanup interval for expired items
}

export interface LoadResult<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export class LazyLoader<T = any> {
  private cache = new Map<string, LoadResult<T>>();
  private cleanupTimer?: NodeJS.Timeout;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(
    private readonly loadFn: (key: string) => Promise<T>,
    private readonly options: LazyLoadOptions = {}
  ) {
    this.options = {
      cache: true,
      ttl: 300000, // 5 minutes default
      maxSize: 100,
      cleanupInterval: 60000, // 1 minute default
      ...options,
    };

    if (this.options.cache) {
      this.startCleanupTimer();
    }
  }

  /**
   * Load data lazily
   */
  async load(key: string): Promise<T> {
    if (!this.options.cache) {
      return await this.loadFn(key);
    }

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached)) {
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      this.cacheHits++;
      return cached.data;
    }

    // Load fresh data
    const data = await this.loadFn(key);

    // Cache the result
    if (this.options.cache) {
      this.setCache(key, data);
    }

    this.cacheMisses++;
    return data;
  }

  /**
   * Preload data for given keys
   */
  async preload(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    await Promise.all(
      keys.map(async (key) => {
        try {
          const data = await this.load(key);
          results.set(key, data);
        } catch (error) {
          console.error(`Failed to preload data for key: ${key}`, error);
        }
      })
    );

    return results;
  }

  /**
   * Invalidate cache for specific key
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
    };
  }

  /**
   * Get cached keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Check if key is cached and valid
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    return cached !== undefined && this.isCacheValid(cached);
  }

  /**
   * Force refresh cached data
   */
  async refresh(key: string): Promise<T> {
    this.cache.delete(key);
    return await this.load(key);
  }

  /**
   * Dispose the lazy loader
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.clear();
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, data: T): void {
    // Enforce cache size limit
    if (this.cache.size >= (this.options.maxSize || 100)) {
      this.evictLeastUsed();
    }

    const result: LoadResult<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, result);
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(cached: LoadResult<T>): boolean {
    if (!this.options.ttl) {
      return true;
    }
    return Date.now() - cached.timestamp < this.options.ttl;
  }

  /**
   * Evict least used cache entries
   */
  private evictLeastUsed(): void {
    if (this.cache.size === 0) {
      return;
    }

    let leastUsedKey: string | null = null;
    let leastUsedAccess = Number.POSITIVE_INFINITY;
    let leastUsedTime = Number.POSITIVE_INFINITY;

    for (const [key, value] of this.cache) {
      if (
        value.accessCount < leastUsedAccess ||
        (value.accessCount === leastUsedAccess && value.lastAccessed < leastUsedTime)
      ) {
        leastUsedKey = key;
        leastUsedAccess = value.accessCount;
        leastUsedTime = value.lastAccessed;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    if (!this.options.cleanupInterval) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.options.cleanupInterval);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.cache) {
      if (this.options.ttl && now - value.timestamp > this.options.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }
}

/**
 * Create a lazy loader for modules
 */
export function createLazyModuleLoader<T>(
  moduleLoader: (moduleName: string) => Promise<T>,
  options?: LazyLoadOptions
): LazyLoader<T> {
  return new LazyLoader(moduleLoader, options);
}

/**
 * Lazy load function for expensive operations
 */
export function lazyLoad<T>(loadFn: () => Promise<T>, options?: LazyLoadOptions): () => Promise<T> {
  const loader = new LazyLoader(async () => await loadFn(), options);

  return () => loader.load('default');
}

/**
 * Memoize async function results
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    ttl?: number;
    maxSize?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  }
): T {
  const cache = new Map<string, { result: any; timestamp: number }>();
  const { ttl = 300000, maxSize = 100, keyGenerator } = options || {};

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    // Check cache
    const cached = cache.get(key);
    if (cached && (!ttl || Date.now() - cached.timestamp < ttl)) {
      return cached.result;
    }

    // Execute function
    const result = await fn(...args);

    // Cache result
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, { result, timestamp: Date.now() });

    return result;
  }) as T;
}

/**
 * Batch loader for multiple keys
 */
export class BatchLoader<K, V> {
  private cache = new Map<K, Promise<V>>();
  private pendingBatch = new Set<K>();
  private batchTimer?: NodeJS.Timeout;

  constructor(
    private readonly batchLoadFn: (keys: K[]) => Promise<Map<K, V>>,
    private readonly options: { batchDelay?: number; maxBatchSize?: number } = {}
  ) {
    this.options = {
      batchDelay: 10,
      maxBatchSize: 50,
      ...options,
    };
  }

  /**
   * Load value for key
   */
  async load(key: K): Promise<V> {
    // Return cached promise if already loading
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Create promise for this key
    const promise = this.createLoadPromise(key);
    this.cache.set(key, promise);

    return promise;
  }

  /**
   * Load multiple keys
   */
  async loadMany(keys: K[]): Promise<Map<K, V>> {
    const promises = keys.map((key) => this.load(key).then((value) => [key, value] as [K, V]));
    const results = await Promise.all(promises);
    return new Map(results);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Create load promise for key
   */
  private createLoadPromise(key: K): Promise<V> {
    return new Promise((_resolve, _reject) => {
      this.pendingBatch.add(key);

      // Schedule batch processing
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.options.batchDelay);
      }

      // Max batch size check
      if (this.pendingBatch.size >= (this.options.maxBatchSize || 50)) {
        clearTimeout(this.batchTimer);
        this.batchTimer = undefined;
        this.processBatch();
      }
    });
  }

  /**
   * Process pending batch
   */
  private async processBatch(): Promise<void> {
    if (this.pendingBatch.size === 0) {
      return;
    }

    const batch = Array.from(this.pendingBatch);
    this.pendingBatch.clear();

    try {
      const results = await this.batchLoadFn(batch);

      // Resolve promises
      for (const key of batch) {
        const promise = this.cache.get(key);
        if (promise) {
          const value = results.get(key);
          if (value !== undefined) {
            // Resolve the promise (we need to resolve the actual promise)
            this.cache.set(key, Promise.resolve(value));
          } else {
            this.cache.delete(key);
          }
        }
      }
    } catch (error) {
      // Reject all promises in batch
      for (const key of batch) {
        this.cache.delete(key);
      }
      console.error('Batch load failed:', error);
    }
  }
}
