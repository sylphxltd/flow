/**
 * Core indexing operations for codebase indexer
 */

import {
  type ScanResult,
  detectLanguage,
  isTextFile,
  scanFiles,
} from '../../utils/codebase-helpers.js';
import type { CodebaseFile, IndexCache, IndexingStatus } from './codebase-indexer.types.js';
import type { IndexCacheManager } from './index-cache.js';
import type { SeparatedMemoryStorage } from '../storage/separated-storage.js';
import type { EmbeddingProvider } from './embeddings.js';
import type { SearchIndex } from './tfidf.js';

export class IndexingOperations {
  private db: SeparatedMemoryStorage;
  private cacheManager: IndexCacheManager;
  private batchSize: number;

  constructor(
    db: SeparatedMemoryStorage,
    cacheManager: IndexCacheManager,
    batchSize: number = 100
  ) {
    this.db = db;
    this.cacheManager = cacheManager;
    this.batchSize = batchSize;
  }

  /**
   * Scan files in codebase
   */
  async scanCodebase(codebaseRoot: string): Promise<ScanResult> {
    return scanFiles(codebaseRoot);
  }

  /**
   * Process a single file for indexing
   */
  async processFile(filePath: string, codebaseRoot: string): Promise<CodebaseFile | null> {
    try {
      const absolutePath = `${codebaseRoot}/${filePath}`;

      // Check if it's a text file
      if (!isTextFile(filePath)) {
        return null;
      }

      // Read file content
      const content = await import('node:fs').then(fs =>
        fs.promises.readFile(absolutePath, 'utf-8')
      );

      // Detect language
      const language = detectLanguage(filePath);

      // Get file stats
      const stats = await import('node:fs').then(fs =>
        fs.promises.stat(absolutePath)
      );

      return {
        path: filePath,
        absolutePath,
        content,
        language,
        size: stats.size,
        mtime: stats.mtime.getTime(),
      };
    } catch (error) {
      console.warn(`Failed to process file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Process files in batches
   */
  async processBatch(
    files: CodebaseFile[],
    cache: IndexCache,
    embeddingProvider?: EmbeddingProvider
  ): Promise<void> {
    const documents = [];

    for (const file of files) {
      // Update cache
      this.cacheManager.updateFileInCache(file.path, file.mtime, file.content, cache);

      // Create document for indexing
      const document = {
        id: file.path,
        content: file.content,
        metadata: {
          path: file.path,
          language: file.language,
          size: file.size,
          mtime: file.mtime,
        },
      };

      documents.push(document);
    }

    // Store in database
    if (documents.length > 0) {
      await this.db.addDocuments(documents);
    }
  }

  /**
   * Build TF-IDF index from database
   */
  async buildTFIDFIndex(): Promise<SearchIndex | undefined> {
    try {
      const documents = await this.db.getAllDocuments();

      if (documents.length === 0) {
        return undefined;
      }

      // Import here to avoid circular dependencies
      const { buildSearchIndex } = await import('./tfidf.js');

      return buildSearchIndex(documents);
    } catch (error) {
      console.warn('Failed to build TF-IDF index:', error);
      return undefined;
    }
  }

  /**
   * Update indexing status
   */
  updateStatus(
    status: IndexingStatus,
    currentFile?: string,
    progress?: number
  ): IndexingStatus {
    return {
      ...status,
      currentFile,
      progress: progress ?? status.progress,
    };
  }

  /**
   * Get files that need re-indexing
   */
  getFilesToReindex(
    scanResult: ScanResult,
    cache: IndexCache
  ): string[] {
    const filesToReindex: string[] = [];

    for (const file of scanResult.files) {
      const stats = file.stats;
      if (this.cacheManager.needsReindex(file.path, stats.mtime.getTime(), cache)) {
        filesToReindex.push(file.path);
      }
    }

    return filesToReindex;
  }
}