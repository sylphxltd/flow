/**
 * Simple LanceDB vector storage implementation
 * Local-only, no cloud services required
 */

/**
 * Generate mock embedding for testing/fallback
 */
export function generateMockEmbedding(text: string, dimensions = 1536): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(dimensions).fill(0);

  // Simple hash-based pseudo-embedding
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Distribute hash across embedding dimensions
    for (let i = 0; i < dimensions; i++) {
      embedding[i] += Math.sin(hash * (i + 1)) * 0.1;
    }
  }

  // Normalize the embedding
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    return embedding.map((val) => val / norm);
  }

  return embedding;
}

import fs from 'node:fs';
import path from 'node:path';
import * as lancedb from '@lancedb/lancedb';

export interface VectorDocument {
  id: string;
  embedding: number[];
  metadata: {
    type: 'knowledge' | 'code';
    content: string;
    category: string;
    language: string;
    [key: string]: string | number | boolean;
  };
}

export interface VectorStorageMetadata {
  dimensions: number;
  count: number;
}

export interface VectorSearchResult {
  doc: VectorDocument;
  similarity: number;
}

/**
 * LanceDB vector storage - Local only, no cloud services
 */
export class VectorStorage {
  private db: any = null;
  private table: any = null;
  private metadata: VectorStorageMetadata;
  private indexPath: string;
  private dimensions: number;
  private tableName = 'vectors';

  constructor(indexPath: string, dimensions: number) {
    this.indexPath = indexPath;
    this.dimensions = dimensions;

    this.metadata = {
      dimensions,
      count: 0,
    };
  }

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      // Ensure directory exists
      const dir = path.dirname(this.indexPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Connect to LanceDB (local only)
      this.db = await lancedb.connect(this.indexPath);

      // Check if table exists
      const tables = await this.db.tableNames();
      if (tables.includes(this.tableName)) {
        this.table = await this.db.openTable(this.tableName);

        // Update count
        try {
          this.metadata.count = await this.table.countRows();
          console.error(`[INFO] Loaded LanceDB table with ${this.metadata.count} vectors`);
        } catch (e) {
          this.metadata.count = 0;
        }
      } else {
        // Create simple table
        const data = [
          {
            id: 'init',
            vector: new Array(this.dimensions).fill(0),
            type: 'code',
            content: '',
            category: '',
            language: '',
          },
        ];

        this.table = await this.db.createTable(this.tableName, data);

        // Remove the init record
        await this.table.delete('id = ?', ['init']);

        console.error(`[INFO] Created new LanceDB table: ${this.tableName}`);
      }
    } catch (error) {
      console.error('[ERROR] Failed to initialize LanceDB:', error);
      // Fallback to simple in-memory storage
      this.useFallback = true;
    }
  }

  private useFallback = false;
  private fallbackData: Map<string, VectorDocument> = new Map();

  /**
   * Save index to disk
   */
  async save(): Promise<void> {
    if (this.useFallback) {
      console.error('[INFO] Using fallback storage - save is no-op');
      return;
    }

    // LanceDB automatically saves
    console.error('[INFO] LanceDB saves automatically');
  }

  /**
   * Add document to index
   */
  async addDocument(doc: VectorDocument): Promise<void> {
    if (doc.embedding.length !== this.dimensions) {
      throw new Error(
        `Embedding dimension mismatch: expected ${this.dimensions}, got ${doc.embedding.length}`
      );
    }

    if (this.useFallback) {
      this.fallbackData.set(doc.id, doc);
      this.metadata.count = this.fallbackData.size;
      return;
    }

    await this.initialize();

    try {
      // Add to LanceDB
      await this.table.add([
        {
          id: doc.id,
          vector: doc.embedding,
          type: doc.metadata.type,
          content: doc.metadata.content,
          category: doc.metadata.category,
          language: doc.metadata.language,
        },
      ]);

      this.metadata.count++;
    } catch (error) {
      console.error('[ERROR] Failed to add document, falling back:', error);
      this.useFallback = true;
      this.fallbackData.set(doc.id, doc);
      this.metadata.count = this.fallbackData.size;
    }
  }

  /**
   * Add multiple documents
   */
  async addDocuments(docs: VectorDocument[]): Promise<void> {
    if (docs.length === 0) return;

    // Validate all documents
    for (const doc of docs) {
      if (doc.embedding.length !== this.dimensions) {
        throw new Error(
          `Embedding dimension mismatch: expected ${this.dimensions}, got ${doc.embedding.length}`
        );
      }
    }

    if (this.useFallback) {
      for (const doc of docs) {
        this.fallbackData.set(doc.id, doc);
      }
      this.metadata.count = this.fallbackData.size;
      return;
    }

    await this.initialize();

    try {
      // Convert to LanceDB format
      const records = docs.map((doc) => ({
        id: doc.id,
        vector: doc.embedding,
        type: doc.metadata.type,
        content: doc.metadata.content,
        category: doc.metadata.category,
        language: doc.metadata.language,
      }));

      // Batch add to LanceDB
      await this.table.add(records);
      this.metadata.count += docs.length;

      console.error(`[INFO] Added ${docs.length} documents to LanceDB`);
    } catch (error) {
      console.error('[ERROR] Failed to add documents, falling back:', error);
      this.useFallback = true;
      for (const doc of docs) {
        this.fallbackData.set(doc.id, doc);
      }
      this.metadata.count = this.fallbackData.size;
    }
  }

  /**
   * Search for similar documents
   */
  async search(
    queryEmbedding: number[],
    options: {
      k?: number;
      filter?: (doc: VectorDocument) => boolean;
    } = {}
  ): Promise<VectorSearchResult[]> {
    if (queryEmbedding.length !== this.dimensions) {
      throw new Error(
        `Query embedding dimension mismatch: expected ${this.dimensions}, got ${queryEmbedding.length}`
      );
    }

    const { k = 5, filter } = options;

    if (this.useFallback) {
      // Simple fallback search
      const results: VectorSearchResult[] = [];

      for (const doc of this.fallbackData.values()) {
        if (filter && !filter(doc)) continue;

        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        results.push({ doc, similarity });
      }

      return results.sort((a, b) => b.similarity - a.similarity).slice(0, k);
    }

    await this.initialize();

    try {
      // Search LanceDB
      const query = this.table.vectorSearch(queryEmbedding).limit(k * 2);
      const results = await query.toArray();

      const filteredResults: VectorSearchResult[] = [];

      for (const result of results) {
        // Convert back to our format
        const doc: VectorDocument = {
          id: result.id,
          embedding: result.vector,
          metadata: {
            type: result.type as 'knowledge' | 'code',
            content: result.content || '',
            category: result.category || '',
            language: result.language || '',
          },
        };

        // Apply filter if provided
        if (filter && !filter(doc)) continue;

        // Convert distance to similarity
        const distance = result._distance || 0;
        const similarity = 1 / (1 + distance);

        filteredResults.push({
          doc,
          similarity,
        });

        // Stop if we have enough results
        if (filteredResults.length >= k) break;
      }

      return filteredResults;
    } catch (error) {
      console.error('[ERROR] Vector search failed, falling back:', error);
      // Fallback to simple search
      return this.search(queryEmbedding, options);
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<VectorDocument | undefined> {
    if (this.useFallback) {
      return this.fallbackData.get(id);
    }

    await this.initialize();

    try {
      // Simple scan for now (LanceDB API might be different)
      const results = await this.table.limit(1000).toArray();
      const result = results.find((r: any) => r.id === id);

      if (!result) return undefined;

      return {
        id: result.id,
        embedding: result.vector,
        metadata: {
          type: result.type as 'knowledge' | 'code',
          content: result.content || '',
          category: result.category || '',
          language: result.language || '',
        },
      };
    } catch (error) {
      console.error('[ERROR] Failed to get document:', error);
      return this.fallbackData.get(id);
    }
  }

  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<VectorDocument[]> {
    if (this.useFallback) {
      return Array.from(this.fallbackData.values());
    }

    await this.initialize();

    try {
      const results = await this.table.toArray();
      return results.map((result: any) => ({
        id: result.id,
        embedding: result.vector,
        metadata: {
          type: result.type as 'knowledge' | 'code',
          content: result.content || '',
          category: result.category || '',
          language: result.language || '',
        },
      }));
    } catch (error) {
      console.error('[ERROR] Failed to get all documents:', error);
      return Array.from(this.fallbackData.values());
    }
  }

  /**
   * Get metadata
   */
  getMetadata(): VectorStorageMetadata {
    return { ...this.metadata };
  }

  /**
   * Clear all documents
   */
  async clear(): Promise<void> {
    if (this.useFallback) {
      this.fallbackData.clear();
      this.metadata.count = 0;
      return;
    }

    await this.initialize();

    try {
      await this.db.dropTable(this.tableName);

      // Recreate empty table
      const data = [
        {
          id: 'init',
          vector: new Array(this.dimensions).fill(0),
          type: 'code',
          content: '',
          category: '',
          language: '',
        },
      ];

      this.table = await this.db.createTable(this.tableName, data);
      await this.table.delete('id = ?', ['init']);

      this.metadata.count = 0;
      console.error('[INFO] Cleared all vectors from LanceDB');
    } catch (error) {
      console.error('[ERROR] Failed to clear vectors:', error);
      this.fallbackData.clear();
      this.metadata.count = 0;
    }
  }

  /**
   * Load existing storage from disk
   */
  static async load(indexPath: string): Promise<VectorStorage | null> {
    try {
      if (!fs.existsSync(indexPath)) {
        return null;
      }

      // Try to connect to see if it's a valid LanceDB
      const db = await lancedb.connect(indexPath);
      const tables = await db.tableNames();

      if (tables.length === 0) {
        return null;
      }

      // Default to OpenAI dimensions
      const storage = new VectorStorage(indexPath, 1536);
      return storage;
    } catch (error) {
      console.error('[ERROR] Failed to load LanceDB storage:', error);
      return null;
    }
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
