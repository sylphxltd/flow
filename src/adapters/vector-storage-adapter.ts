/**
 * Vector Storage Adapter Implementation
 * Wraps the existing vector storage functionality with the unified interface
 */

import { StorageUtils } from '../core/unified-storage-manager.js';
import type {
  StorageConfig,
  StorageResult,
  VectorDocument,
  VectorSearchResult,
  VectorStorageAdapter,
} from '../interfaces/unified-storage.js';
import { logger } from '../utils/logger.js';

/**
 * Mock vector storage implementation for development/testing
 * Replace with actual implementation when LanceDB or other vector DB is available
 */
export class VectorStorageAdapter implements VectorStorageAdapter {
  readonly type = 'vector';
  private documents = new Map<string, VectorDocument>();
  private config: StorageConfig;
  private initialized = false;
  private vectorDimensions: number;

  constructor(config: StorageConfig) {
    this.config = config;
    this.vectorDimensions = config.vectorDimensions || 1536; // OpenAI default
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await StorageUtils.executeOperation(async () => {
      // Initialize vector database connection here
      this.initialized = true;
      logger.info('Vector storage adapter initialized', {
        config: this.config,
        vectorDimensions: this.vectorDimensions,
      });
    }, 'vector.initialize');
  }

  async close(): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      this.documents.clear();
      this.initialized = false;
      logger.debug('Vector storage adapter closed');
    }, 'vector.close');
  }

  async getStats(): Promise<Record<string, unknown>> {
    return StorageUtils.executeOperation(async () => {
      const documents = Array.from(this.documents.values());
      const typeCount = documents.reduce(
        (acc, doc) => {
          const type = doc.metadata?.type || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        type: this.type,
        documentCount: this.documents.size,
        vectorDimensions: this.vectorDimensions,
        initialized: this.initialized,
        config: this.config,
        typeDistribution: typeCount,
      };
    }, 'vector.getStats');
  }

  async get(key: string): Promise<VectorDocument | null> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const result = this.documents.get(key) || null;
      logger.debug('Vector get operation', { key, found: result !== null });
      return result;
    }, 'vector.get');
  }

  async set(key: string, value: VectorDocument): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      // For vector storage, we use the document ID as the key
      const document = { ...value, id: key };
      await this.add(document);
      logger.debug('Vector set operation', { key, id: document.id });
    }, 'vector.set');
  }

  async delete(key: string): Promise<boolean> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const result = await this.deleteDocument(key);
      logger.debug('Vector delete operation', { key, deleted: result });
      return result;
    }, 'vector.delete');
  }

  async exists(key: string): Promise<boolean> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      return this.documents.has(key);
    }, 'vector.exists');
  }

  async keys(): Promise<string[]> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const keys = Array.from(this.documents.keys());
      logger.debug('Vector keys operation', { count: keys.length });
      return keys;
    }, 'vector.keys');
  }

  async size(): Promise<number> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      return this.documents.size;
    }, 'vector.size');
  }

  async clear(): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      this.documents.clear();
      logger.debug('Vector clear operation');
    }, 'vector.clear');
  }

  async add(document: VectorDocument): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      this.ensureInitialized();

      // Validate document
      this.validateDocument(document);

      this.documents.set(document.id, document);
      logger.debug('Vector document added', {
        id: document.id,
        type: document.metadata?.type,
        contentLength: document.content.length,
      });
    }, 'vector.add');
  }

  async addBatch(documents: VectorDocument[]): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      this.ensureInitialized();

      // Validate all documents first
      documents.forEach((doc) => this.validateDocument(doc));

      // Add all documents
      documents.forEach((doc) => {
        this.documents.set(doc.id, doc);
      });

      logger.debug('Vector batch add', { count: documents.length });
    }, 'vector.addBatch');
  }

  async search(query: number[], limit = 10): Promise<VectorSearchResult[]> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();

      const documents = Array.from(this.documents.values());
      const results = this.performVectorSearch(query, documents, limit);

      logger.debug('Vector search', {
        queryDimensions: query.length,
        totalDocuments: documents.length,
        resultsCount: results.length,
        limit,
      });

      return results;
    }, 'vector.search');
  }

  async searchWithFilters(
    query: number[],
    filters?: Record<string, unknown>,
    limit = 10
  ): Promise<VectorSearchResult[]> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();

      let documents = Array.from(this.documents.values());

      // Apply filters
      if (filters) {
        documents = documents.filter((doc) => this.matchesFilters(doc, filters));
      }

      const results = this.performVectorSearch(query, documents, limit);

      logger.debug('Vector search with filters', {
        queryDimensions: query.length,
        filteredDocuments: documents.length,
        totalDocuments: this.documents.size,
        resultsCount: results.length,
        filters,
      });

      return results;
    }, 'vector.searchWithFilters');
  }

  async deleteDocument(id: string): Promise<boolean> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();
      const existed = this.documents.has(id);
      this.documents.delete(id);
      logger.debug('Vector document deleted', { id, existed });
      return existed;
    }, 'vector.deleteDocument');
  }

  async update(id: string, document: VectorDocument): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      this.ensureInitialized();

      if (!this.documents.has(id)) {
        throw new Error(`Document with id ${id} not found`);
      }

      this.validateDocument(document);
      this.documents.set(id, document);

      logger.debug('Vector document updated', { id });
    }, 'vector.update');
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void> {
    await StorageUtils.executeOperation(async () => {
      this.ensureInitialized();

      const document = this.documents.get(id);
      if (!document) {
        throw new Error(`Document with id ${id} not found`);
      }

      const updatedDocument = {
        ...document,
        metadata: { ...document.metadata, ...metadata },
      };

      this.documents.set(id, updatedDocument);

      logger.debug('Vector document metadata updated', { id });
    }, 'vector.updateMetadata');
  }

  async getByMetadata(metadata: Record<string, unknown>): Promise<VectorDocument[]> {
    return StorageUtils.executeOperation(async () => {
      this.ensureInitialized();

      const documents = Array.from(this.documents.values()).filter((doc) =>
        this.matchesFilters(doc, metadata)
      );

      logger.debug('Vector search by metadata', {
        metadata,
        resultsCount: documents.length,
      });

      return documents;
    }, 'vector.getByMetadata');
  }

  /**
   * Perform actual vector search using cosine similarity
   */
  private performVectorSearch(
    query: number[],
    documents: VectorDocument[],
    limit: number
  ): VectorSearchResult[] {
    const results: VectorSearchResult[] = [];

    for (const document of documents) {
      const similarity = this.cosineSimilarity(query, document.embedding);
      const distance = 1 - similarity; // Convert similarity to distance

      results.push({
        document,
        score: similarity,
        distance,
      });
    }

    // Sort by similarity (descending) and take top results
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Check if document matches filters
   */
  private matchesFilters(document: VectorDocument, filters: Record<string, unknown>): boolean {
    if (!document.metadata) {
      return false;
    }

    return Object.entries(filters).every(([key, value]) => {
      const docValue = document.metadata?.[key];
      if (Array.isArray(value)) {
        return value.includes(docValue);
      }
      return docValue === value;
    });
  }

  /**
   * Validate vector document
   */
  private validateDocument(document: VectorDocument): void {
    if (!document.id) {
      throw new Error('Document ID is required');
    }

    if (!document.content) {
      throw new Error('Document content is required');
    }

    if (!document.embedding || !Array.isArray(document.embedding)) {
      throw new Error('Document embedding is required and must be an array');
    }

    if (document.embedding.length !== this.vectorDimensions) {
      throw new Error(
        `Embedding dimensions (${document.embedding.length}) do not match expected dimensions (${this.vectorDimensions})`
      );
    }

    if (!document.metadata || typeof document.metadata !== 'object') {
      throw new Error('Document metadata is required and must be an object');
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Vector storage adapter not initialized. Call initialize() first.');
    }
  }
}
