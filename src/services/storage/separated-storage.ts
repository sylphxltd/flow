/**
 * Separated storage implementation - 分離式存儲
 * Memory 數據存儲在 memory.db (應該上 Git)
 * Cache 數據存儲在 cache.db (不應該上 Git)
 *
 * This file now acts as a compatibility layer that delegates to the specialized storage modules
 */

import {
  CacheStorage,
  type CodebaseFileEntry,
  type TfidfDocumentEntry,
  type TfidfIdfEntry,
  type TfidfTermEntry,
} from './cache-storage.js';
import { type MemoryEntry, MemoryStorage } from './memory-storage.js';

// Re-export interfaces for backward compatibility
export type { MemoryEntry } from './memory-storage.js';
export type {
  CodebaseFileEntry,
  TfidfTermEntry,
  TfidfDocumentEntry,
  TfidfIdfEntry,
} from './cache-storage.js';

/**
 * Separated storage implementation - Compatibility Layer
 *
 * This class maintains backward compatibility while delegating to the specialized
 * storage modules. New code should use MemoryStorage and CacheStorage directly.
 */
export class SeparatedMemoryStorage {
  private memoryStorage: MemoryStorage;
  private cacheStorage: CacheStorage;

  constructor() {
    this.memoryStorage = new MemoryStorage();
    this.cacheStorage = new CacheStorage();
  }

  async initialize(): Promise<void> {
    await Promise.all([this.memoryStorage.initialize(), this.cacheStorage.initialize()]);
  }

  // === Memory Operations (delegated to MemoryStorage) ===

  /**
   * Set a memory entry
   */
  async set(key: string, value: any, namespace = 'default'): Promise<void> {
    return this.memoryStorage.set(key, value, namespace);
  }

  /**
   * Get a memory entry
   */
  async get(key: string, namespace = 'default'): Promise<MemoryEntry | null> {
    return this.memoryStorage.get(key, namespace);
  }

  /**
   * Get all memory entries
   */
  async getAll(namespace?: string): Promise<MemoryEntry[]> {
    return this.memoryStorage.getAll(namespace);
  }

  /**
   * Search memory entries
   */
  async search(pattern: string, namespace?: string): Promise<MemoryEntry[]> {
    return this.memoryStorage.search(pattern, namespace);
  }

  /**
   * Delete a memory entry
   */
  async delete(key: string, namespace = 'default'): Promise<boolean> {
    return this.memoryStorage.delete(key, namespace);
  }

  /**
   * Clear all memory entries in a namespace
   */
  async clear(namespace = 'default'): Promise<void> {
    return this.memoryStorage.clear(namespace);
  }

  /**
   * Get memory statistics
   */
  async getStats(namespace?: string): Promise<{
    totalEntries: number;
    namespaces: string[];
  }> {
    return this.memoryStorage.getStats(namespace);
  }

  // === Codebase Files Operations (delegated to CacheStorage) ===

  /**
   * Store a codebase file entry
   */
  async setCodebaseFile(
    path: string,
    mtime: number,
    hash: string,
    content?: string,
    language?: string,
    size?: number
  ): Promise<void> {
    const indexedAt = new Date().toISOString();
    return this.cacheStorage.setCodebaseFile({
      path,
      mtime,
      hash,
      content,
      language,
      size,
      indexedAt,
    });
  }

  /**
   * Get a codebase file entry
   */
  async getCodebaseFile(path: string): Promise<CodebaseFileEntry | null> {
    return this.cacheStorage.getCodebaseFile(path);
  }

  /**
   * Get all codebase files
   */
  async getAllCodebaseFiles(): Promise<CodebaseFileEntry[]> {
    return this.cacheStorage.getAllCodebaseFiles();
  }

  /**
   * Delete a codebase file entry
   */
  async deleteCodebaseFile(path: string): Promise<boolean> {
    return this.cacheStorage.deleteCodebaseFile(path);
  }

  /**
   * Clear all codebase files
   */
  async clearCodebaseFiles(): Promise<void> {
    return this.cacheStorage.clearCodebaseFiles();
  }

  // === Metadata Operations (delegated to CacheStorage) ===

  /**
   * Set metadata value
   */
  async setMetadata(key: string, value: string): Promise<void> {
    return this.cacheStorage.setMetadata(key, value);
  }

  /**
   * Get metadata value
   */
  async getMetadata(key: string): Promise<string | null> {
    return this.cacheStorage.getMetadata(key);
  }

  /**
   * Get all metadata
   */
  async getAllMetadata(): Promise<Record<string, string>> {
    return this.cacheStorage.getAllMetadata();
  }

  /**
   * Delete metadata
   */
  async deleteMetadata(key: string): Promise<boolean> {
    return this.cacheStorage.deleteMetadata(key);
  }

  // === TF-IDF Terms Operations (delegated to CacheStorage) ===

  /**
   * Store TF-IDF terms for a file
   */
  async setTfidfTerms(
    terms: Array<{ filePath: string; term: string; frequency: number }>
  ): Promise<void> {
    return this.cacheStorage.setTfidfTerms(terms);
  }

  /**
   * Get TF-IDF terms for a file
   */
  async getTfidfTerms(filePath: string): Promise<TfidfTermEntry[]> {
    return this.cacheStorage.getTfidfTerms(filePath);
  }

  /**
   * Get TF-IDF terms by term
   */
  async getTfidfTermsByTerm(term: string): Promise<TfidfTermEntry[]> {
    return this.cacheStorage.getTfidfTermsByTerm(term);
  }

  /**
   * Clear all TF-IDF terms
   */
  async clearTfidfTerms(): Promise<void> {
    return this.cacheStorage.clearTfidfTerms();
  }

  // === TF-IDF Documents Operations (delegated to CacheStorage) ===

  /**
   * Store TF-IDF document vector
   */
  async setTfidfDocument(
    filePath: string,
    magnitude: number,
    termCount: number,
    rawTerms: string
  ): Promise<void> {
    return this.cacheStorage.setTfidfDocument({
      filePath,
      magnitude,
      termCount,
      rawTerms,
    });
  }

  /**
   * Get TF-IDF document (alias for getTfidfDocument for compatibility)
   */
  async getTFIDFDocument(filePath: string): Promise<TfidfDocumentEntry | null> {
    return this.cacheStorage.getTfidfDocument(filePath);
  }

  /**
   * Get all TF-IDF documents
   */
  async getAllTfidfDocuments(): Promise<TfidfDocumentEntry[]> {
    return this.cacheStorage.getAllTfidfDocuments();
  }

  /**
   * Clear all TF-IDF documents
   */
  async clearTfidfDocuments(): Promise<void> {
    return this.cacheStorage.clearTfidfDocuments();
  }

  // === TF-IDF IDF Operations (delegated to CacheStorage) ===

  /**
   * Store IDF value
   */
  async setTfidfIdf(term: string, idfValue: number): Promise<void> {
    return this.cacheStorage.setTfidfIdf({ term, idfValue });
  }

  /**
   * Get IDF value
   */
  async getTfidfIdf(term: string): Promise<TfidfIdfEntry | null> {
    return this.cacheStorage.getTfidfIdf(term);
  }

  /**
   * Get all IDF values
   */
  async getAllTfidfIdf(): Promise<TfidfIdfEntry[]> {
    return this.cacheStorage.getAllTfidfIdf();
  }

  /**
   * Clear all IDF values
   */
  async clearTfidfIdf(): Promise<void> {
    return this.cacheStorage.clearTfidfIdf();
  }

  // === Utility Operations ===

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStats(): Promise<{
    codebaseFiles: number;
    metadataEntries: number;
    tfidfTerms: number;
    tfidfDocuments: number;
    tfidfIdfValues: number;
  }> {
    return this.cacheStorage.getStats();
  }

  /**
   * Clear all cache data
   */
  async clearAllCache(): Promise<void> {
    return this.cacheStorage.clearAll();
  }

  /**
   * Get comprehensive statistics for both memory and cache
   */
  async getAllStats(): Promise<{
    memory: {
      totalEntries: number;
      namespaces: string[];
    };
    cache: {
      codebaseFiles: number;
      metadataEntries: number;
      tfidfTerms: number;
      tfidfDocuments: number;
      tfidfIdfValues: number;
    };
  }> {
    const [memoryStats, cacheStats] = await Promise.all([
      this.memoryStorage.getStats(),
      this.cacheStorage.getStats(),
    ]);

    return {
      memory: memoryStats,
      cache: cacheStats,
    };
  }

  /**
   * Clear all data (both memory and cache)
   */
  async clearAll(): Promise<void> {
    await Promise.all([this.memoryStorage.clear('default'), this.cacheStorage.clearAll()]);
  }

  // === Additional methods for UnifiedSearchService compatibility ===

  /**
   * Get codebase index statistics
   */
  async getCodebaseIndexStats(): Promise<{
    indexedAt?: string;
    totalFiles: number;
    totalTerms: number;
  }> {
    const metadata = await this.cacheStorage.getAllMetadata();
    return {
      indexedAt: metadata.indexedAt,
      totalFiles: Number.parseInt(metadata.totalFiles || '0'),
      totalTerms: Number.parseInt(metadata.totalTerms || '0'),
    };
  }

  /**
   * Get IDF values (alias for getAllTfidfIdf)
   */
  async getIDFValues(): Promise<Record<string, number>> {
    const entries = await this.cacheStorage.getAllTfidfIdf();
    const idfValues: Record<string, number> = {};
    for (const entry of entries) {
      idfValues[entry.term] = entry.idfValue;
    }
    return idfValues;
  }

  /**
   * Upsert TF-IDF document (alias for setTfidfDocument)
   */
  async upsertTFIDFDocument(
    filePath: string,
    document: {
      magnitude: number;
      termCount: number;
      rawTerms: Record<string, number>;
    }
  ): Promise<void> {
    return this.cacheStorage.setTfidfDocument({
      filePath,
      magnitude: document.magnitude,
      termCount: document.termCount,
      rawTerms: JSON.stringify(document.rawTerms),
    });
  }

  /**
   * Upsert codebase file (alias for setCodebaseFile)
   */
  async upsertCodebaseFile(file: {
    path: string;
    mtime: number;
    hash: string;
    content?: string;
    language?: string;
    size?: number;
    indexedAt?: string;
  }): Promise<void> {
    return this.cacheStorage.setCodebaseFile({
      ...file,
      indexedAt: file.indexedAt || new Date().toISOString(),
    });
  }

  /**
   * Set IDF values (alias for multiple setTfidfIdf calls)
   */
  async setIDFValues(idfValues: Record<string, number>): Promise<void> {
    const promises = Object.entries(idfValues).map(([term, idfValue]) =>
      this.cacheStorage.setTfidfIdf({ term, idfValue })
    );
    await Promise.all(promises);
  }

  /**
   * Clear codebase index
   */
  async clearCodebaseIndex(): Promise<void> {
    await Promise.all([
      this.cacheStorage.clearCodebaseFiles(),
      this.cacheStorage.clearTfidfTerms(),
      this.cacheStorage.clearTfidfDocuments(),
      this.cacheStorage.clearTfidfIdf(),
    ]);
  }

  /**
   * Get codebase metadata (alias for getMetadata)
   */
  async getCodebaseMetadata(key: string): Promise<string | null> {
    return this.cacheStorage.getMetadata(key);
  }

  /**
   * Set codebase metadata (alias for setMetadata)
   */
  async setCodebaseMetadata(key: string, value: string): Promise<void> {
    return this.cacheStorage.setMetadata(key, value);
  }

  /**
   * Get TF-IDF terms for a file
   */
  async getTFIDFTerms(filePath: string): Promise<Record<string, number>> {
    const entries = await this.cacheStorage.getTfidfTerms(filePath);
    const terms: Record<string, number> = {};
    for (const entry of entries) {
      terms[entry.term] = entry.frequency;
    }
    return terms;
  }

  /**
   * Set TF-IDF terms (alias for setTfidfTerms)
   */
  async setTFIDFTerms(filePath: string, terms: Record<string, number>): Promise<void> {
    const termsWithFilePath = Object.entries(terms).map(([term, frequency]) => ({
      filePath,
      term,
      frequency,
    }));
    return this.cacheStorage.setTfidfTerms(termsWithFilePath);
  }
}
