/**
 * Codebase indexing with .gitignore support
 * Runtime indexing with intelligent caching
 *
 * Features:
 * - Optional file watching for automatic re-indexing (controlled by MCP server)
 * - Respects .gitignore patterns
 * - Debounced re-indexing (5 seconds after last change)
 */

import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import ignore, { type Ignore } from 'ignore';
import {
  type ScanResult,
  detectLanguage,
  isTextFile,
  loadGitignore,
  scanFiles,
  simpleHash,
} from '../../utils/codebase-helpers.js';
import { SeparatedMemoryStorage } from '../storage/separated-storage.js';
import { type VectorDocument, VectorStorage } from '../storage/vector-storage.js';
import type { EmbeddingProvider } from './embeddings.js';
import { type SearchIndex, buildSearchIndex, buildSearchIndexFromDB } from './tfidf.js';
import type {
  CodebaseFile,
  IndexCache,
  CodebaseIndexerOptions,
  IndexingStatus,
} from './codebase-indexer-types.js';
import { logger } from '../../utils/logger.js';

export class CodebaseIndexer {
  private codebaseRoot: string;
  private cacheDir: string;
  private cache: IndexCache | null = null;
  private ig: Ignore;
  private db: SeparatedMemoryStorage;
  private options: CodebaseIndexerOptions;
  private watcher?: chokidar.FSWatcher;
  private reindexTimer?: NodeJS.Timeout;
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
    this.ig = loadGitignore(this.codebaseRoot);
    this.db = new SeparatedMemoryStorage();
  }

  /**
   * Get current indexing status
   */
  getStatus(): IndexingStatus {
    return { ...this.status };
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
                logger.warn('Failed to parse rawTerms', { path: file.path, error });
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
      logger.error('Failed to build TF-IDF index from database', { error });
      return undefined;
    }
  }

  /**
   * Load cache from database
   */
  private async loadCache(): Promise<IndexCache | null> {
    try {
      // Initialize database
      await this.db.initialize();

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
      logger.error('Failed to load cache from database', { error });
      return null;
    }
  }

  /**
   * Save cache to database
   */
  private async saveCache(cache: IndexCache): Promise<void> {
    try {
      // Initialize tables
      await this.db.initialize();

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
      logger.error('Failed to save cache to database', { error });
      throw error;
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

      // Scan codebase (silent during reindex for clean UI)
      const files = scanFiles(this.codebaseRoot, {
        codebaseRoot: this.codebaseRoot,
        ignoreFilter: this.ig,
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
        content: file.content,
      }));

      const tfidfIndex = await buildSearchIndex(documents, options.onProgress);

      // Build vector index if embedding provider is available
      let vectorStorage: VectorStorage | undefined;
      if (embeddingProvider) {
        const vectorIndexPath = path.join(this.cacheDir, 'codebase-vectors.hnsw');
        vectorStorage = new VectorStorage(vectorIndexPath, embeddingProvider.dimensions);

        // Generate embeddings in batches
        const batchSize = 10;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          const texts = batch.map((f) => f.content);
          const embeddings = await embeddingProvider.generateEmbeddings(texts);

          for (let j = 0; j < batch.length; j++) {
            const file = batch[j];
            const embedding = embeddings[j];

            const doc: VectorDocument = {
              id: `file://${file.path}`,
              embedding,
              metadata: {
                type: 'code',
                language: file.language || '',
                content: file.content.slice(0, 500), // Store snippet
                category: '',
              },
            };

            vectorStorage.addDocument(doc);
          }
        }

        vectorStorage.save();
      }

      // Update cache
      this.cache = {
        version: '1.0.0',
        codebaseRoot: this.codebaseRoot,
        indexedAt: new Date().toISOString(),
        fileCount: files.length,
        files: fileMap,
        tfidfIndex,
        vectorIndexPath: vectorStorage
          ? path.join(this.cacheDir, 'codebase-vectors.hnsw')
          : undefined,
      };

      await this.saveCache(this.cache);

      // Update status
      this.status.indexedFiles = changedFiles.length;
      this.status.progress = 100;

      return {
        tfidfIndex,
        vectorStorage,
        stats: {
          totalFiles: files.length,
          indexedFiles: changedFiles.length,
          skippedFiles: files.length - changedFiles.length,
          cacheHit: false,
        },
      };
    } finally {
      // Reset indexing status
      this.status.isIndexing = false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    exists: boolean;
    fileCount: number;
    indexedAt?: string;
  }> {
    try {
      await this.db.initialize();
      const stats = await this.db.getCodebaseIndexStats();
      return {
        exists: stats.totalFiles > 0,
        fileCount: stats.totalFiles,
        indexedAt: stats.indexedAt,
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { error });
      return {
        exists: false,
        fileCount: 0,
      };
    }
  }

  /**
   * Search codebase using TF-IDF
   */
  async search(
    query: string,
    options: {
      limit?: number;
      minScore?: number;
      includeContent?: boolean;
    } = {}
  ): Promise<
    Array<{
      path: string;
      score: number;
      content?: string;
      language?: string;
    }>
  > {
    const { limit = 10, minScore = 0, includeContent = true } = options;

    // Load TF-IDF index from cache
    const index = await this.buildTFIDFIndexFromDB();
    if (!index) {
      throw new Error('No search index available. Please run indexCodebase first.');
    }

    // Import search function
    const { searchDocuments } = await import('./tfidf.js');

    // Perform search
    const searchResults = searchDocuments(query, index, {
      limit,
      minScore,
    });

    // Convert results and optionally include content
    const results = [];
    for (const result of searchResults) {
      const filePath = result.uri?.replace('file://', '') || '';
      let content: string | undefined;

      if (includeContent) {
        try {
          const file = await this.db.getCodebaseFile(filePath);
          content = file?.content;
        } catch {
          // Fallback: don't include content if unable to retrieve
        }
      }

      results.push({
        path: filePath,
        score: result.score || 0,
        content,
      });
    }

    return results;
  }

  /**
   * Start watching codebase directory for changes
   * OPTIONAL: Only started when codebase tools are enabled in MCP server
   */
  startWatching(): void {
    if (this.watcher) {
      logger.info('Codebase watcher already running');
      return;
    }

    try {
      // Watch all files in codebase root, respecting .gitignore
      this.watcher = chokidar.watch(this.codebaseRoot, {
        ignored: [
          /(^|[\/\\])\../, // Ignore dotfiles
          /node_modules/, // Ignore node_modules
          /\.git\//, // Ignore .git
          /\.sylphx-flow\//, // Ignore our own directory
          '**/dist/**',
          '**/build/**',
          '**/coverage/**',
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100,
        },
      });

      this.watcher.on('all', (event, filePath) => {
        // Only process text files
        if (!isTextFile(filePath)) {
          return;
        }

        // Check against .gitignore
        const relativePath = path.relative(this.codebaseRoot, filePath);
        if (this.ig.ignores(relativePath)) {
          return;
        }

        logger.debug('Codebase file changed', { event, file: path.basename(filePath) });

        // Debounce: Wait 5 seconds after last change before re-indexing
        // (Longer than knowledge because code files save more frequently)
        if (this.reindexTimer) {
          clearTimeout(this.reindexTimer);
        }

        this.reindexTimer = setTimeout(async () => {
          logger.info('Re-indexing codebase due to file changes');
          try {
            await this.index();
            logger.info('Codebase re-indexing complete');
          } catch (error) {
            logger.error('Codebase re-indexing failed', { error });
          }
        }, 5000);
      });

      logger.info('Watching codebase directory for changes', { codebaseRoot: this.codebaseRoot });
    } catch (error) {
      logger.error('Failed to start codebase file watching', { error });
      // Don't throw - indexing can still work without watching
    }
  }

  /**
   * Stop watching (for cleanup)
   */
  stopWatching(): void {
    if (this.reindexTimer) {
      clearTimeout(this.reindexTimer);
      this.reindexTimer = undefined;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      logger.info('Stopped watching codebase directory');
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    // Stop any pending reindex
    if (this.reindexTimer) {
      clearTimeout(this.reindexTimer);
      this.reindexTimer = undefined;
    }

    try {
      // Clear database tables
      await this.db.initialize();
      await this.db.clearCodebaseIndex();

      // Also clean up any old JSON files
      const cachePath = path.join(this.cacheDir, 'codebase-index.json');
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }

      const vectorPath = path.join(this.cacheDir, 'codebase-vectors.hnsw');
      if (fs.existsSync(vectorPath)) {
        fs.unlinkSync(vectorPath);
      }

      logger.info('Cache cleared from database and files');
    } catch (error) {
      logger.error('Failed to clear cache', { error });
    }
  }

  /**
   * Convenience method that delegates to indexCodebase
   * Used by file watcher
   */
  private async index(): Promise<void> {
    await this.indexCodebase();
  }
}

// ============================================================================
// FUNCTIONAL ALTERNATIVE (Composition over Inheritance)
// ============================================================================

/**
 * Create functional codebase indexer using composition
 * Modern alternative to class-based CodebaseIndexer
 *
 * @example
 * const indexer = createCodebaseIndexerFunctional({ codebaseRoot: '/path/to/code' });
 * const result = await indexer.indexCodebase();
 * const results = await indexer.search('authentication');
 */
export function createCodebaseIndexerFunctional(options: CodebaseIndexerOptions = {}): {
  readonly getStatus: () => IndexingStatus;
  readonly indexCodebase: (opts?: {
    force?: boolean;
    embeddingProvider?: EmbeddingProvider;
    onProgress?: (progress: {
      current: number;
      total: number;
      fileName: string;
      status: 'processing' | 'completed' | 'skipped';
    }) => void;
  }) => Promise<{
    tfidfIndex: SearchIndex;
    vectorStorage?: VectorStorage;
    stats: {
      totalFiles: number;
      indexedFiles: number;
      skippedFiles: number;
      cacheHit: boolean;
    };
  }>;
  readonly search: (
    query: string,
    opts?: {
      limit?: number;
      minScore?: number;
      includeContent?: boolean;
    }
  ) => Promise<
    Array<{
      path: string;
      score: number;
      content?: string;
      language?: string;
    }>
  >;
  readonly getCacheStats: () => Promise<{
    exists: boolean;
    fileCount: number;
    indexedAt?: string;
  }>;
  readonly clearCache: () => Promise<void>;
  readonly startWatching: () => void;
  readonly stopWatching: () => void;
} {
  // Closure-based state (immutable from outside)
  const codebaseRoot = options.codebaseRoot || process.cwd();
  const cacheDir = options.cacheDir || path.join(codebaseRoot, '.sylphx-flow', 'cache');
  const batchSize = options.batchSize || 100;

  const ig = loadGitignore(codebaseRoot);
  const db = new SeparatedMemoryStorage();

  let cache: IndexCache | null = null;
  let watcher: chokidar.FSWatcher | undefined;
  let reindexTimer: NodeJS.Timeout | undefined;
  let status: IndexingStatus = {
    isIndexing: false,
    progress: 0,
    totalFiles: 0,
    indexedFiles: 0,
  };

  // ========================================================================
  // PURE FUNCTIONS (No side effects, testable)
  // ========================================================================

  /**
   * Build TF-IDF index from database (pure read operation)
   */
  const buildTFIDFIndexFromDB = async (): Promise<SearchIndex | undefined> => {
    try {
      const dbFiles = await db.getAllCodebaseFiles();
      const documents = [];

      for (const file of dbFiles) {
        const tfidfDoc = await db.getTFIDFDocument(file.path);
        if (!tfidfDoc) continue;

        // Parse rawTerms
        let rawTermsObj: Record<string, number> = {};
        if (tfidfDoc.rawTerms) {
          if (typeof tfidfDoc.rawTerms === 'string') {
            try {
              rawTermsObj = JSON.parse(tfidfDoc.rawTerms);
            } catch {
              rawTermsObj = {};
            }
          } else if (typeof tfidfDoc.rawTerms === 'object') {
            rawTermsObj = tfidfDoc.rawTerms;
          }
        }

        const terms = new Map<string, number>();
        const rawTermsMap = new Map<string, number>();

        for (const [term, freq] of Object.entries(rawTermsObj)) {
          terms.set(term, freq);
          rawTermsMap.set(term, freq);
        }

        documents.push({
          uri: `file://${file.path}`,
          terms,
          rawTerms: rawTermsMap,
          magnitude: tfidfDoc.magnitude,
        });
      }

      // Get IDF values
      const idfRecords = await db.getIDFValues();
      const idf = new Map<string, number>();
      for (const [term, value] of Object.entries(idfRecords)) {
        idf.set(term, value);
      }

      if (documents.length === 0) return undefined;

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
      logger.error('Failed to build TF-IDF index from database', { error });
      return undefined;
    }
  };

  /**
   * Load cache from database (pure read operation)
   */
  const loadCache = async (): Promise<IndexCache | null> => {
    try {
      await db.initialize();

      const version = await db.getCodebaseMetadata('version');
      const root = await db.getCodebaseMetadata('codebaseRoot');
      const indexedAt = await db.getCodebaseMetadata('indexedAt');
      const fileCount = await db.getCodebaseMetadata('fileCount');

      if (!version || !root || !indexedAt || !fileCount) {
        return null;
      }

      const dbFiles = await db.getAllCodebaseFiles();
      const files = new Map<string, { mtime: number; hash: string }>();

      for (const file of dbFiles) {
        files.set(file.path, { mtime: file.mtime, hash: file.hash });
      }

      const tfidfIndex = await buildTFIDFIndexFromDB();
      const vectorIndexPath = await db.getCodebaseMetadata('vectorIndexPath');

      return {
        version,
        codebaseRoot: root,
        indexedAt,
        fileCount: Number.parseInt(fileCount),
        files,
        tfidfIndex,
        vectorIndexPath,
      };
    } catch (error) {
      logger.error('Failed to load cache from database', { error });
      return null;
    }
  };

  /**
   * Save cache to database (side effect, but isolated)
   */
  const saveCache = async (cacheToSave: IndexCache): Promise<void> => {
    try {
      await db.initialize();

      // Save metadata
      await db.setCodebaseMetadata('version', cacheToSave.version);
      await db.setCodebaseMetadata('codebaseRoot', cacheToSave.codebaseRoot);
      await db.setCodebaseMetadata('indexedAt', cacheToSave.indexedAt);
      await db.setCodebaseMetadata('fileCount', cacheToSave.fileCount.toString());
      if (cacheToSave.vectorIndexPath) {
        await db.setCodebaseMetadata('vectorIndexPath', cacheToSave.vectorIndexPath);
      }

      // Save files
      for (const [filePath, fileInfo] of cacheToSave.files.entries()) {
        await db.upsertCodebaseFile({
          path: filePath,
          mtime: fileInfo.mtime,
          hash: fileInfo.hash,
        });
      }

      // Save TF-IDF index
      if (cacheToSave.tfidfIndex) {
        for (const doc of cacheToSave.tfidfIndex.documents) {
          const filePath = doc.uri.replace('file://', '');
          const rawTermsRecord: Record<string, number> = {};
          for (const [term, freq] of doc.rawTerms.entries()) {
            rawTermsRecord[term] = freq;
          }

          await db.upsertTFIDFDocument(filePath, {
            magnitude: doc.magnitude,
            termCount: doc.terms.size,
            rawTerms: rawTermsRecord,
          });

          const terms: Record<string, number> = {};
          for (const [term, freq] of doc.terms.entries()) {
            terms[term] = freq;
          }
          await db.setTFIDFTerms(filePath, terms);
        }

        // Save IDF values
        const idfValues: Record<string, number> = {};
        for (const [term, value] of cacheToSave.tfidfIndex.idf.entries()) {
          idfValues[term] = value;
        }
        await db.setIDFValues(idfValues);
      }
    } catch (error) {
      logger.error('Failed to save cache to database', { error });
      throw error;
    }
  };

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  const api = {
    /**
     * Get current indexing status (immutable copy)
     */
    getStatus: () => ({ ...status }),

    /**
     * Index codebase (with incremental updates)
     */
    indexCodebase: async (opts = {}) => {
      let { force = false } = opts;
      const { embeddingProvider, onProgress } = opts;

      // Set indexing status
      status = {
        isIndexing: true,
        progress: 0,
        indexedFiles: 0,
        totalFiles: 0,
      };

      try {
        // Load existing cache
        cache = await loadCache();

        // Scan codebase
        const files = scanFiles(codebaseRoot, {
          codebaseRoot,
          ignoreFilter: ig,
        });

        status = { ...status, totalFiles: files.length };

        // Validate cache (check if file count changed significantly)
        if (cache && !force) {
          const fileCountDiff = Math.abs(files.length - cache.fileCount);
          const fileCountChangePercent = (fileCountDiff / cache.fileCount) * 100;

          if (fileCountChangePercent > 20) {
            force = true;
            cache = null;
          }
        }

        // Detect changes
        const changedFiles: CodebaseFile[] = [];
        const deletedFiles: string[] = [];
        const fileMap = new Map<string, { mtime: number; hash: string }>();

        for (const file of files) {
          const hash = simpleHash(file.content);
          fileMap.set(file.path, { mtime: file.mtime, hash });

          const cached = cache?.files.get(file.path);
          if (force || !cached || cached.hash !== hash) {
            changedFiles.push(file);
          }
        }

        if (cache?.files) {
          for (const cachedPath of cache.files.keys()) {
            if (!fileMap.has(cachedPath)) {
              deletedFiles.push(cachedPath);
            }
          }
        }

        const hasChanges = changedFiles.length > 0 || deletedFiles.length > 0;
        const cacheHit = !force && !hasChanges;

        if (cacheHit && cache?.tfidfIndex) {
          status = { ...status, progress: 100, indexedFiles: 0, isIndexing: false };

          return {
            tfidfIndex: cache.tfidfIndex,
            stats: {
              totalFiles: files.length,
              indexedFiles: 0,
              skippedFiles: files.length,
              cacheHit: true,
            },
          };
        }

        // Store files in database
        await db.initialize();
        let processedCount = 0;
        for (const file of files) {
          await db.upsertCodebaseFile({
            path: file.path,
            mtime: file.mtime,
            hash: simpleHash(file.content),
            content: file.content,
            language: file.language,
            size: file.size,
            indexedAt: new Date().toISOString(),
          });

          processedCount++;
          status = {
            ...status,
            indexedFiles: processedCount,
            currentFile: file.path,
            progress: Math.floor((processedCount / files.length) * 100),
          };
        }

        // Build TF-IDF index
        const documents = files.map((file) => ({
          uri: `file://${file.path}`,
          content: file.content,
        }));

        const tfidfIndex = await buildSearchIndex(documents, onProgress);

        // Build vector index if embedding provider available
        let vectorStorage: VectorStorage | undefined;
        if (embeddingProvider) {
          const vectorIndexPath = path.join(cacheDir, 'codebase-vectors.hnsw');
          vectorStorage = new VectorStorage(vectorIndexPath, embeddingProvider.dimensions);

          const vectorBatchSize = 10;
          for (let i = 0; i < files.length; i += vectorBatchSize) {
            const batch = files.slice(i, i + vectorBatchSize);
            const texts = batch.map((f) => f.content);
            const embeddings = await embeddingProvider.generateEmbeddings(texts);

            for (let j = 0; j < batch.length; j++) {
              const file = batch[j];
              const embedding = embeddings[j];

              const doc: VectorDocument = {
                id: `file://${file.path}`,
                embedding,
                metadata: {
                  type: 'code',
                  language: file.language || '',
                  content: file.content.slice(0, 500),
                  category: '',
                },
              };

              vectorStorage.addDocument(doc);
            }
          }

          vectorStorage.save();
        }

        // Update cache
        cache = {
          version: '1.0.0',
          codebaseRoot,
          indexedAt: new Date().toISOString(),
          fileCount: files.length,
          files: fileMap,
          tfidfIndex,
          vectorIndexPath: vectorStorage ? path.join(cacheDir, 'codebase-vectors.hnsw') : undefined,
        };

        await saveCache(cache);

        status = { ...status, indexedFiles: changedFiles.length, progress: 100 };

        return {
          tfidfIndex,
          vectorStorage,
          stats: {
            totalFiles: files.length,
            indexedFiles: changedFiles.length,
            skippedFiles: files.length - changedFiles.length,
            cacheHit: false,
          },
        };
      } finally {
        status = { ...status, isIndexing: false };
      }
    },

    /**
     * Search codebase using TF-IDF
     */
    search: async (query, opts = {}) => {
      const { limit = 10, minScore = 0, includeContent = true } = opts;

      const index = await buildTFIDFIndexFromDB();
      if (!index) {
        throw new Error('No search index available. Please run indexCodebase first.');
      }

      const { searchDocuments } = await import('./tfidf.js');
      const searchResults = searchDocuments(query, index, { limit, minScore });

      const results = [];
      for (const result of searchResults) {
        const filePath = result.uri?.replace('file://', '') || '';
        let content: string | undefined;

        if (includeContent) {
          try {
            const file = await db.getCodebaseFile(filePath);
            content = file?.content;
          } catch {
            // Don't include content if unable to retrieve
          }
        }

        results.push({
          path: filePath,
          score: result.score || 0,
          content,
        });
      }

      return results;
    },

    /**
     * Get cache statistics
     */
    getCacheStats: async () => {
      try {
        await db.initialize();
        const stats = await db.getCodebaseIndexStats();
        return {
          exists: stats.totalFiles > 0,
          fileCount: stats.totalFiles,
          indexedAt: stats.indexedAt,
        };
      } catch (error) {
        logger.error('Failed to get cache stats', { error });
        return {
          exists: false,
          fileCount: 0,
        };
      }
    },

    /**
     * Clear cache
     */
    clearCache: async () => {
      if (reindexTimer) {
        clearTimeout(reindexTimer);
        reindexTimer = undefined;
      }

      try {
        await db.initialize();
        await db.clearCodebaseIndex();

        const cachePath = path.join(cacheDir, 'codebase-index.json');
        if (fs.existsSync(cachePath)) {
          fs.unlinkSync(cachePath);
        }

        const vectorPath = path.join(cacheDir, 'codebase-vectors.hnsw');
        if (fs.existsSync(vectorPath)) {
          fs.unlinkSync(vectorPath);
        }

        logger.info('Cache cleared from database and files');
      } catch (error) {
        logger.error('Failed to clear cache', { error });
      }
    },

    /**
     * Start watching codebase directory for changes
     */
    startWatching: () => {
      if (watcher) {
        logger.info('Codebase watcher already running');
        return;
      }

      try {
        watcher = chokidar.watch(codebaseRoot, {
          ignored: [
            /(^|[\/\\])\../,
            /node_modules/,
            /\.git\//,
            /\.sylphx-flow\//,
            '**/dist/**',
            '**/build/**',
            '**/coverage/**',
          ],
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100,
          },
        });

        watcher.on('all', (event, filePath) => {
          if (!isTextFile(filePath)) return;

          const relativePath = path.relative(codebaseRoot, filePath);
          if (ig.ignores(relativePath)) return;

          logger.debug('Codebase file changed', { event, file: path.basename(filePath) });

          if (reindexTimer) {
            clearTimeout(reindexTimer);
          }

          reindexTimer = setTimeout(async () => {
            logger.info('Re-indexing codebase due to file changes');
            try {
              await api.indexCodebase();
              logger.info('Codebase re-indexing complete');
            } catch (error) {
              logger.error('Codebase re-indexing failed', { error });
            }
          }, 5000);
        });

        logger.info('Watching codebase directory for changes', { codebaseRoot });
      } catch (error) {
        logger.error('Failed to start codebase file watching', { error });
      }
    },

    /**
     * Stop watching
     */
    stopWatching: () => {
      if (reindexTimer) {
        clearTimeout(reindexTimer);
        reindexTimer = undefined;
      }

      if (watcher) {
        watcher.close();
        watcher = undefined;
        logger.info('Stopped watching codebase directory');
      }
    },
  };

  return Object.freeze(api);
}
