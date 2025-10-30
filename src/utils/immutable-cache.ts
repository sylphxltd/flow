/**
 * Immutable Cache
 * Functional cache abstraction that returns new state on mutations
 */

export interface CacheState<K, V> {
  readonly entries: ReadonlyMap<K, V>;
  readonly size: number;
}

/**
 * Create an empty cache state
 */
export const createCache = <K, V>(): CacheState<K, V> => ({
  entries: new Map(),
  size: 0,
});

/**
 * Set a value in the cache, returning new cache state
 */
export const cacheSet = <K, V>(
  cache: CacheState<K, V>,
  key: K,
  value: V
): CacheState<K, V> => {
  const newEntries = new Map(cache.entries);
  newEntries.set(key, value);
  return {
    entries: newEntries,
    size: newEntries.size,
  };
};

/**
 * Get a value from the cache
 */
export const cacheGet = <K, V>(cache: CacheState<K, V>, key: K): V | undefined => {
  return cache.entries.get(key);
};

/**
 * Delete a key from the cache, returning new cache state
 */
export const cacheDelete = <K, V>(cache: CacheState<K, V>, key: K): CacheState<K, V> => {
  const newEntries = new Map(cache.entries);
  newEntries.delete(key);
  return {
    entries: newEntries,
    size: newEntries.size,
  };
};

/**
 * Delete multiple keys matching a predicate, returning new cache state
 */
export const cacheDeleteWhere = <K, V>(
  cache: CacheState<K, V>,
  predicate: (key: K, value: V) => boolean
): CacheState<K, V> => {
  const newEntries = new Map<K, V>();
  for (const [key, value] of cache.entries) {
    if (!predicate(key, value)) {
      newEntries.set(key, value);
    }
  }
  return {
    entries: newEntries,
    size: newEntries.size,
  };
};

/**
 * Clear all entries from the cache, returning new cache state
 */
export const cacheClear = <K, V>(): CacheState<K, V> => createCache();

/**
 * Get all keys from the cache
 */
export const cacheKeys = <K, V>(cache: CacheState<K, V>): K[] => {
  return Array.from(cache.entries.keys());
};

/**
 * Enforce maximum cache size by removing oldest entries (FIFO)
 * Returns new cache state
 */
export const cacheEnforceLimit = <K, V>(
  cache: CacheState<K, V>,
  maxSize: number
): CacheState<K, V> => {
  if (cache.size <= maxSize) {
    return cache;
  }

  const entriesToRemove = cache.size - maxSize;
  const keys = Array.from(cache.entries.keys());
  const keysToRemove = keys.slice(0, entriesToRemove);

  const newEntries = new Map(cache.entries);
  for (const key of keysToRemove) {
    newEntries.delete(key);
  }

  return {
    entries: newEntries,
    size: newEntries.size,
  };
};
