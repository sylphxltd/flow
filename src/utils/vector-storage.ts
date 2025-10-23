/**
 * Vector storage using HNSW (Hierarchical Navigable Small World) index
 * Supports both knowledge base and codebase embeddings
 */

import fs from 'node:fs';
import path from 'node:path';
import { HierarchicalNSW } from 'hnswlib-node';

export interface VectorDocument {
  id: string; // Unique identifier (URI or file path)
  embedding: number[]; // Vector embedding
  metadata: {
    type: 'knowledge' | 'code'; // Document type
    content?: string; // Original content (optional)
    category?: string; // Category (for knowledge)
    language?: string; // Programming language (for code)
    [key: string]: unknown;
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
 * Vector storage manager using HNSW index
 */
export class VectorStorage {
  private index: HierarchicalNSW | null = null;
  private documents: Map<number, VectorDocument> = new Map();
  private idToIndex: Map<string, number> = new Map();
  private metadata: VectorIndexMetadata;
  private indexPath: string;
  private metadataPath: string;

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
    this.metadataPath = indexPath.replace(/\.hnsw$/, '.meta.json');

    const { maxElements = 10000, m = 16, efConstruction = 200, efSearch = 50 } = options;

    this.metadata = {
      version: '1.0.0',
      dimensions,
      totalDocuments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Initialize HNSW index
    this.index = new HierarchicalNSW('cosine', dimensions);
    this.index.initIndex(maxElements, m, efConstruction, 100);
    this.index.setEf(efSearch);
  }

  /**
   * Load existing index from disk
   */
  static async load(indexPath: string): Promise<VectorStorage | null> {
    const metadataPath = indexPath.replace(/\.hnsw$/, '.meta.json');

    if (!fs.existsSync(indexPath) || !fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      // Load metadata
      const metadataJson = fs.readFileSync(metadataPath, 'utf8');
      const metadata: VectorIndexMetadata & { documents: VectorDocument[] } =
        JSON.parse(metadataJson);

      // Create storage instance
      const storage = new VectorStorage(indexPath, metadata.dimensions);
      storage.metadata = {
        version: metadata.version,
        dimensions: metadata.dimensions,
        totalDocuments: metadata.totalDocuments,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        embeddingModel: metadata.embeddingModel,
      };

      // Load HNSW index
      storage.index?.readIndex(indexPath);

      // Restore documents map
      for (let i = 0; i < metadata.documents.length; i++) {
        const doc = metadata.documents[i];
        storage.documents.set(i, doc);
        storage.idToIndex.set(doc.id, i);
      }

      console.error(
        `[INFO] Loaded vector index: ${metadata.totalDocuments} documents, ${metadata.dimensions}D`
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
  addDocument(doc: VectorDocument): void {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    if (doc.embedding.length !== this.metadata.dimensions) {
      throw new Error(
        `Embedding dimension mismatch: expected ${this.metadata.dimensions}, got ${doc.embedding.length}`
      );
    }

    // Check if document already exists
    if (this.idToIndex.has(doc.id)) {
      console.warn(`[WARN] Document already exists: ${doc.id}, skipping`);
      return;
    }

    const index = this.documents.size;
    this.index.addPoint(doc.embedding, index);
    this.documents.set(index, doc);
    this.idToIndex.set(doc.id, index);
    this.metadata.totalDocuments++;
    this.metadata.updatedAt = new Date().toISOString();
  }

  /**
   * Add multiple documents in batch
   */
  addDocuments(docs: VectorDocument[]): void {
    for (const doc of docs) {
      this.addDocument(doc);
    }
  }

  /**
   * Search for similar documents
   */
  search(
    queryEmbedding: number[],
    options: {
      k?: number; // Number of results
      filter?: (doc: VectorDocument) => boolean; // Filter function
    } = {}
  ): VectorSearchResult[] {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    if (queryEmbedding.length !== this.metadata.dimensions) {
      throw new Error(
        `Query embedding dimension mismatch: expected ${this.metadata.dimensions}, got ${queryEmbedding.length}`
      );
    }

    const { k = 5, filter } = options;

    // Search HNSW index
    const result = this.index.searchKnn(queryEmbedding, k * 2); // Get more results for filtering

    const results: VectorSearchResult[] = [];

    for (let i = 0; i < result.neighbors.length; i++) {
      const docIndex = result.neighbors[i];
      const distance = result.distances[i];
      const doc = this.documents.get(docIndex);

      if (!doc) continue;

      // Apply filter if provided
      if (filter && !filter(doc)) continue;

      // Convert distance to similarity (cosine distance: 0 = identical, 2 = opposite)
      const similarity = 1 - distance / 2;

      results.push({
        id: doc.id,
        distance,
        similarity,
        metadata: doc.metadata,
      });

      if (results.length >= k) break;
    }

    return results;
  }

  /**
   * Get document by ID
   */
  getDocument(id: string): VectorDocument | null {
    const index = this.idToIndex.get(id);
    if (index === undefined) return null;
    return this.documents.get(index) || null;
  }

  /**
   * Save index to disk
   */
  save(): void {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    // Ensure directory exists
    const dir = path.dirname(this.indexPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save HNSW index
    this.index.writeIndex(this.indexPath);

    // Save metadata and documents
    const metadataWithDocs = {
      ...this.metadata,
      documents: Array.from(this.documents.values()),
    };

    fs.writeFileSync(this.metadataPath, JSON.stringify(metadataWithDocs, null, 2), 'utf8');

    console.error(`[INFO] Saved vector index: ${this.indexPath}`);
  }

  /**
   * Get index statistics
   */
  getStats(): VectorIndexMetadata {
    return { ...this.metadata };
  }

  /**
   * Clear index
   */
  clear(): void {
    this.documents.clear();
    this.idToIndex.clear();
    this.metadata.totalDocuments = 0;
    this.metadata.updatedAt = new Date().toISOString();

    // Reinitialize index
    if (this.index) {
      this.index = new HierarchicalNSW('cosine', this.metadata.dimensions);
      this.index.initIndex(10000, 16, 200, 100);
      this.index.setEf(50);
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
