/**
 * Search Services Index
 * Provides unified interface for all search-related services
 */

export { CodebaseIndexer } from './codebase-indexer.js';
// Types
export type {
  CodebaseFile,
  CodebaseIndexerOptions,
  IndexCache,
  IndexingStatus,
} from './codebase-indexer-types.js';
export type { EmbeddingProvider } from './embeddings.js';

// Embeddings
export { createEmbeddingProvider, getDefaultEmbeddingProvider } from './embeddings.js';
export { SemanticSearchService } from './semantic-search.js';
export type { SearchIndex, SearchResult as TFIDFSearchResult } from './tfidf.js';
// TF-IDF
export { buildSearchIndex, searchDocuments } from './tfidf.js';
export type {
  SearchOptions,
  SearchResult,
} from './unified-search-service.js';
// Main services
export { getSearchService } from './unified-search-service.js';
