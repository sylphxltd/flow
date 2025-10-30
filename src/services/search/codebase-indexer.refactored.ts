/**
 * Refactored Codebase Indexer with modular architecture
 *
 * This is the refactored version that demonstrates improved code organization
 * and separation of concerns.
 */

import path from 'node:path';
import { SeparatedMemoryStorage } from '../storage/separated-storage.js';
import type {
  CodebaseFile,
  CodebaseIndexerOptions,
  IndexingStatus,
} from './codebase-indexer.types.js';
import type { EmbeddingProvider } from './embeddings.js';
import { FileWatcher } from './file-watcher.js';
import { IndexCacheManager } from './index-cache.js';
import { IndexingOperations } from './indexing-operations.js';

/**
 * Main CodebaseIndexer class - orchestrates the indexing process
 */
export class CodebaseIndexer {
  private codebaseRoot: string;
  private cacheDir: string;
  private cache: any = null; // IndexCache type
  private db: SeparatedMemoryStorage;
  private options: CodebaseIndexerOptions;
  private fileWatcher: FileWatcher;
  private cacheManager: IndexCacheManager;
  private indexingOps: IndexingOperations;
  private status: IndexingStatus = {
    isIndexing: false,
    progress: 0,
    totalFiles: 0,
    indexedFiles: 0,
  };

  constructor(options: CodebaseIndexerOptions = {}) {
    this.options = { batchSize: 100, ...options };
    this.codebaseRoot = options.codebaseRoot || process.cwd();
    this.cacheDir = options.cacheDir || path.join(this.codebaseRoot, '.sylphx-flow', 'cache');

    this.db = new SeparatedMemoryStorage();
    this.cacheManager = new IndexCacheManager(this.cacheDir);
    this.indexingOps = new IndexingOperations(this.db, this.cacheManager, this.options.batchSize);

    this.fileWatcher = new FileWatcher(this.options, () => this.scheduleReindex());

    // Load existing cache
    this.cache = this.cacheManager.loadCache();
  }

  /**
   * Get current indexing status
   */
  getStatus(): IndexingStatus {
    return { ...this.status };
  }

  /**
   * Index the codebase
   */
  async indexCodebase(embeddingProvider?: EmbeddingProvider): Promise<void> {
    if (this.status.isIndexing) {
      throw new Error('Indexing already in progress');
    }

    this.status = {
      ...this.status,
      isIndexing: true,
      progress: 0,
      indexedFiles: 0,
    };

    try {
      // Initialize cache if needed
      if (!this.cache) {
        this.cache = this.cacheManager.createCache(this.codebaseRoot);
      }

      // Scan codebase
      const scanResult = await this.indexingOps.scanCodebase(this.codebaseRoot);

      this.status.totalFiles = scanResult.files.length;
      this.status = this.indexingOps.updateStatus(this.status);

      // Get files that need re-indexing
      const filesToReindex = this.indexingOps.getFilesToReindex(scanResult, this.cache);

      if (filesToReindex.length === 0) {
        console.log('No files need re-indexing');
        this.status.isIndexing = false;
        return;
      }

      console.log(`Indexing ${filesToReindex.length} files...`);

      // Process files in batches
      const batchSize = this.options.batchSize || 100;
      for (let i = 0; i < filesToReindex.length; i += batchSize) {
        const batch = filesToReindex.slice(i, i + batchSize);
        const files: CodebaseFile[] = [];

        for (const filePath of batch) {
          const file = await this.indexingOps.processFile(filePath, this.codebaseRoot);
          if (file) {
            files.push(file);
          }

          this.status.indexedFiles++;
          this.status.progress = Math.round(
            (this.status.indexedFiles / filesToReindex.length) * 100
          );
          this.status = this.indexingOps.updateStatus(this.status, filePath, this.status.progress);
        }

        // Process batch
        await this.indexingOps.processBatch(files, this.cache, embeddingProvider);
      }

      // Update cache metadata
      this.cache.indexedAt = new Date().toISOString();
      this.cache.fileCount = this.cache.files.size;

      // Save cache
      this.cacheManager.saveCache(this.cache);

      console.log('Indexing completed successfully');
    } catch (error) {
      console.error('Indexing failed:', error);
      throw error;
    } finally {
      this.status.isIndexing = false;
    }
  }

  /**
   * Search the indexed codebase
   */
  async search(query: string, limit = 10): Promise<any[]> {
    try {
      // For now, return empty array - implement search functionality
      return [];
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Start file watching
   */
  startWatching(): void {
    this.fileWatcher.startWatching();
  }

  /**
   * Stop file watching
   */
  stopWatching(): void {
    this.fileWatcher.stopWatching();
  }

  /**
   * Schedule reindexing (called by file watcher)
   */
  private async scheduleReindex(): Promise<void> {
    console.log('File changes detected, scheduling re-index...');
    try {
      await this.indexCodebase();
    } catch (error) {
      console.error('Auto re-indexing failed:', error);
    }
  }

  /**
   * Clear cache and re-index everything
   */
  async clearAndReindex(embeddingProvider?: EmbeddingProvider): Promise<void> {
    this.cacheManager.clearCache();
    this.cache = null;
    await this.indexCodebase(embeddingProvider);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.fileWatcher.destroy();
  }
}
