/**
 * Drizzle ORM-based storage for Sylphx Flow
 * Type-safe database operations replacing raw SQL
 */

import { and, count, desc, eq, like } from 'drizzle-orm';
import { type Database, DrizzleDatabase } from '../../db/index.js';
import * as schema from '../../db/schema.js';
import type {
  CodebaseFile,
  NewMemory,
  NewTfidfIdf,
  NewTfidfTerm,
  TfidfDocument,
} from '../../db/schema.js';
import {
  DatabaseError,
  ValidationError,
  executeOperation,
  isDatabaseError,
} from '../../utils/database-errors.js';

// Memory entry interface (backward compatibility)
export interface MemoryEntry {
  key: string;
  namespace: string;
  value: unknown;
  timestamp: number;
  created_at: string;
  updated_at: string;
}

// Drizzle-based memory storage
export class DrizzleMemoryStorage {
  private drizzleDb: DrizzleDatabase;
  private db: Database;

  constructor() {
    this.drizzleDb = new DrizzleDatabase();
    this.db = this.drizzleDb.db;
  }

  async initialize(): Promise<void> {
    await this.drizzleDb.initialize();
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
          await this.db
            .update(schema.memory)
            .set({
              value: serializedValue,
              timestamp,
              updated_at,
            })
            .where(and(eq(schema.memory.key, key), eq(schema.memory.namespace, namespace)));
        } else {
          // Insert new entry
          const newMemory: NewMemory = {
            key,
            namespace,
            value: serializedValue,
            timestamp,
            created_at,
            updated_at,
          };

          await this.db.insert(schema.memory).values(newMemory);
        }
      },
      { key, namespace }
    );
  }

  async get(key: string, namespace = 'default'): Promise<MemoryEntry | null> {
    const result = await this.db
      .select()
      .from(schema.memory)
      .where(and(eq(schema.memory.key, key), eq(schema.memory.namespace, namespace)))
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
    const result = await this.db
      .select()
      .from(schema.memory)
      .orderBy(desc(schema.memory.timestamp));

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
      throw new Error('Search pattern must be a non-empty string');
    }

    // Sanitize pattern to prevent SQL injection
    // Only allow alphanumeric, spaces, and wildcards
    const sanitizedPattern = pattern.replace(/[^a-zA-Z0-9\s*_\-]/g, '');
    if (sanitizedPattern !== pattern) {
      throw new Error('Search pattern contains invalid characters');
    }

    const searchPattern = sanitizedPattern.replace(/\*/g, '%');

    let whereCondition = like(schema.memory.key, searchPattern);

    if (namespace && namespace !== 'all') {
      // Validate namespace
      if (!/^[a-zA-Z0-9_\-]+$/.test(namespace)) {
        throw new Error('Namespace contains invalid characters');
      }
      whereCondition = and(whereCondition, eq(schema.memory.namespace, namespace))!;
    }

    const result = await this.db
      .select()
      .from(schema.memory)
      .where(whereCondition)
      .orderBy(desc(schema.memory.timestamp))
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
    const result = await this.db
      .delete(schema.memory)
      .where(and(eq(schema.memory.key, key), eq(schema.memory.namespace, namespace)));

    return result.rowsAffected > 0;
  }

  async clear(namespace?: string): Promise<void> {
    if (namespace && namespace !== 'all') {
      await this.db.delete(schema.memory).where(eq(schema.memory.namespace, namespace));
    } else {
      await this.db.delete(schema.memory);
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
      this.db
        .select({ count: count() })
        .from(schema.memory),

      // Get namespace counts in a single query
      this.db
        .select({
          namespace: schema.memory.namespace,
          count: count(),
        })
        .from(schema.memory)
        .groupBy(schema.memory.namespace)
        .orderBy(schema.memory.namespace),

      // Get oldest entry
      this.db
        .select({ created_at: schema.memory.created_at })
        .from(schema.memory)
        .orderBy(schema.memory.created_at)
        .limit(1),

      // Get newest entry
      this.db
        .select({ created_at: schema.memory.created_at })
        .from(schema.memory)
        .orderBy(desc(schema.memory.created_at))
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

  // Close database connection
  async close(): Promise<void> {
    await this.drizzleDb.close();
  }

  // Get database path for debugging
  getDatabasePath(): string {
    return this.drizzleDb.getDatabasePath();
  }

  // ===== Codebase Index Caching =====

  // Store codebase metadata
  async setCodebaseMetadata(key: string, value: any): Promise<void> {
    const serializedValue = this.safeSerialize(value);

    await this.db
      .insert(schema.codebaseMetadata)
      .values({
        key,
        value: serializedValue,
      })
      .onConflictDoUpdate({
        target: schema.codebaseMetadata.key,
        set: { value: serializedValue },
      });
  }

  // Get codebase metadata
  async getCodebaseMetadata(key: string): Promise<any> {
    const result = await this.db
      .select()
      .from(schema.codebaseMetadata)
      .where(eq(schema.codebaseMetadata.key, key))
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

    await this.db
      .insert(schema.codebaseFiles)
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
        target: schema.codebaseFiles.path,
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
  async getCodebaseFile(path: string): Promise<CodebaseFile | null> {
    const result = await this.db
      .select()
      .from(schema.codebaseFiles)
      .where(eq(schema.codebaseFiles.path, path))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  // Get all files
  async getAllCodebaseFiles(): Promise<CodebaseFile[]> {
    return await this.db
      .select({
        path: schema.codebaseFiles.path,
        mtime: schema.codebaseFiles.mtime,
        hash: schema.codebaseFiles.hash,
        content: schema.codebaseFiles.content,
        language: schema.codebaseFiles.language,
        size: schema.codebaseFiles.size,
        indexedAt: schema.codebaseFiles.indexedAt,
      })
      .from(schema.codebaseFiles)
      .orderBy(schema.codebaseFiles.path);
  }

  // Delete file
  async deleteCodebaseFile(path: string): Promise<void> {
    await this.db.delete(schema.codebaseFiles).where(eq(schema.codebaseFiles.path, path));
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
    await this.db
      .insert(schema.tfidfDocuments)
      .values({
        filePath,
        magnitude: document.magnitude,
        termCount: document.termCount,
        rawTerms: this.safeSerialize(document.rawTerms),
      })
      .onConflictDoUpdate({
        target: schema.tfidfDocuments.filePath,
        set: {
          magnitude: document.magnitude,
          termCount: document.termCount,
          rawTerms: this.safeSerialize(document.rawTerms),
        },
      });
  }

  // Get TF-IDF document
  async getTFIDFDocument(filePath: string): Promise<TfidfDocument | null> {
    const result = await this.db
      .select()
      .from(schema.tfidfDocuments)
      .where(eq(schema.tfidfDocuments.filePath, filePath))
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
    await this.db.delete(schema.tfidfTerms).where(eq(schema.tfidfTerms.filePath, filePath));

    // Insert new terms
    if (Object.keys(terms).length > 0) {
      const newTerms: NewTfidfTerm[] = Object.entries(terms).map(([term, frequency]) => ({
        filePath,
        term,
        frequency,
      }));

      // Insert in batches to avoid parameter limits
      const batchSize = 100;
      for (let i = 0; i < newTerms.length; i += batchSize) {
        const batch = newTerms.slice(i, i + batchSize);
        await this.db.insert(schema.tfidfTerms).values(batch);
      }
    }
  }

  // Get TF-IDF terms for a file
  async getTFIDFTerms(filePath: string): Promise<Record<string, number>> {
    const result = await this.db
      .select()
      .from(schema.tfidfTerms)
      .where(eq(schema.tfidfTerms.filePath, filePath));

    const terms: Record<string, number> = {};
    result.forEach((row) => {
      terms[row.term] = row.frequency;
    });

    return terms;
  }

  // Store IDF values
  async setIDFValues(idfValues: Record<string, number>): Promise<void> {
    // Clear existing IDF values
    await this.db.delete(schema.tfidfIdf);

    // Insert new values
    if (Object.keys(idfValues).length > 0) {
      const newIdfValues: NewTfidfIdf[] = Object.entries(idfValues).map(([term, idfValue]) => ({
        term,
        idfValue,
      }));

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < newIdfValues.length; i += batchSize) {
        const batch = newIdfValues.slice(i, i + batchSize);
        await this.db.insert(schema.tfidfIdf).values(batch);
      }
    }
  }

  // Get IDF values
  async getIDFValues(): Promise<Record<string, number>> {
    const result = await this.db.select().from(schema.tfidfIdf);

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
    const fileCountResult = await this.db
      .select({ count: schema.codebaseFiles.path })
      .from(schema.codebaseFiles);
    const fileCount = fileCountResult.length;

    // Get term count
    const termCountResult = await this.db
      .selectDistinct({ term: schema.tfidfTerms.term })
      .from(schema.tfidfTerms);
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
      this.db.delete(schema.codebaseFiles),
      this.db.delete(schema.tfidfTerms),
      this.db.delete(schema.tfidfDocuments),
      this.db.delete(schema.tfidfIdf),
      this.db.delete(schema.codebaseMetadata),
    ]);
  }

  // Search TF-IDF terms (for debugging/analysis)
  async searchTFIDFTerms(termPattern: string): Promise<any[]> {
    // Input validation
    if (!termPattern || typeof termPattern !== 'string') {
      throw new Error('Term pattern must be a non-empty string');
    }

    // Sanitize term pattern to prevent SQL injection
    const sanitizedPattern = termPattern.replace(/[^a-zA-Z0-9\s_\-]/g, '');
    if (sanitizedPattern !== termPattern) {
      throw new Error('Term pattern contains invalid characters');
    }

    const searchPattern = `%${sanitizedPattern}%`;

    const result = await this.db
      .select({
        path: schema.codebaseFiles.path,
        term: schema.tfidfTerms.term,
        frequency: schema.tfidfTerms.frequency,
        language: schema.codebaseFiles.language,
      })
      .from(schema.tfidfTerms)
      .innerJoin(schema.codebaseFiles, eq(schema.tfidfTerms.filePath, schema.codebaseFiles.path))
      .where(like(schema.tfidfTerms.term, searchPattern))
      .orderBy(desc(schema.tfidfTerms.frequency))
      .limit(100);

    return result;
  }
}
