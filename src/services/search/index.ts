/**
 * Search Services Index
 * Provides unified interface for all search-related services
 */

// Main services
export { getSearchService } from './unified-search-service.js';
export { CodebaseIndexer } from './codebase-indexer.js';
export { SemanticSearchService } from './semantic-search.js';

// Embeddings
export { getDefaultEmbeddingProvider, createEmbeddingProvider } from './embeddings.js';
export type { EmbeddingProvider } from './embeddings.js';

// TF-IDF
export { buildSearchIndex, searchDocuments } from './tfidf.js';
export type { SearchIndex, SearchResult as TFIDFSearchResult } from './tfidf.js';

// Types
export type {
  CodebaseFile,
  IndexCache,
  CodebaseIndexerOptions,
  IndexingStatus,
} from './codebase-indexer-types.js';

export type {
  SearchResult,
  SearchOptions,
} from './unified-search-service.js';
