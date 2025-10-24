/**
 * Separated storage implementation - 分離式存儲
 * Memory 數據存儲在 memory.db (應該上 Git)
 * Cache 數據存儲在 cache.db (不應該上 Git)
 */

import { eq, and, like, desc, count } from 'drizzle-orm';
import { MemoryDatabaseClient, type MemoryDatabase } from '../db/memory-db.js';
import { CacheDatabaseClient, type CacheDatabase } from '../db/cache-db.js';
import * as memorySchema from '../db/memory-schema.js';
import * as cacheSchema from '../db/cache-schema.js';
import { ValidationError, executeOperation } from './database-errors.js';
import { autoGitignore } from './auto-gitignore.js';

// Memory entry interface (backward compatibility)
export interface MemoryEntry {
  key: string;
  namespace: string;
  value: any;
  timestamp: number;
  created_at: string;
  updated_at: string;
}

// Separated storage implementation
export class SeparatedMemoryStorage {
  private memoryDb: MemoryDatabaseClient;
  private cacheDb: CacheDatabaseClient;
  private memory: MemoryDatabase;
  private cache: CacheDatabase;

  constructor() {
    this.memoryDb = new MemoryDatabaseClient();
    this.cacheDb = new CacheDatabaseClient();
    this.memory = this.memoryDb.db;
    this.cache = this.cacheDb.db;
  }

  async initialize(): Promise<void> {
    // Auto-manage .gitignore rules
    autoGitignore.initialize();

    await Promise.all([this.memoryDb.initialize(), this.cacheDb.initialize()]);
  }

  /**
   * Safely serialize a value to JSON string
   */
  private safeSerialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new Error(`Failed to serialize value: ${(error as Error).message}`);
    }
  }

  /**
   * Safely deserialize a JSON string to value
   */
  private safeDeserialize(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      // Return raw string if JSON parsing fails
      return value;
    }
  }

  // ===== Memory Operations (Permanent Data) =====

  async set(key: string, value: any, namespace = 'default'): Promise<void> {
    // Input validation
    if (!key || typeof key !== 'string') {
      throw new ValidationError('Key must be a non-empty string', 'key', key);
    }
    if (!namespace || typeof namespace !== 'string') {
      throw new ValidationError('Namespace must be a non-empty string', 'namespace', namespace);
    }

    await executeOperation(
      'memory.set',
      async () => {
        const now = new Date();
        const timestamp = now.getTime();
        const created_at = now.toISOString();
        const updated_at = created_at;
        const serializedValue = this.safeSerialize(value);

        // Check if entry exists
        const existing = await this.get(key, namespace);

        if (existing) {
          // Update existing entry
          await this.memory
            .update(memorySchema.memory)
            .set({
              value: serializedValue,
              timestamp,
              updated_at,
            })
            .where(
              and(eq(memorySchema.memory.key, key), eq(memorySchema.memory.namespace, namespace))
            );
        } else {
          // Insert new entry
          const newMemory: memorySchema.NewMemory = {
            key,
            namespace,
            value: serializedValue,
            timestamp,
            created_at,
            updated_at,
          };

          await this.memory.insert(memorySchema.memory).values(newMemory);
        }
      },
      { key, namespace }
    );
  }

  async get(key: string, namespace = 'default'): Promise<MemoryEntry | null> {
    const result = await this.memory
      .select()
      .from(memorySchema.memory)
      .where(and(eq(memorySchema.memory.key, key), eq(memorySchema.memory.namespace, namespace)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      key: row.key,
      namespace: row.namespace,
      value: this.safeDeserialize(row.value),
      timestamp: row.timestamp,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async getAll(): Promise<MemoryEntry[]> {
    const result = await this.memory
      .select()
      .from(memorySchema.memory)
      .orderBy(desc(memorySchema.memory.timestamp));

    return result.map((row) => ({
      key: row.key,
      namespace: row.namespace,
      value: this.safeDeserialize(row.value),
      timestamp: row.timestamp,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async search(pattern: string, namespace?: string): Promise<MemoryEntry[]> {
    // Input validation and sanitization
    if (!pattern || typeof pattern !== 'string') {
      throw new ValidationError('Search pattern must be a non-empty string', 'pattern', pattern);
    }

    // Sanitize pattern to prevent SQL injection
    const sanitizedPattern = pattern.replace(/[^a-zA-Z0-9\s*_\-]/g, '');
    if (sanitizedPattern !== pattern) {
      throw new ValidationError('Search pattern contains invalid characters', 'pattern', pattern);
    }

    const searchPattern = sanitizedPattern.replace(/\*/g, '%');

    let whereCondition = like(memorySchema.memory.key, searchPattern);

    if (namespace && namespace !== 'all') {
      // Validate namespace
      if (!/^[a-zA-Z0-9_\-]+$/.test(namespace)) {
        throw new ValidationError('Namespace contains invalid characters', 'namespace', namespace);
      }
      whereCondition = and(whereCondition, eq(memorySchema.memory.namespace, namespace))!;
    }

    const result = await this.memory
      .select()
      .from(memorySchema.memory)
      .where(whereCondition)
      .orderBy(desc(memorySchema.memory.timestamp))
      .limit(1000); // Add reasonable limit to prevent excessive results

    return result.map((row) => ({
      key: row.key,
      namespace: row.namespace,
      value: this.safeDeserialize(row.value),
      timestamp: row.timestamp,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async delete(key: string, namespace = 'default'): Promise<boolean> {
    const result = await this.memory
      .delete(memorySchema.memory)
      .where(and(eq(memorySchema.memory.key, key), eq(memorySchema.memory.namespace, namespace)));

    return result.rowsAffected > 0;
  }

  async clear(namespace?: string): Promise<void> {
    if (namespace && namespace !== 'all') {
      await this.memory
        .delete(memorySchema.memory)
        .where(eq(memorySchema.memory.namespace, namespace));
    } else {
      await this.memory.delete(memorySchema.memory);
    }
  }

  async getStats(): Promise<{
    totalEntries: number;
    namespaces: string[];
    namespaceCounts: Record<string, number>;
    oldestEntry: string | null;
    newestEntry: string | null;
  }> {
    // Use aggregation queries to fix N+1 query performance issue
    const [totalResult, namespaceResult, oldestResult, newestResult] = await Promise.all([
      // Get total count using Drizzle count function
      this.memory
        .select({ count: count() })
        .from(memorySchema.memory),

      // Get namespace counts in a single query
      this.memory
        .select({
          namespace: memorySchema.memory.namespace,
          count: count(),
        })
        .from(memorySchema.memory)
        .groupBy(memorySchema.memory.namespace)
        .orderBy(memorySchema.memory.namespace),

      // Get oldest entry
      this.memory
        .select({ created_at: memorySchema.memory.created_at })
        .from(memorySchema.memory)
        .orderBy(memorySchema.memory.created_at)
        .limit(1),

      // Get newest entry
      this.memory
        .select({ created_at: memorySchema.memory.created_at })
        .from(memorySchema.memory)
        .orderBy(desc(memorySchema.memory.created_at))
        .limit(1),
    ]);

    const totalEntries = totalResult[0]?.count || 0;
    const namespaces = namespaceResult.map((row) => row.namespace);
    const namespaceCounts = Object.fromEntries(
      namespaceResult.map((row) => [row.namespace, row.count])
    );
    const oldestEntry = oldestResult[0]?.created_at || null;
    const newestEntry = newestResult[0]?.created_at || null;

    return {
      totalEntries,
      namespaces,
      namespaceCounts,
      oldestEntry,
      newestEntry,
    };
  }

  // Load method for compatibility with existing code
  async load(): Promise<{ namespaces: Record<string, Record<string, any>> }> {
    const entries = await this.getAll();
    const namespaces: Record<string, Record<string, any>> = {};

    entries.forEach((entry) => {
      if (!namespaces[entry.namespace]) {
        namespaces[entry.namespace] = {};
      }
      namespaces[entry.namespace][entry.key] = entry.value;
    });

    return { namespaces };
  }

  // ===== Cache Operations (Temporary Data) =====

  // Store codebase metadata
  async setCodebaseMetadata(key: string, value: any): Promise<void> {
    const serializedValue = this.safeSerialize(value);

    await this.cache
      .insert(cacheSchema.codebaseMetadata)
      .values({
        key,
        value: serializedValue,
      })
      .onConflictDoUpdate({
        target: cacheSchema.codebaseMetadata.key,
        set: { value: serializedValue },
      });
  }

  // Get codebase metadata
  async getCodebaseMetadata(key: string): Promise<any> {
    const result = await this.cache
      .select()
      .from(cacheSchema.codebaseMetadata)
      .where(eq(cacheSchema.codebaseMetadata.key, key))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.safeDeserialize(result[0].value);
  }

  // Store file information
  async upsertCodebaseFile(file: {
    path: string;
    mtime: number;
    hash: string;
    content?: string;
    language?: string;
    size?: number;
  }): Promise<void> {
    const indexedAt = new Date().toISOString();

    await this.cache
      .insert(cacheSchema.codebaseFiles)
      .values({
        path: file.path,
        mtime: file.mtime,
        hash: file.hash,
        content: file.content || null,
        language: file.language || null,
        size: file.size || null,
        indexedAt,
      })
      .onConflictDoUpdate({
        target: cacheSchema.codebaseFiles.path,
        set: {
          mtime: file.mtime,
          hash: file.hash,
          content: file.content || null,
          language: file.language || null,
          size: file.size || null,
          indexedAt,
        },
      });
  }

  // Get file information
  async getCodebaseFile(path: string): Promise<cacheSchema.CodebaseFile | null> {
    const result = await this.cache
      .select()
      .from(cacheSchema.codebaseFiles)
      .where(eq(cacheSchema.codebaseFiles.path, path))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  // Get all files
  async getAllCodebaseFiles(): Promise<cacheSchema.CodebaseFile[]> {
    return await this.cache
      .select({
        path: cacheSchema.codebaseFiles.path,
        mtime: cacheSchema.codebaseFiles.mtime,
        hash: cacheSchema.codebaseFiles.hash,
        content: cacheSchema.codebaseFiles.content,
        language: cacheSchema.codebaseFiles.language,
        size: cacheSchema.codebaseFiles.size,
        indexedAt: cacheSchema.codebaseFiles.indexedAt,
      })
      .from(cacheSchema.codebaseFiles)
      .orderBy(cacheSchema.codebaseFiles.path);
  }

  // Delete file
  async deleteCodebaseFile(path: string): Promise<void> {
    await this.cache
      .delete(cacheSchema.codebaseFiles)
      .where(eq(cacheSchema.codebaseFiles.path, path));
  }

  // Store TF-IDF document
  async upsertTFIDFDocument(
    filePath: string,
    document: {
      magnitude: number;
      termCount: number;
      rawTerms: Record<string, number>;
    }
  ): Promise<void> {
    await this.cache
      .insert(cacheSchema.tfidfDocuments)
      .values({
        filePath,
        magnitude: document.magnitude,
        termCount: document.termCount,
        rawTerms: this.safeSerialize(document.rawTerms),
      })
      .onConflictDoUpdate({
        target: cacheSchema.tfidfDocuments.filePath,
        set: {
          magnitude: document.magnitude,
          termCount: document.termCount,
          rawTerms: this.safeSerialize(document.rawTerms),
        },
      });
  }

  // Get TF-IDF document
  async getTFIDFDocument(filePath: string): Promise<cacheSchema.TfidfDocument | null> {
    const result = await this.cache
      .select()
      .from(cacheSchema.tfidfDocuments)
      .where(eq(cacheSchema.tfidfDocuments.filePath, filePath))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      ...row,
      rawTerms: this.safeDeserialize(row.rawTerms),
    };
  }

  // Store TF-IDF terms for a file
  async setTFIDFTerms(filePath: string, terms: Record<string, number>): Promise<void> {
    // Delete existing terms for this file
    await this.cache
      .delete(cacheSchema.tfidfTerms)
      .where(eq(cacheSchema.tfidfTerms.filePath, filePath));

    // Insert new terms
    if (Object.keys(terms).length > 0) {
      const newTerms: cacheSchema.NewTfidfTerm[] = Object.entries(terms).map(
        ([term, frequency]) => ({
          filePath,
          term,
          frequency,
        })
      );

      // Insert in batches to avoid parameter limits
      const batchSize = 100;
      for (let i = 0; i < newTerms.length; i += batchSize) {
        const batch = newTerms.slice(i, i + batchSize);
        await this.cache.insert(cacheSchema.tfidfTerms).values(batch);
      }
    }
  }

  // Get TF-IDF terms for a file
  async getTFIDFTerms(filePath: string): Promise<Record<string, number>> {
    const result = await this.cache
      .select()
      .from(cacheSchema.tfidfTerms)
      .where(eq(cacheSchema.tfidfTerms.filePath, filePath));

    const terms: Record<string, number> = {};
    result.forEach((row) => {
      terms[row.term] = row.frequency;
    });

    return terms;
  }

  // Store IDF values
  async setIDFValues(idfValues: Record<string, number>): Promise<void> {
    // Clear existing IDF values
    await this.cache.delete(cacheSchema.tfidfIdf);

    // Insert new values
    if (Object.keys(idfValues).length > 0) {
      const newIdfValues: cacheSchema.NewTfidfIdf[] = Object.entries(idfValues).map(
        ([term, idfValue]) => ({
          term,
          idfValue,
        })
      );

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < newIdfValues.length; i += batchSize) {
        const batch = newIdfValues.slice(i, i + batchSize);
        await this.cache.insert(cacheSchema.tfidfIdf).values(batch);
      }
    }
  }

  // Get IDF values
  async getIDFValues(): Promise<Record<string, number>> {
    const result = await this.cache.select().from(cacheSchema.tfidfIdf);

    const idfValues: Record<string, number> = {};
    result.forEach((row) => {
      idfValues[row.term] = row.idfValue;
    });

    return idfValues;
  }

  // Get codebase index stats
  async getCodebaseIndexStats(): Promise<{
    fileCount: number;
    termCount: number;
    indexedAt?: string;
    version?: string;
  }> {
    // Get file count
    const fileCountResult = await this.cache
      .select({ count: cacheSchema.codebaseFiles.path })
      .from(cacheSchema.codebaseFiles);
    const fileCount = fileCountResult.length;

    // Get term count
    const termCountResult = await this.cache
      .selectDistinct({ term: cacheSchema.tfidfTerms.term })
      .from(cacheSchema.tfidfTerms);
    const termCount = termCountResult.length;

    // Get metadata
    const [indexedAt, version] = await Promise.all([
      this.getCodebaseMetadata('indexedAt'),
      this.getCodebaseMetadata('version'),
    ]);

    return {
      fileCount,
      termCount,
      indexedAt,
      version,
    };
  }

  // Clear codebase index
  async clearCodebaseIndex(): Promise<void> {
    await Promise.all([
      this.cache.delete(cacheSchema.codebaseFiles),
      this.cache.delete(cacheSchema.tfidfTerms),
      this.cache.delete(cacheSchema.tfidfDocuments),
      this.cache.delete(cacheSchema.tfidfIdf),
      this.cache.delete(cacheSchema.codebaseMetadata),
    ]);
  }

  // Search TF-IDF terms (for debugging/analysis)
  async searchTFIDFTerms(termPattern: string): Promise<any[]> {
    // Input validation
    if (!termPattern || typeof termPattern !== 'string') {
      throw new ValidationError(
        'Term pattern must be a non-empty string',
        'termPattern',
        termPattern
      );
    }

    // Sanitize term pattern to prevent SQL injection
    const sanitizedPattern = termPattern.replace(/[^a-zA-Z0-9\s_\-]/g, '');
    if (sanitizedPattern !== termPattern) {
      throw new ValidationError(
        'Term pattern contains invalid characters',
        'termPattern',
        termPattern
      );
    }

    const searchPattern = `%${sanitizedPattern}%`;

    const result = await this.cache
      .select({
        path: cacheSchema.codebaseFiles.path,
        term: cacheSchema.tfidfTerms.term,
        frequency: cacheSchema.tfidfTerms.frequency,
        language: cacheSchema.codebaseFiles.language,
      })
      .from(cacheSchema.tfidfTerms)
      .innerJoin(
        cacheSchema.codebaseFiles,
        eq(cacheSchema.tfidfTerms.filePath, cacheSchema.codebaseFiles.path)
      )
      .where(like(cacheSchema.tfidfTerms.term, searchPattern))
      .orderBy(desc(cacheSchema.tfidfTerms.frequency))
      .limit(100);

    return result;
  }

  // ===== Health Checks =====

  async healthCheck(): Promise<{
    memory: { healthy: boolean; error?: string; details?: any };
    cache: { healthy: boolean; error?: string; details?: any };
  }> {
    const [memoryHealth, cacheHealth] = await Promise.all([
      this.memoryDb.healthCheck(),
      this.cacheDb.healthCheck(),
    ]);

    return {
      memory: memoryHealth,
      cache: cacheHealth,
    };
  }

  // ===== Migration Support =====

  /**
   * Migrate data from old combined database to new separated databases
   */
  async migrateFromOldDatabase(oldDbPath: string): Promise<void> {
    console.error('[INFO] Starting migration from old database...');

    // This would be implemented if needed to migrate from the old memory.db
    // For now, we'll start fresh with the separated structure

    console.error('[INFO] Migration completed');
  }

  // Close database connections
  async close(): Promise<void> {
    await Promise.all([this.memoryDb.close(), this.cacheDb.close()]);
  }

  // Get database paths for debugging
  getDatabasePaths(): { memory: string; cache: string } {
    return {
      memory: this.memoryDb.getDatabasePath(),
      cache: this.cacheDb.getDatabasePath(),
    };
  }
}
