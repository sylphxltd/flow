/**
 * Codebase indexing with .gitignore support
 * Runtime indexing with intelligent caching
 */

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
} from './codebase-helpers.js';
import type { EmbeddingProvider } from './embeddings.js';
import { SeparatedMemoryStorage } from './separated-storage.js';
import { type SearchIndex, buildSearchIndex } from './tfidf.js';
import { type VectorDocument, VectorStorage } from './vector-storage.js';

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
export class CodebaseIndexer {
  private codebaseRoot: string;
  private cacheDir: string;
  private cache: IndexCache | null = null;
  private ig: Ignore;
  private db: SeparatedMemoryStorage;
  private options: CodebaseIndexerOptions;

  constructor(options: CodebaseIndexerOptions = {}) {
    this.options = { batchSize: 100, ...options };
    this.codebaseRoot = options.codebaseRoot || process.cwd();
    this.cacheDir = options.cacheDir || path.join(this.codebaseRoot, '.sylphx-flow', 'cache');
    this.ig = loadGitignore(this.codebaseRoot);
    this.db = new SeparatedMemoryStorage();
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
          const rawTerms = tfidfDoc.rawTerms || {};
          const terms = new Map<string, number>();
          const rawTermsMap = new Map<string, number>();

          for (const [term, freq] of Object.entries(rawTerms)) {
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

      console.error('[INFO] Cache saved to database');
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

    // Load existing cache
    this.cache = await this.loadCache();

    // Scan codebase
    console.error('[INFO] Scanning codebase...');
    const files = scanFiles(this.codebaseRoot, {
      codebaseRoot: this.codebaseRoot,
      ignoreFilter: this.ig,
    });
    console.error(`[INFO] Found ${files.length} files`);

    // Validate cache (check if file count changed significantly)
    if (this.cache && !force) {
      const fileCountDiff = Math.abs(files.length - this.cache.fileCount);
      const fileCountChangePercent = (fileCountDiff / this.cache.fileCount) * 100;

      // If file count changed by >20%, force full reindex for safety
      if (fileCountChangePercent > 20) {
        console.error(
          `[WARN] File count changed significantly (${fileCountChangePercent.toFixed(1)}%), forcing full reindex`
        );
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
      console.error('[INFO] Cache hit! Using cached index');
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

    // Log changes
    if (changedFiles.length > 0) {
      console.error(`[INFO] Changed files: ${changedFiles.length}`);
    }
    if (deletedFiles.length > 0) {
      console.error(`[INFO] Deleted files: ${deletedFiles.length}`);
    }

    console.error(`[INFO] Indexing ${changedFiles.length} changed files...`);

    // Build TF-IDF index
    const documents = files.map((file) => ({
      uri: `file://${file.path}`,
      content: file.content,
    }));

    const tfidfIndex = buildSearchIndex(documents);

    // Build vector index if embedding provider is available
    let vectorStorage: VectorStorage | undefined;
    if (embeddingProvider) {
      console.error('[INFO] Generating embeddings...');
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

        console.error(
          `[INFO] Embedded ${Math.min(i + batchSize, files.length)}/${files.length} files`
        );
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
   * Clear cache
   */
  async clearCache(): Promise<void> {
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
