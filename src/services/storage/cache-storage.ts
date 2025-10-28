/**
 * Cache Storage Implementation - 緩存存儲實現
 * 專門處理臨時緩存數據（可以重新生成，不應該上 Git）
 */

import { count, desc, eq } from 'drizzle-orm';
import { type CacheDatabase, CacheDatabaseClient } from '../../db/cache-db.js';
import {
  type NewCodebaseFile,
  type NewCodebaseMetadata,
  type NewTfidfDocument,
  type NewTfidfIdf,
  type NewTfidfTerm,
  codebaseFiles,
  codebaseMetadata,
  tfidfDocuments,
  tfidfIdf,
  tfidfTerms,
} from '../../db/cache-schema.js';
import { executeOperation } from '../../utils/database-errors.js';

// Codebase file entry interface
export interface CodebaseFileEntry {
  path: string;
  mtime: number;
  hash: string;
  content?: string;
  language?: string;
  size?: number;
  indexedAt: string;
}

// TF-IDF term entry interface
export interface TfidfTermEntry {
  filePath: string;
  term: string;
  frequency: number;
}

// TF-IDF document entry interface
export interface TfidfDocumentEntry {
  filePath: string;
  magnitude: number;
  termCount: number;
  rawTerms: string;
}

// TF-IDF IDF entry interface
export interface TfidfIdfEntry {
  term: string;
  idfValue: number;
}

/**
 * Cache storage implementation
 */
export class CacheStorage {
  private cacheDb: CacheDatabaseClient;
  private cache: CacheDatabase;

  constructor() {
    this.cacheDb = new CacheDatabaseClient();
    this.cache = this.cacheDb.db;
  }

  async initialize(): Promise<void> {
    await this.cacheDb.initialize();
  }

  // === Codebase Files Operations ===

  /**
   * Store a codebase file entry
   */
  async setCodebaseFile(file: NewCodebaseFile): Promise<void> {
    return executeOperation(`set codebase file: ${file.path}`, async () => {
      await this.cache
        .insert(codebaseFiles)
        .values(file)
        .onConflictDoUpdate({
          target: codebaseFiles.path,
          set: {
            mtime: file.mtime,
            hash: file.hash,
            content: file.content,
            language: file.language,
            size: file.size,
            indexedAt: file.indexedAt,
          },
        });
    });
  }

  /**
   * Get a codebase file entry
   */
  async getCodebaseFile(path: string): Promise<CodebaseFileEntry | null> {
    return executeOperation(`get codebase file: ${path}`, async () => {
      const result = await this.cache
        .select()
        .from(codebaseFiles)
        .where(eq(codebaseFiles.path, path))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const entry = result[0];
      return {
        path: entry.path,
        mtime: entry.mtime,
        hash: entry.hash,
        content: entry.content || undefined,
        language: entry.language || undefined,
        size: entry.size || undefined,
        indexedAt: entry.indexedAt,
      };
    });
  }

  /**
   * Get all codebase files
   */
  async getAllCodebaseFiles(): Promise<CodebaseFileEntry[]> {
    return executeOperation('get all codebase files', async () => {
      const results = await this.cache
        .select()
        .from(codebaseFiles)
        .orderBy(desc(codebaseFiles.mtime));

      return results.map((entry) => ({
        path: entry.path,
        mtime: entry.mtime,
        hash: entry.hash,
        content: entry.content || undefined,
        language: entry.language || undefined,
        size: entry.size || undefined,
        indexedAt: entry.indexedAt,
      }));
    });
  }

  /**
   * Delete a codebase file entry
   */
  async deleteCodebaseFile(path: string): Promise<boolean> {
    return executeOperation(`delete codebase file: ${path}`, async () => {
      const _result = await this.cache.delete(codebaseFiles).where(eq(codebaseFiles.path, path));

      // For libSQL, we need to check if the deletion was successful
      // by trying to select the record afterwards
      const exists = await this.cache
        .select()
        .from(codebaseFiles)
        .where(eq(codebaseFiles.path, path))
        .limit(1);

      return exists.length === 0;
    });
  }

  /**
   * Clear all codebase files
   */
  async clearCodebaseFiles(): Promise<void> {
    return executeOperation('clear codebase files', async () => {
      await this.cache.delete(codebaseFiles);
    });
  }

  // === Codebase Metadata Operations ===

  /**
   * Set metadata value
   */
  async setMetadata(key: string, value: string): Promise<void> {
    return executeOperation(`set metadata: ${key}`, async () => {
      await this.cache.insert(codebaseMetadata).values({ key, value }).onConflictDoUpdate({
        target: codebaseMetadata.key,
        set: { value },
      });
    });
  }

  /**
   * Get metadata value
   */
  async getMetadata(key: string): Promise<string | null> {
    return executeOperation(`get metadata: ${key}`, async () => {
      const result = await this.cache
        .select()
        .from(codebaseMetadata)
        .where(eq(codebaseMetadata.key, key))
        .limit(1);

      return result.length > 0 ? result[0].value : null;
    });
  }

  /**
   * Get all metadata
   */
  async getAllMetadata(): Promise<Record<string, string>> {
    return executeOperation('get all metadata', async () => {
      const results = await this.cache.select().from(codebaseMetadata);
      const metadata: Record<string, string> = {};

      for (const entry of results) {
        metadata[entry.key] = entry.value;
      }

      return metadata;
    });
  }

  /**
   * Delete metadata
   */
  async deleteMetadata(key: string): Promise<boolean> {
    return executeOperation(`delete metadata: ${key}`, async () => {
      const _result = await this.cache
        .delete(codebaseMetadata)
        .where(eq(codebaseMetadata.key, key));

      // Check if deletion was successful
      const exists = await this.cache
        .select()
        .from(codebaseMetadata)
        .where(eq(codebaseMetadata.key, key))
        .limit(1);

      return exists.length === 0;
    });
  }

  // === TF-IDF Terms Operations ===

  /**
   * Store TF-IDF terms for a file
   */
  async setTfidfTerms(terms: NewTfidfTerm[]): Promise<void> {
    return executeOperation('set TF-IDF terms', async () => {
      // Clear existing terms for these files
      const filePaths = [...new Set(terms.map((t) => t.filePath))];
      for (const filePath of filePaths) {
        await this.cache.delete(tfidfTerms).where(eq(tfidfTerms.filePath, filePath));
      }

      // Insert new terms
      if (terms.length > 0) {
        await this.cache.insert(tfidfTerms).values(terms);
      }
    });
  }

  /**
   * Get TF-IDF terms for a file
   */
  async getTfidfTerms(filePath: string): Promise<TfidfTermEntry[]> {
    return executeOperation(`get TF-IDF terms for file: ${filePath}`, async () => {
      const results = await this.cache
        .select()
        .from(tfidfTerms)
        .where(eq(tfidfTerms.filePath, filePath));

      return results.map((entry) => ({
        filePath: entry.filePath,
        term: entry.term,
        frequency: entry.frequency,
      }));
    });
  }

  /**
   * Get TF-IDF terms by term
   */
  async getTfidfTermsByTerm(term: string): Promise<TfidfTermEntry[]> {
    return executeOperation(`get TF-IDF terms by term: ${term}`, async () => {
      const results = await this.cache.select().from(tfidfTerms).where(eq(tfidfTerms.term, term));

      return results.map((entry) => ({
        filePath: entry.filePath,
        term: entry.term,
        frequency: entry.frequency,
      }));
    });
  }

  /**
   * Clear all TF-IDF terms
   */
  async clearTfidfTerms(): Promise<void> {
    return executeOperation('clear TF-IDF terms', async () => {
      await this.cache.delete(tfidfTerms);
    });
  }

  // === TF-IDF Documents Operations ===

  /**
   * Store TF-IDF document vector
   */
  async setTfidfDocument(document: NewTfidfDocument): Promise<void> {
    return executeOperation(`set TF-IDF document: ${document.filePath}`, async () => {
      await this.cache
        .insert(tfidfDocuments)
        .values(document)
        .onConflictDoUpdate({
          target: tfidfDocuments.filePath,
          set: {
            magnitude: document.magnitude,
            termCount: document.termCount,
            rawTerms: document.rawTerms,
          },
        });
    });
  }

  /**
   * Get TF-IDF document vector
   */
  async getTfidfDocument(filePath: string): Promise<TfidfDocumentEntry | null> {
    return executeOperation(`get TF-IDF document: ${filePath}`, async () => {
      const result = await this.cache
        .select()
        .from(tfidfDocuments)
        .where(eq(tfidfDocuments.filePath, filePath))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const entry = result[0];
      return {
        filePath: entry.filePath,
        magnitude: entry.magnitude,
        termCount: entry.termCount,
        rawTerms: entry.rawTerms,
      };
    });
  }

  /**
   * Get all TF-IDF documents
   */
  async getAllTfidfDocuments(): Promise<TfidfDocumentEntry[]> {
    return executeOperation('get all TF-IDF documents', async () => {
      const results = await this.cache.select().from(tfidfDocuments);

      return results.map((entry) => ({
        filePath: entry.filePath,
        magnitude: entry.magnitude,
        termCount: entry.termCount,
        rawTerms: entry.rawTerms,
      }));
    });
  }

  /**
   * Clear all TF-IDF documents
   */
  async clearTfidfDocuments(): Promise<void> {
    return executeOperation('clear TF-IDF documents', async () => {
      await this.cache.delete(tfidfDocuments);
    });
  }

  // === TF-IDF IDF Operations ===

  /**
   * Store IDF value
   */
  async setTfidfIdf(idf: NewTfidfIdf): Promise<void> {
    return executeOperation(`set TF-IDF IDF: ${idf.term}`, async () => {
      await this.cache
        .insert(tfidfIdf)
        .values(idf)
        .onConflictDoUpdate({
          target: tfidfIdf.term,
          set: { idfValue: idf.idfValue },
        });
    });
  }

  /**
   * Get IDF value
   */
  async getTfidfIdf(term: string): Promise<TfidfIdfEntry | null> {
    return executeOperation(`get TF-IDF IDF: ${term}`, async () => {
      const result = await this.cache
        .select()
        .from(tfidfIdf)
        .where(eq(tfidfIdf.term, term))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const entry = result[0];
      return {
        term: entry.term,
        idfValue: entry.idfValue,
      };
    });
  }

  /**
   * Get all IDF values
   */
  async getAllTfidfIdf(): Promise<TfidfIdfEntry[]> {
    return executeOperation('get all TF-IDF IDF values', async () => {
      const results = await this.cache.select().from(tfidfIdf);

      return results.map((entry) => ({
        term: entry.term,
        idfValue: entry.idfValue,
      }));
    });
  }

  /**
   * Clear all IDF values
   */
  async clearTfidfIdf(): Promise<void> {
    return executeOperation('clear TF-IDF IDF values', async () => {
      await this.cache.delete(tfidfIdf);
    });
  }

  // === Utility Operations ===

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    codebaseFiles: number;
    metadataEntries: number;
    tfidfTerms: number;
    tfidfDocuments: number;
    tfidfIdfValues: number;
  }> {
    return executeOperation('get cache statistics', async () => {
      const [
        codebaseFilesResult,
        metadataResult,
        tfidfTermsResult,
        tfidfDocumentsResult,
        tfidfIdfResult,
      ] = await Promise.all([
        this.cache.select({ count: count() }).from(codebaseFiles),
        this.cache.select({ count: count() }).from(codebaseMetadata),
        this.cache.select({ count: count() }).from(tfidfTerms),
        this.cache.select({ count: count() }).from(tfidfDocuments),
        this.cache.select({ count: count() }).from(tfidfIdf),
      ]);

      return {
        codebaseFiles: codebaseFilesResult[0]?.count || 0,
        metadataEntries: metadataResult[0]?.count || 0,
        tfidfTerms: tfidfTermsResult[0]?.count || 0,
        tfidfDocuments: tfidfDocumentsResult[0]?.count || 0,
        tfidfIdfValues: tfidfIdfResult[0]?.count || 0,
      };
    });
  }

  /**
   * Clear all cache data
   */
  async clearAll(): Promise<void> {
    return executeOperation('clear all cache data', async () => {
      await Promise.all([
        this.cache.delete(codebaseFiles),
        this.cache.delete(codebaseMetadata),
        this.cache.delete(tfidfTerms),
        this.cache.delete(tfidfDocuments),
        this.cache.delete(tfidfIdf),
      ]);
    });
  }
}
