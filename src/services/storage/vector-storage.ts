/**
 * Vector storage interface and implementation
 * Uses LanceDB for high-performance local vector database
 */

// Re-export from the LanceDB implementation
export {
  generateMockEmbedding,
  type VectorDocument,
  type VectorSearchResult,
  VectorStorage,
  type VectorStorageMetadata,
} from './lancedb-vector-storage.js';
