/**
 * Types and interfaces for the codebase indexer
 */

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
  tfidfIndex?: import('./tfidf').SearchIndex;
  vectorIndexPath?: string;
}

export interface CodebaseIndexerOptions {
  codebaseRoot?: string;
  cacheDir?: string;
  batchSize?: number;
}

export interface IndexingStatus {
  isIndexing: boolean;
  progress: number; // 0-100
  currentFile?: string;
  totalFiles: number;
  indexedFiles: number;
}