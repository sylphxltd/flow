/**
 * Codebase indexing with .gitignore support
 * Runtime indexing with intelligent caching
 *
 * Features:
 * - Optional file watching for automatic re-indexing (controlled by MCP server)
 * - Respects .gitignore patterns
 * - Debounced re-indexing (5 seconds after last change)
 */

import chokidar from 'chokidar';
import fs from 'node:fs';
import path from 'node:path';
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
import { type SearchIndex, buildSearchIndexFromDB, buildSearchIndex } from './tfidf.js';

export interface CodebaseFile {
  path: string; // Relative path from codebase root
  absolutePath: string;
  content: string;
  language?: string; // Detected programming language
  size: number;
  mtime: number; // Last modified time
}

export interface IndexCache {
  version: string;
  codebaseRoot: string;
  indexedAt: string;
  fileCount: number;
  files: Map<string, { mtime: number; hash: string }>; // Track file changes
  tfidfIndex?: SearchIndex;
  vectorIndexPath?: string;
}

export interface CodebaseIndexerOptions {
  codebaseRoot?: string;
  cacheDir?: string;
  batchSize?: number;
}

/**
 * Codebase Indexer with caching
 */
export interface IndexingStatus {
  isIndexing: boolean;
  progress: number; // 0-100
  currentFile?: string;
  totalFiles: number;
  indexedFiles: number;
}

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
      console.error('[ERROR] Failed to load cache from database:', error);
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
      console.error('[ERROR] Failed to save cache to database:', error);
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
      console.error('[ERROR] Failed to get cache stats:', error);
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
  ): Promise<Array<{
    path: string;
    score: number;
    content?: string;
    language?: string;
  }>> {
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
      console.error('[INFO] Codebase watcher already running');
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

        console.error(`[INFO] Codebase file ${event}: ${path.basename(filePath)}`);

        // Debounce: Wait 5 seconds after last change before re-indexing
        // (Longer than knowledge because code files save more frequently)
        if (this.reindexTimer) {
          clearTimeout(this.reindexTimer);
        }

        this.reindexTimer = setTimeout(async () => {
          console.error('[INFO] Re-indexing codebase due to file changes...');
          try {
            await this.index();
            console.error('[INFO] Codebase re-indexing complete');
          } catch (error) {
            console.error('[ERROR] Codebase re-indexing failed:', error);
          }
        }, 5000);
      });

      console.error(`[INFO] Watching codebase directory for changes: ${this.codebaseRoot}`);
    } catch (error) {
      console.error('[ERROR] Failed to start codebase file watching:', error);
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
      console.error('[INFO] Stopped watching codebase directory');
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

      console.error('[INFO] Cache cleared from database and files');
    } catch (error) {
      console.error('[ERROR] Failed to clear cache:', error);
    }
  }
}
