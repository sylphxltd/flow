/**
 * Search module interfaces
 * Defines contracts for search and indexing functionality
 */

/**
 * Search service interface
 */
export interface SearchService {
  /**
   * Search for documents
   */
  search(query: SearchQuery): Promise<SearchResult[]>;

  /**
   * Add document to index
   */
  addDocument(document: SearchDocument): Promise<void>;

  /**
   * Remove document from index
   */
  removeDocument(id: string): Promise<boolean>;

  /**
   * Update document in index
   */
  updateDocument(id: string, document: SearchDocument): Promise<void>;

  /**
   * Get document by ID
   */
  getDocument(id: string): Promise<SearchDocument | null>;

  /**
   * Get search suggestions
   */
  getSuggestions(query: string, limit?: number): Promise<string[]>;

  /**
   * Get search statistics
   */
  getStats(): Promise<SearchStats>;
}

/**
 * Search query interface
 */
export interface SearchQuery {
  /**
   * Search query text
   */
  query: string;

  /**
   * Filter criteria
   */
  filters?: SearchFilter[];

  /**
   * Sort options
   */
  sort?: SortOption[];

  /**
   * Pagination options
   */
  pagination?: PaginationOptions;

  /**
   * Search options
   */
  options?: SearchOptions;
}

/**
 * Search filter interface
 */
export interface SearchFilter {
  /**
   * Field to filter on
   */
  field: string;

  /**
   * Filter operator
   */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith';

  /**
   * Filter value
   */
  value: unknown;
}

/**
 * Sort option interface
 */
export interface SortOption {
  /**
   * Field to sort on
   */
  field: string;

  /**
   * Sort direction
   */
  direction: 'asc' | 'desc';
}

/**
 * Pagination options interface
 */
export interface PaginationOptions {
  /**
   * Page number (1-based)
   */
  page: number;

  /**
   * Items per page
   */
  limit: number;

  /**
   * Offset for custom pagination
   */
  offset?: number;
}

/**
 * Search options interface
 */
export interface SearchOptions {
  /**
   * Enable fuzzy search
   */
  fuzzy?: boolean;

  /**
   * Fuzzy threshold (0-1)
   */
  fuzzyThreshold?: number;

  /**
   * Enable semantic search
   */
  semantic?: boolean;

  /**
   * Weight for semantic vs keyword search
   */
  semanticWeight?: number;

  /**
   * Highlight search terms
   */
  highlight?: boolean;

  /**
   * Search timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Search document interface
 */
export interface SearchDocument {
  /**
   * Document ID
   */
  id: string;

  /**
   * Document title
   */
  title: string;

  /**
   * Document content
   */
  content: string;

  /**
   * Document URL or path
   */
  url?: string;

  /**
   * Document type
   */
  type?: string;

  /**
   * Document metadata
   */
  metadata?: Record<string, unknown>;

  /**
   * Document tags
   */
  tags?: string[];

  /**
   * Document language
   */
  language?: string;

  /**
   * Creation timestamp
   */
  createdAt: string;

  /**
   * Last modified timestamp
   */
  modifiedAt: string;
}

/**
 * Search result interface
 */
export interface SearchResult {
  /**
   * Document
   */
  document: SearchDocument;

  /**
   * Relevance score (0-1)
   */
  score: number;

  /**
   * Matched highlights
   */
  highlights?: SearchHighlight[];

  /**
   * Matched terms
   */
  matchedTerms?: string[];
}

/**
 * Search highlight interface
 */
export interface SearchHighlight {
  /**
   * Field name
   */
  field: string;

  /**
   * Highlighted text fragments
   */
  fragments: string[];
}

/**
 * Search statistics interface
 */
export interface SearchStats {
  /**
   * Total documents indexed
   */
  totalDocuments: number;

  /**
   * Index size in bytes
   */
  indexSize: number;

  /**
   * Average query time in milliseconds
   */
  avgQueryTime: number;

  /**
   * Total queries served
   */
  totalQueries: number;

  /**
   * Last indexed timestamp
   */
  lastIndexed: string;
}