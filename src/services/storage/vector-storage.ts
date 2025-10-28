/**
 * Vector storage interface and implementation
 * Uses LanceDB for high-performance local vector database
 */

// Re-export from the LanceDB implementation
export {
  VectorStorage,
  type VectorDocument,
  type VectorStorageMetadata,
  type VectorSearchResult,
  generateMockEmbedding,
} from './lancedb-vector-storage.js';
