/**
 * Memory Service Types
 * Value types for functional memory operations
 */

/**
 * Metadata for memory entries
 */
export interface MemoryMetadata {
  readonly namespace: string;
  readonly timestamp: number;
  readonly size: number;
}

/**
 * Memory value with metadata
 * Used as success value in Result<MemoryValue, E>
 */
export interface MemoryValue {
  readonly value: string;
  readonly metadata: MemoryMetadata;
}

/**
 * Result of listing memory entries
 */
export interface MemoryListResult {
  readonly entries: ReadonlyArray<{
    readonly key: string;
    readonly value: string;
    readonly namespace: string;
    readonly timestamp: number;
  }>;
  readonly metadata: {
    readonly namespace: string;
    readonly count: number;
    readonly totalSize: number;
  };
}

/**
 * Result of memory statistics
 */
export interface MemoryStatsResult {
  readonly totalEntries: number;
  readonly totalSize: number;
  readonly namespaces: ReadonlyArray<{
    readonly name: string;
    readonly count: number;
    readonly oldestTimestamp?: number;
    readonly newestTimestamp?: number;
  }>;
}

/**
 * Memory entry for cache storage
 */
export interface CachedMemoryEntry {
  readonly key: string;
  readonly value: string;
  readonly namespace: string;
  readonly timestamp: number;
}
