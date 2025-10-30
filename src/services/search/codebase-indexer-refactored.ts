/**
 * Refactored Codebase Indexer with extracted modules
 * This is the main orchestrator that uses the extracted components
 */

import { SeparatedMemoryStorage } from '../storage/separated-storage.js';
import { type VectorDocument, VectorStorage } from '../storage/vector-storage.js';
import type { EmbeddingProvider } from './embeddings.js';
import { type SearchIndex, buildSearchIndex, buildSearchIndexFromDB } from './tfidf.js';
import {
  type ScanResult,
  detectLanguage,
  isTextFile,
  loadGitignore,
  scanFiles,
  simpleHash,
} from '../../utils/codebase-helpers.js';
import { IndexerCache } from './codebase-indexer-cache.js';
import { IndexerWatcher } from './codebase-indexer-watcher.js';
import type {
  CodebaseFile,
  CodebaseIndexerOptions,
  IndexingStatus,
} from './codebase-indexer-types.js';

/**
 * Codebase Indexer with caching and modular architecture
 */
export class CodebaseIndexer {
  private codebaseRoot: string;
  private cacheDir: string;
  private cache: IndexCache | null = null;
  private db: SeparatedMemoryStorage;
  private options: CodebaseIndexerOptions;
  private watcher: IndexerWatcher;
  private status: IndexingStatus = {
    isIndexing: false,
    progress: 0,
    totalFiles: 0,
    indexedFiles: 0,
  };
  private cacheManager: IndexerCache;

  constructor(options: CodebaseIndexerOptions = {}) {
    this.options = { batchSize: 100, ...options };
    this.codebaseRoot = options.codebaseRoot || process.cwd();
    this.cacheDir = options.cacheDir || path.join(this.codebaseRoot, '.sylphx-flow', 'cache');
    this.db = new SeparatedMemoryStorage();
    this.cacheManager = new IndexerCache(this.cacheDir);
    this.watcher = new IndexerWatcher(() => this.onFilesChanged());
  }

  /**
   * Get current indexing status
   */
  getStatus(): IndexingStatus {
    return { ...this.status };
  }

  /**
   * Initialize the indexer
   */
  async initialize(): Promise<void> {
    await this.db.initialize();
    this.cache = await this.loadCache();
  }

  /**
   * Start watching files for changes
   */
  startWatching(): void {
    this.watcher.startWatching(this.codebaseRoot);
  }

  /**
   * Stop watching files
   */
  stopWatching(): void {
    this.watcher.stopWatching();
  }

  /**
   * Handle file changes detected by watcher
   */
  private async onFilesChanged(): Promise<void> {
    console.log('📁 Files changed, scheduling reindex...');
    await this.indexCodebase({ force: false });
  }

  /**
   * Load cache from database
   */
  private async loadCache(): Promise<IndexCache | null> {
    try {
      // Get metadata
      const version = await this.db.getCodebaseMetadata('version');
      const codebaseRoot = await this.db.getCodebaseMetadata('codebaseRoot');
      const indexedAt = await this.db.getCodebaseMetadata('indexedAt');
      const fileCount = await this.db.getCodebaseMetadata('fileCount');

      if (!version || !codebaseRoot || !indexedAt || !fileCount) {
        return null;
      }

      // Get all files
      const dbFiles = await this.db.getAllCodebaseFiles();
      const files = new Map<string, { mtime: number; hash: string }>();

      for (const file of dbFiles) {
        files.set(file.path, { mtime: file.mtime, hash: file.hash });
      }

      // Build TF-IDF index from database
      const tfidfIndex = await this.buildTFIDFIndexFromDB();

      // Get vector index path
      const vectorIndexPath = await this.db.getCodebaseMetadata('vectorIndexPath');

      return {
        version,
        codebaseRoot,
        indexedAt,
        fileCount: Number.parseInt(fileCount),
        files,
        tfidfIndex,
        vectorIndexPath,
      };
    } catch (error) {
      console.error('[ERROR] Failed to load cache from database:', error);
      return null;
    }
  }

  /**
   * Build TF-IDF index from database
   */
  private async buildTFIDFIndexFromDB(): Promise<SearchIndex | undefined> {
    try {
      // Get all documents from database
      const documents = [];
      const dbFiles = await this.db.getAllCodebaseFiles();

      for (const file of dbFiles) {
        const tfidfDoc = await this.db.getTFIDFDocument(file.path);
        if (tfidfDoc) {
          // Parse rawTerms from JSON string to object
          let rawTermsObj = {};
          if (tfidfDoc.rawTerms) {
            if (typeof tfidfDoc.rawTerms === 'string') {
              try {
                rawTermsObj = JSON.parse(tfidfDoc.rawTerms);
              } catch (error) {
                console.warn(`[WARN] Failed to parse rawTerms for ${file.path}:`, error);
                rawTermsObj = {};
              }
            } else if (typeof tfidfDoc.rawTerms === 'object') {
              rawTermsObj = tfidfDoc.rawTerms;
            }
          }

          const terms = new Map<string, number>();
          const rawTermsMap = new Map<string, number>();

          for (const [term, freq] of Object.entries(rawTermsObj)) {
            terms.set(term, freq as number);
            rawTermsMap.set(term, freq as number);
          }

          documents.push({
            uri: `file://${file.path}`,
            terms,
            rawTerms: rawTermsMap,
            magnitude: tfidfDoc.magnitude,
          });
        }
      }

      // Get IDF values
      const idfRecords = await this.db.getIDFValues();
      const idf = new Map<string, number>();
      for (const [term, value] of Object.entries(idfRecords)) {
        idf.set(term, value as number);
      }

      if (documents.length === 0) {
        return undefined;
      }

      return {
        documents,
        idf,
        totalDocuments: documents.length,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    } catch (error) {
      console.error('[ERROR] Failed to build TF-IDF index from database:', error);
      return undefined;
    }
  }

  /**
   * Index codebase (with incremental updates)
   */
  async indexCodebase(
    options: {
      force?: boolean; // Force full reindex
      embeddingProvider?: EmbeddingProvider; // Optional embeddings
      onProgress?: (progress: {
        current: number;
        total: number;
        fileName: string;
        status: 'processing' | 'completed' | 'skipped';
      }) => void;
    } = {}
  ): Promise<{
    tfidfIndex: SearchIndex;
    vectorStorage?: VectorStorage;
    stats: {
      totalFiles: number;
      indexedFiles: number;
      skippedFiles: number;
      cacheHit: boolean;
    };
  }> {
    let { force = false } = options;
    const { embeddingProvider } = options;

    // Set indexing status
    this.status.isIndexing = true;
    this.status.progress = 0;
    this.status.indexedFiles = 0;

    try {
      // Load existing cache
      this.cache = await this.loadCache();

      // Scan codebase
      const ig = loadGitignore(this.codebaseRoot);
      const files = scanFiles(this.codebaseRoot, {
        codebaseRoot: this.codebaseRoot,
        ignoreFilter: ig,
      });

      this.status.totalFiles = files.length;

      // Validate cache (check if file count changed significantly)
      if (this.cache && !force) {
        const fileCountDiff = Math.abs(files.length - this.cache.fileCount);
        const fileCountChangePercent = (fileCountDiff / this.cache.fileCount) * 100;

        // If file count changed by >20%, force full reindex for safety
        if (fileCountChangePercent > 20) {
          force = true;
          this.cache = null;
        }
      }

      // Detect changes (new, modified, deleted files)
      const changedFiles: CodebaseFile[] = [];
      const deletedFiles: string[] = [];
      const fileMap = new Map<string, { mtime: number; hash: string }>();

      // Check for new/modified files
      for (const file of files) {
        const hash = simpleHash(file.content);
        fileMap.set(file.path, { mtime: file.mtime, hash });

        const cached = this.cache?.files.get(file.path);
        if (force || !cached || cached.hash !== hash) {
          changedFiles.push(file);
        }
      }

      // Check for deleted files
      if (this.cache?.files) {
        for (const cachedPath of this.cache.files.keys()) {
          if (!fileMap.has(cachedPath)) {
            deletedFiles.push(cachedPath);
          }
        }
      }

      const hasChanges = changedFiles.length > 0 || deletedFiles.length > 0;
      const cacheHit = !force && !hasChanges;

      if (cacheHit && this.cache?.tfidfIndex) {
        // Cache hit - no indexing needed
        this.status.progress = 100;
        this.status.indexedFiles = 0;
        this.status.isIndexing = false;

        return {
          tfidfIndex: this.cache.tfidfIndex,
          stats: {
            totalFiles: files.length,
            indexedFiles: 0,
            skippedFiles: files.length,
            cacheHit: true,
          },
        };
      }

      // Store files in database for content retrieval
      await this.db.initialize();
      let processedCount = 0;
      for (const file of files) {
        await this.db.upsertCodebaseFile({
          path: file.path,
          mtime: file.mtime,
          hash: simpleHash(file.content),
          content: file.content,
          language: file.language,
          size: file.size,
          indexedAt: new Date().toISOString(),
        });

        // Update progress
        processedCount++;
        this.status.indexedFiles = processedCount;
        this.status.currentFile = file.path;
        this.status.progress = Math.floor((processedCount / files.length) * 100);
      }

      // Build TF-IDF index
      const documents = files.map((file) => ({
        uri: `file://${file.path}`,
        terms: new Map<string, number>(),
        rawTerms: new Map<string, number>(),
        magnitude: 0,
      }));

      const tfidfIndex = buildSearchIndex(documents);

      // Update cache
      this.cache = {
        version: '1.0.0',
        codebaseRoot: this.codebaseRoot,
        indexedAt: new Date().toISOString(),
        fileCount: files.length,
        files: fileMap,
        tfidfIndex,
      };

      await this.saveCache(this.cache);

      this.status.progress = 100;
      this.status.isIndexing = false;

      return {
        tfidfIndex,
        stats: {
          totalFiles: files.length,
          indexedFiles: files.length,
          skippedFiles: 0,
          cacheHit: false,
        },
      };
    } catch (error) {
      this.status.isIndexing = false;
      throw error;
    }
  }

  /**
   * Save cache to database
   */
  private async saveCache(cache: IndexCache): Promise<void> {
    try {
      // Save metadata
      await this.db.setCodebaseMetadata('version', cache.version);
      await this.db.setCodebaseMetadata('codebaseRoot', cache.codebaseRoot);
      await this.db.setCodebaseMetadata('indexedAt', cache.indexedAt);
      await this.db.setCodebaseMetadata('fileCount', cache.fileCount.toString());
      if (cache.vectorIndexPath) {
        await this.db.setCodebaseMetadata('vectorIndexPath', cache.vectorIndexPath);
      }

      // Save files
      for (const [filePath, fileInfo] of cache.files.entries()) {
        await this.db.upsertCodebaseFile({
          path: filePath,
          mtime: fileInfo.mtime,
          hash: fileInfo.hash,
        });
      }

      // Save TF-IDF index if available
      if (cache.tfidfIndex) {
        // Save documents
        for (const doc of cache.tfidfIndex.documents) {
          const filePath = doc.uri.replace('file://', '');
          // Convert rawTerms Map to Record
          const rawTermsRecord: Record<string, number> = {};
          for (const [term, freq] of doc.rawTerms.entries()) {
            rawTermsRecord[term] = freq;
          }

          await this.db.upsertTFIDFDocument(filePath, {
            magnitude: doc.magnitude,
            termCount: doc.terms.size,
            rawTerms: rawTermsRecord,
          });

          // Save terms
          const terms: Record<string, number> = {};
          for (const [term, freq] of doc.terms.entries()) {
            terms[term] = freq;
          }
          await this.db.setTFIDFTerms(filePath, terms);
        }

        // Save IDF values
        const idfValues: Record<string, number> = {};
        for (const [term, value] of cache.tfidfIndex.idf.entries()) {
          idfValues[term] = value;
        }
        await this.db.setIDFValues(idfValues);
      }
    } catch (error) {
      console.error('[ERROR] Failed to save cache to database:', error);
      throw error;
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.stopWatching();
    await this.db.close();
  }
}