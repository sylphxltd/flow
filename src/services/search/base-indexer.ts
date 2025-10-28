/**
 * Base indexer with common indexing logic
 * Shared by knowledge and codebase indexers
 */

import type { SearchIndex } from './tfidf.js';

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
  autoStart?: boolean; // Start indexing on initialization
}

/**
 * Base class for indexers with common functionality
 */
export abstract class BaseIndexer {
  protected cachedIndex: SearchIndex | null = null;
  protected indexingPromise: Promise<SearchIndex> | null = null;
  protected status: IndexingStatus = {
    isIndexing: false,
    progress: 0,
    totalItems: 0,
    indexedItems: 0,
    startTime: 0,
  };

  constructor(protected config: IndexerConfig) {}

  /**
   * Abstract method: Build index (implemented by subclasses)
   */
  protected abstract buildIndex(): Promise<SearchIndex>;

  /**
   * Get current indexing status
   */
  getStatus(): IndexingStatus {
    return { ...this.status };
  }

  /**
   * Check if index is ready
   */
  isReady(): boolean {
    return this.cachedIndex !== null && !this.status.isIndexing;
  }

  /**
   * Start background indexing (non-blocking)
   */
  startBackgroundIndexing(): void {
    if (this.status.isIndexing || this.cachedIndex) {
      return;
    }

    console.error(`[INFO] Starting background ${this.config.name} indexing...`);
    this.loadIndex().catch((error) => {
      console.error(`[ERROR] Background ${this.config.name} indexing failed:`, error);
    });
  }

  /**
   * Load or build index (with caching)
   */
  async loadIndex(): Promise<SearchIndex> {
    // Return cached index if available
    if (this.cachedIndex) {
      return this.cachedIndex;
    }

    // If already indexing, wait for it
    if (this.indexingPromise) {
      return this.indexingPromise;
    }

    // Start indexing
    this.status.isIndexing = true;
    this.status.progress = 0;
    this.status.startTime = Date.now();
    this.status.error = undefined;

    this.indexingPromise = this.buildIndex()
      .then((index) => {
        this.cachedIndex = index;
        this.status.isIndexing = false;
        this.status.progress = 100;
        this.status.totalItems = index.totalDocuments;
        this.status.indexedItems = index.totalDocuments;
        console.error(
          `[INFO] ${this.config.name} indexing complete: ${index.totalDocuments} documents`
        );
        return index;
      })
      .catch((error) => {
        this.status.isIndexing = false;
        this.status.error = error instanceof Error ? error.message : String(error);
        console.error(`[ERROR] ${this.config.name} indexing failed:`, error);
        throw error;
      });

    return this.indexingPromise;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedIndex = null;
    this.indexingPromise = null;
    this.status = {
      isIndexing: false,
      progress: 0,
      totalItems: 0,
      indexedItems: 0,
      startTime: 0,
    };
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<{
    totalDocuments: number;
    uniqueTerms: number;
    generatedAt: string;
    version: string;
  } | null> {
    const index = await this.loadIndex();
    if (!index) {
      return null;
    }

    return {
      totalDocuments: index.totalDocuments,
      uniqueTerms: index.idf.size,
      generatedAt: index.metadata.generatedAt,
      version: index.metadata.version,
    };
  }
}
