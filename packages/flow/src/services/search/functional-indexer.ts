/**
 * Functional Indexer
 * Pure functional implementation using composition instead of inheritance
 *
 * Replaces BaseIndexer class with factory function and closures
 */

import type { SearchIndex } from './tfidf.js';
import { createLogger } from '../../utils/debug-logger.js';

const log = createLogger('search:indexing');

// ============================================================================
// TYPES
// ============================================================================

export interface IndexingStatus {
  isIndexing: boolean;
  progress: number; // 0-100
  totalItems: number;
  indexedItems: number;
  startTime: number;
  error?: string;
}

export interface IndexerConfig {
  name: string; // 'knowledge' or 'codebase'
  buildIndex: () => Promise<SearchIndex>; // Injected build function
  autoStart?: boolean; // Auto-start indexing (default: true)
}

export interface IndexerState {
  readonly cachedIndex: SearchIndex | null;
  readonly indexingPromise: Promise<SearchIndex> | null;
  readonly status: IndexingStatus;
}

export interface Indexer {
  readonly getStatus: () => IndexingStatus;
  readonly isReady: () => boolean;
  readonly loadIndex: () => Promise<SearchIndex>;
  readonly clearCache: () => void;
  readonly getStats: () => Promise<{
    totalDocuments: number;
    uniqueTerms: number;
    generatedAt: string;
    version: string;
  } | null>;
  readonly startBackgroundIndexing: () => void;
}

// ============================================================================
// STATE MANAGEMENT (Pure Functions)
// ============================================================================

/**
 * Create initial indexer state
 */
const createInitialState = (): IndexerState => ({
  cachedIndex: null,
  indexingPromise: null,
  status: {
    isIndexing: false,
    progress: 0,
    totalItems: 0,
    indexedItems: 0,
    startTime: 0,
  },
});

/**
 * Update status to indexing
 */
const setIndexing = (state: IndexerState): IndexerState => ({
  ...state,
  status: {
    ...state.status,
    isIndexing: true,
    progress: 0,
    startTime: Date.now(),
    error: undefined,
  },
});

/**
 * Update with completed index
 */
const setCompleted = (state: IndexerState, index: SearchIndex): IndexerState => ({
  ...state,
  cachedIndex: index,
  indexingPromise: null,
  status: {
    ...state.status,
    isIndexing: false,
    progress: 100,
    totalItems: index.totalDocuments,
    indexedItems: index.totalDocuments,
  },
});

/**
 * Update with error
 */
const setError = (state: IndexerState, error: Error): IndexerState => ({
  ...state,
  indexingPromise: null,
  status: {
    ...state.status,
    isIndexing: false,
    error: error.message,
  },
});

/**
 * Set indexing promise
 */
const setIndexingPromise = (state: IndexerState, promise: Promise<SearchIndex>): IndexerState => ({
  ...state,
  indexingPromise: promise,
});

// ============================================================================
// INDEXER FACTORY (Composition over Inheritance)
// ============================================================================

/**
 * Create indexer with closure-based state management
 * Replaces BaseIndexer class with pure functional approach
 *
 * @example
 * const knowledgeIndexer = createIndexer({
 *   name: 'knowledge',
 *   buildIndex: async () => {
 *     // Knowledge-specific indexing logic
 *     return searchIndex;
 *   }
 * });
 *
 * const status = knowledgeIndexer.getStatus();
 * const index = await knowledgeIndexer.loadIndex();
 */
export const createIndexer = (config: IndexerConfig): Indexer => {
  // State managed in closure (not mutable class fields)
  let state = createInitialState();

  // Auto-start indexing (default behavior)
  const shouldAutoStart = config.autoStart !== false;
  if (shouldAutoStart) {
    setTimeout(() => indexer.startBackgroundIndexing(), 0);
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  const indexer: Indexer = {
    /**
     * Get current indexing status (immutable copy)
     */
    getStatus: () => ({ ...state.status }),

    /**
     * Check if index is ready
     */
    isReady: () => state.cachedIndex !== null && !state.status.isIndexing,

    /**
     * Load or build index (with caching and deduplication)
     */
    loadIndex: async () => {
      // Return cached index if available
      if (state.cachedIndex) {
        return state.cachedIndex;
      }

      // If already indexing, wait for existing promise
      if (state.indexingPromise) {
        return state.indexingPromise;
      }

      // Start new indexing
      state = setIndexing(state);

      const indexingPromise = config
        .buildIndex()
        .then((index) => {
          state = setCompleted(state, index);
          log(`${config.name} indexing complete:`, index.totalDocuments, 'documents');
          return index;
        })
        .catch((error) => {
          state = setError(state, error as Error);
          log(`${config.name} indexing failed:`, error instanceof Error ? error.message : String(error));
          throw error;
        });

      state = setIndexingPromise(state, indexingPromise);
      return indexingPromise;
    },

    /**
     * Clear cache and reset state
     */
    clearCache: () => {
      state = createInitialState();
    },

    /**
     * Get index statistics
     */
    getStats: async () => {
      const index = await indexer.loadIndex();
      if (!index) {
        return null;
      }

      return {
        totalDocuments: index.totalDocuments,
        uniqueTerms: index.idf.size,
        generatedAt: index.metadata.generatedAt,
        version: index.metadata.version,
      };
    },

    /**
     * Start background indexing (non-blocking)
     */
    startBackgroundIndexing: () => {
      if (state.status.isIndexing || state.cachedIndex) {
        return;
      }

      log(`Starting background ${config.name} indexing`);
      indexer.loadIndex().catch((error) => {
        log(`Background ${config.name} indexing failed:`, error instanceof Error ? error.message : String(error));
      });
    },
  };

  return Object.freeze(indexer); // Make API immutable
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Compose indexer with additional behavior
 * Example of function composition instead of inheritance
 */
export const withLogging =
  (baseIndexer: Indexer) =>
  (config: { verbose?: boolean } = {}): Indexer => {
    const { verbose = false } = config;

    return {
      ...baseIndexer,
      loadIndex: async () => {
        if (verbose) {
          log('Loading index...');
        }
        const index = await baseIndexer.loadIndex();
        if (verbose) {
          log('Index loaded:', index.totalDocuments, 'documents');
        }
        return index;
      },
    };
  };

/**
 * Compose indexer with custom cache strategy
 */
export const withCacheTTL =
  (baseIndexer: Indexer) =>
  (ttlMs: number): Indexer => {
    let lastIndexTime = 0;

    return {
      ...baseIndexer,
      loadIndex: async () => {
        const now = Date.now();
        const isExpired = now - lastIndexTime > ttlMs;

        if (isExpired) {
          baseIndexer.clearCache();
        }

        const index = await baseIndexer.loadIndex();
        lastIndexTime = now;
        return index;
      },
    };
  };

/**
 * Compose indexer with retry logic
 */
export const withRetry =
  (baseIndexer: Indexer) =>
  (maxRetries = 3, delayMs = 1000): Indexer => {
    return {
      ...baseIndexer,
      loadIndex: async () => {
        let lastError: Error | null = null;

        for (let i = 0; i < maxRetries; i++) {
          try {
            return await baseIndexer.loadIndex();
          } catch (error) {
            lastError = error as Error;
            log(`Indexing attempt ${i + 1}/${maxRetries} failed:`, error instanceof Error ? error.message : String(error));

            if (i < maxRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
          }
        }

        throw lastError || new Error('Indexing failed after retries');
      },
    };
  };
