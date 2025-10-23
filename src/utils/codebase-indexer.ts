/**
 * Codebase indexing with .gitignore support
 * Runtime indexing with intelligent caching
 */

import fs from 'node:fs';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';
import { buildSearchIndex, type SearchIndex } from './tfidf.js';
import { VectorStorage, type VectorDocument } from './vector-storage.js';
import type { EmbeddingProvider } from './embeddings.js';

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

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TSX',
    '.js': 'JavaScript',
    '.jsx': 'JSX',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.rs': 'Rust',
    '.c': 'C',
    '.cpp': 'C++',
    '.cs': 'C#',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.sql': 'SQL',
    '.sh': 'Shell',
    '.bash': 'Bash',
  };
  return languageMap[ext];
}

/**
 * Check if file is text-based (not binary)
 */
function isTextFile(filePath: string): boolean {
  const textExtensions = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.java',
    '.go',
    '.rs',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.cs',
    '.rb',
    '.php',
    '.swift',
    '.kt',
    '.md',
    '.txt',
    '.json',
    '.yaml',
    '.yml',
    '.toml',
    '.xml',
    '.html',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.sql',
    '.sh',
    '.bash',
    '.env',
    '.gitignore',
    '.dockerignore',
  ]);

  const ext = path.extname(filePath).toLowerCase();
  return textExtensions.has(ext) || !ext; // Files without extension might be text
}

/**
 * Load .gitignore patterns
 */
function loadGitignore(codebaseRoot: string): Ignore {
  const ig = ignore();

  // Always ignore common patterns
  ig.add([
    'node_modules/',
    '.git/',
    'dist/',
    'build/',
    '.next/',
    '.cache/',
    'coverage/',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
  ]);

  // Load .gitignore if exists
  const gitignorePath = path.join(codebaseRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    ig.add(gitignoreContent);
  }

  return ig;
}

/**
 * Recursively scan codebase for text files
 */
function scanCodebase(
  dir: string,
  codebaseRoot: string,
  ig: Ignore,
  options: {
    maxFileSize?: number; // Skip files larger than this (bytes)
    maxFiles?: number; // Stop after indexing this many files
  } = {}
): CodebaseFile[] {
  const { maxFileSize = 1024 * 1024, maxFiles = 10000 } = options; // 1MB default
  const results: CodebaseFile[] = [];

  function scan(currentDir: string) {
    if (results.length >= maxFiles) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxFiles) break;

      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(codebaseRoot, absolutePath);

      // Check .gitignore
      if (ig.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        scan(absolutePath);
      } else if (entry.isFile() && isTextFile(entry.name)) {
        try {
          const stats = fs.statSync(absolutePath);

          // Skip large files
          if (stats.size > maxFileSize) {
            console.warn(`[WARN] Skipping large file: ${relativePath} (${stats.size} bytes)`);
            continue;
          }

          const content = fs.readFileSync(absolutePath, 'utf8');
          const language = detectLanguage(entry.name);

          results.push({
            path: relativePath,
            absolutePath,
            content,
            language,
            size: stats.size,
            mtime: stats.mtimeMs,
          });
        } catch (error) {
          console.warn(`[WARN] Failed to read file: ${relativePath}`, error);
        }
      }
    }
  }

  scan(dir);
  return results;
}

/**
 * Calculate simple hash for file content (for change detection)
 */
function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Codebase Indexer with caching
 */
export class CodebaseIndexer {
  private codebaseRoot: string;
  private cacheDir: string;
  private cache: IndexCache | null = null;
  private ig: Ignore;

  constructor(codebaseRoot: string, cacheDir: string) {
    this.codebaseRoot = codebaseRoot;
    this.cacheDir = cacheDir;
    this.ig = loadGitignore(codebaseRoot);

    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  /**
   * Load cache from disk
   */
  private loadCache(): IndexCache | null {
    const cachePath = path.join(this.cacheDir, 'codebase-index.json');
    if (!fs.existsSync(cachePath)) {
      return null;
    }

    try {
      const cacheData = fs.readFileSync(cachePath, 'utf8');
      const parsed = JSON.parse(cacheData);

      return {
        version: parsed.version,
        codebaseRoot: parsed.codebaseRoot,
        indexedAt: parsed.indexedAt,
        fileCount: parsed.fileCount,
        files: new Map(parsed.files),
        tfidfIndex: parsed.tfidfIndex,
        vectorIndexPath: parsed.vectorIndexPath,
      };
    } catch (error) {
      console.error('[ERROR] Failed to load cache:', error);
      return null;
    }
  }

  /**
   * Save cache to disk
   */
  private saveCache(cache: IndexCache): void {
    const cachePath = path.join(this.cacheDir, 'codebase-index.json');
    const serialized = {
      ...cache,
      files: Array.from(cache.files.entries()),
    };
    fs.writeFileSync(cachePath, JSON.stringify(serialized, null, 2), 'utf8');
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
    this.cache = this.loadCache();

    // Scan codebase
    console.error('[INFO] Scanning codebase...');
    const files = scanCodebase(this.codebaseRoot, this.codebaseRoot, this.ig);
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
              language: file.language,
              content: file.content.slice(0, 500), // Store snippet
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

    this.saveCache(this.cache);

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
  getCacheStats(): {
    exists: boolean;
    fileCount: number;
    indexedAt?: string;
  } {
    const cache = this.loadCache();
    return {
      exists: cache !== null,
      fileCount: cache?.fileCount || 0,
      indexedAt: cache?.indexedAt,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    const cachePath = path.join(this.cacheDir, 'codebase-index.json');
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }

    const vectorPath = path.join(this.cacheDir, 'codebase-vectors.hnsw');
    if (fs.existsSync(vectorPath)) {
      fs.unlinkSync(vectorPath);
    }

    console.error('[INFO] Cache cleared');
  }
}
