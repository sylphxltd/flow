/**
 * Vector storage using Vectra (TypeScript-native vector database)
 * Supports both knowledge base and codebase embeddings
 */

import fs from 'node:fs';
import path from 'node:path';
import { LocalIndex } from 'vectra';

export interface VectorDocument {
  id: string; // Unique identifier (URI or file path)
  embedding: number[]; // Vector embedding
  metadata: {
    type: 'knowledge' | 'code'; // Document type
    content: string; // Original content (empty string if not provided)
    category: string; // Category (empty string if not provided)
    language: string; // Programming language (empty string if not provided)
    [key: string]: string | number | boolean;
  };
}

export interface VectorSearchResult {
  id: string;
  distance: number; // Lower is better (0 = identical)
  similarity: number; // 0-1 score (1 = identical)
  metadata: VectorDocument['metadata'];
}

export interface VectorIndexMetadata {
  version: string;
  dimensions: number;
  totalDocuments: number;
  createdAt: string;
  updatedAt: string;
  embeddingModel?: string; // e.g., "text-embedding-3-small"
}

/**
 * Vector storage manager using Vectra LocalIndex
 */
export class VectorStorage {
  private index: LocalIndex | null = null;
  private metadata: VectorIndexMetadata;
  private indexPath: string;
  private dimensions: number;
  private isUpdating: boolean = false;

  constructor(
    indexPath: string,
    dimensions: number = 1536, // OpenAI text-embedding-3-small default
    options: {
      maxElements?: number;
      m?: number; // Number of bi-directional links (default: 16)
      efConstruction?: number; // Size of dynamic candidate list (default: 200)
      efSearch?: number; // Search quality (default: 50)
    } = {}
  ) {
    this.indexPath = indexPath;
    this.dimensions = dimensions;

    this.metadata = {
      version: '2.0.0', // Updated version for Vectra
      dimensions,
      totalDocuments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Initialize Vectra LocalIndex
    this.index = new LocalIndex(indexPath);
  }

  /**
   * Load existing index from disk
   */
  static async load(indexPath: string): Promise<VectorStorage | null> {
    const metadataPath = indexPath.replace(/\.index$/, '.meta.json');

    if (!fs.existsSync(indexPath) || !fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      // Load metadata
      const metadataJson = fs.readFileSync(metadataPath, 'utf8');
      const metadata: VectorIndexMetadata = JSON.parse(metadataJson);

      // Create storage instance
      const storage = new VectorStorage(indexPath, metadata.dimensions);
      storage.metadata = metadata;

      // Check if Vectra index exists
      const indexExists = await storage.index!.isIndexCreated();
      if (!indexExists) {
        console.error('[ERROR] Vectra index not found');
        return null;
      }

      // Get stats to update document count
      const stats = await storage.index!.getIndexStats();
      storage.metadata.totalDocuments = stats.items;

      console.error(
        `[INFO] Loaded vector index: ${storage.metadata.totalDocuments} documents, ${storage.metadata.dimensions}D`
      );
      return storage;
    } catch (error) {
      console.error('[ERROR] Failed to load vector index:', error);
      return null;
    }
  }

  /**
   * Add document to index
   */
  async addDocument(doc: VectorDocument): Promise<void> {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    if (doc.embedding.length !== this.dimensions) {
      throw new Error(
        `Embedding dimension mismatch: expected ${this.dimensions}, got ${doc.embedding.length}`
      );
    }

    // Start update if not already updating
    if (!this.isUpdating) {
      await this.index.beginUpdate();
      this.isUpdating = true;
    }

    try {
      // Check if document already exists
      const existingDoc = await this.index.getItem(doc.id);
      if (existingDoc) {
        console.warn(`[WARN] Document already exists: ${doc.id}, updating`);
        await this.index.upsertItem({
          id: doc.id,
          vector: doc.embedding,
          metadata: {
            type: doc.metadata.type,
            content: doc.metadata.content || '',
            category: doc.metadata.category || '',
            language: doc.metadata.language || '',
          },
        });
      } else {
        await this.index.insertItem({
          id: doc.id,
          vector: doc.embedding,
          metadata: {
            type: doc.metadata.type,
            content: doc.metadata.content || '',
            category: doc.metadata.category || '',
            language: doc.metadata.language || '',
          },
        });
        this.metadata.totalDocuments++;
      }
      this.metadata.updatedAt = new Date().toISOString();
    } catch (error) {
      console.error('[ERROR] Failed to add document:', error);
      throw error;
    }
  }

  /**
   * Add multiple documents in batch
   */
  async addDocuments(docs: VectorDocument[]): Promise<void> {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    await this.index.beginUpdate();
    this.isUpdating = true;

    try {
      for (const doc of docs) {
        await this.addDocument(doc);
      }
      await this.index.endUpdate();
      this.isUpdating = false;
    } catch (error) {
      await this.index.cancelUpdate();
      this.isUpdating = false;
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  async search(
    queryEmbedding: number[],
    options: {
      k?: number; // Number of results
      filter?: (doc: VectorDocument) => boolean; // Filter function
    } = {}
  ): Promise<VectorSearchResult[]> {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    if (queryEmbedding.length !== this.dimensions) {
      throw new Error(
        `Query embedding dimension mismatch: expected ${this.dimensions}, got ${queryEmbedding.length}`
      );
    }

    const { k = 5, filter } = options;

    try {
      // Search Vectra index
      const results = await this.index.queryItems(queryEmbedding, '', k * 2); // Get more results for filtering

      const filteredResults: VectorSearchResult[] = [];

      for (const result of results) {
        // Convert Vectra result to our format
        const doc: VectorDocument = {
          id: result.item.id,
          embedding: result.item.vector,
          metadata: result.item.metadata as VectorDocument['metadata'],
        };

        // Apply filter if provided
        if (filter && !filter(doc)) continue;

        // Convert score to similarity (Vectra uses cosine similarity)
        const similarity = result.score; // Vectra score is already 0-1
        const distance = 1 - similarity; // Convert to distance

        filteredResults.push({
          id: doc.id,
          distance,
          similarity,
          metadata: doc.metadata,
        });

        if (filteredResults.length >= k) break;
      }

      return filteredResults;
    } catch (error) {
      console.error('[ERROR] Failed to search index:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<VectorDocument | null> {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    try {
      const item = await this.index.getItem(id);
      if (!item) return null;

      return {
        id: item.id,
        embedding: item.vector,
        metadata: item.metadata as VectorDocument['metadata'],
      };
    } catch (error) {
      console.error('[ERROR] Failed to get document:', error);
      return null;
    }
  }

  /**
   * Save index to disk
   */
  async save(): Promise<void> {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    try {
      // End update if in progress
      if (this.isUpdating) {
        await this.index.endUpdate();
        this.isUpdating = false;
      }

      // Save metadata
      const metadataPath = this.indexPath.replace(/\.index$/, '.meta.json');
      fs.writeFileSync(metadataPath, JSON.stringify(this.metadata, null, 2), 'utf8');

      console.error(`[INFO] Saved vector index: ${this.indexPath}`);
    } catch (error) {
      console.error('[ERROR] Failed to save index:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<VectorIndexMetadata> {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    try {
      const stats = await this.index.getIndexStats();
      this.metadata.totalDocuments = stats.items;
      return { ...this.metadata };
    } catch (error) {
      console.error('[ERROR] Failed to get stats:', error);
      return { ...this.metadata };
    }
  }

  /**
   * Clear index
   */
  async clear(): Promise<void> {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    try {
      // Delete and recreate index
      await this.index.deleteIndex();
      await this.index.createIndex();

      this.metadata.totalDocuments = 0;
      this.metadata.updatedAt = new Date().toISOString();
      this.isUpdating = false;
    } catch (error) {
      console.error('[ERROR] Failed to clear index:', error);
      throw error;
    }
  }

  /**
   * Create index if it doesn't exist
   */
  async createIndex(): Promise<void> {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    try {
      const exists = await this.index.isIndexCreated();
      if (!exists) {
        await this.index.createIndex({
          version: 1,
          deleteIfExists: false,
          metadata_config: {
            indexed: ['type', 'category', 'language'],
          },
        });
        console.error(`[INFO] Created new vector index: ${this.indexPath}`);
      }
    } catch (error) {
      console.error('[ERROR] Failed to create index:', error);
      throw error;
    }
  }
}

/**
 * Generate mock embeddings for testing (replace with real embeddings later)
 * Uses simple TF-IDF-like approach to create pseudo-embeddings
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
    const index = Math.abs(hash) % dimensions;
    embedding[index] += 1;
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}
