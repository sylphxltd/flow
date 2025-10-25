/**
 * Search Service Layer
 *
 * Business logic layer for search operations
 * Handles unified search across codebase and knowledge with caching and optimization
 */

import type { ILogger, IEmbeddingProvider } from '../core/interfaces.js';
import {
  getKnowledgeIndexer,
  getKnowledgeIndexerWithEmbeddings,
} from '../utils/knowledge-indexer.js';
import { SeparatedMemoryStorage } from '../utils/separated-storage.js';
import { type SearchIndex, searchDocuments } from '../utils/tfidf.js';
import type { SearchResult, SearchOptions } from '../utils/unified-search-service.js';

export interface SearchServiceConfig {
  enableCaching?: boolean;
  cacheMaxAge?: number; // milliseconds
  maxResults?: number;
  minScore?: number;
  enableEmbeddings?: boolean;
}

export interface SearchResultExtended extends SearchResult {
  type: 'codebase' | 'knowledge';
  indexedAt?: string;
  fileSize?: number;
  lastModified?: string;
}

export interface SearchStats {
  codebase: {
    indexed: boolean;
    fileCount: number;
    indexedAt?: string;
    totalSize: number;
  };
  knowledge: {
    indexed: boolean;
    documentCount: number;
    isIndexing?: boolean;
    progress?: number;
  };
  cache: {
    size: number;
    hitRate: number;
  };
}

export class SearchService {
  private memoryStorage: SeparatedMemoryStorage;
  private knowledgeIndexer = getKnowledgeIndexer();
  private embeddingProvider?: IEmbeddingProvider;
  private searchCache = new Map<string, { results: SearchResultExtended[]; timestamp: number }>();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(
    private readonly logger: ILogger,
    private readonly config: SearchServiceConfig = {}
  ) {
    this.memoryStorage = new SeparatedMemoryStorage();
  }

  /**
   * Initialize the search service
   */
  async initialize(): Promise<void> {
    try {
      await this.memoryStorage.initialize();

      // Initialize embedding provider if enabled
      if (this.config.enableEmbeddings) {
        try {
          this.embeddingProvider = await (
            await import('../utils/embeddings.js')
          ).getDefaultEmbeddingProvider();
          this.logger.info(`Embedding provider initialized: ${this.embeddingProvider.name}`);

          // Reinitialize knowledge indexer with embedding provider
          this.knowledgeIndexer = getKnowledgeIndexerWithEmbeddings(this.embeddingProvider);
        } catch (error) {
          this.logger.warn('Failed to initialize embeddings, using TF-IDF only:', error);
        }
      }

      this.logger.info('Search service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize search service', error);
      throw error;
    }
  }

  /**
   * Search across codebase and knowledge
   */
  async search(
    query: string,
    options: SearchOptions & { types?: Array<'codebase' | 'knowledge'> } = {}
  ): Promise<{ results: SearchResultExtended[]; total: number; query: string }> {
    const startTime = Date.now();
    const {
      types = ['codebase', 'knowledge'],
      limit = this.config.maxResults || 10,
      min_score = this.config.minScore || 0.1,
      ...searchOptions
    } = options;

    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(query, {
          types,
          limit,
          min_score,
          ...searchOptions,
        });
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.cacheHits++;
          return {
            results: cached,
            total: cached.length,
            query,
          };
        }
        this.cacheMisses++;
      }

      const allResults: SearchResultExtended[] = [];

      // Search codebase
      if (types.includes('codebase')) {
        try {
          const codebaseResults = await this.searchCodebase(query, {
            ...searchOptions,
            limit,
            min_score,
          });
          allResults.push(...codebaseResults);
        } catch (error) {
          this.logger.warn('Codebase search failed:', error);
        }
      }

      // Search knowledge
      if (types.includes('knowledge')) {
        try {
          const knowledgeResults = await this.searchKnowledge(query, {
            ...searchOptions,
            limit,
            min_score,
          });
          allResults.push(...knowledgeResults);
        } catch (error) {
          this.logger.warn('Knowledge search failed:', error);
        }
      }

      // Sort and limit results
      const sortedResults = allResults.sort((a, b) => b.score - a.score).slice(0, limit);

      // Cache results if enabled
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(query, {
          types,
          limit,
          min_score,
          ...searchOptions,
        });
        this.setCache(cacheKey, sortedResults);
      }

      const searchTime = Date.now() - startTime;
      this.logger.debug(`Search completed in ${searchTime}ms for query: "${query}"`);

      return {
        results: sortedResults,
        total: sortedResults.length,
        query,
      };
    } catch (error) {
      this.logger.error(`Search failed for query: "${query}"`, error);
      throw error;
    }
  }

  /**
   * Search codebase only
   */
  async searchCodebase(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResultExtended[]> {
    const {
      limit = 10,
      include_content = true,
      file_extensions,
      path_filter,
      exclude_paths,
      min_score = 0.1,
    } = options;

    try {
      // Check if codebase is indexed
      const allFiles = await this.memoryStorage.getAllCodebaseFiles();
      if (allFiles.length === 0) {
        this.logger.warn('Codebase not indexed yet');
        return [];
      }

      // Apply filters
      let files = allFiles;
      if (file_extensions?.length) {
        files = files.filter((file) => file_extensions.some((ext) => file.path.endsWith(ext)));
      }
      if (path_filter) {
        files = files.filter((file) => file.path.includes(path_filter));
      }
      if (exclude_paths?.length) {
        files = files.filter(
          (file) => !exclude_paths.some((exclude) => file.path.includes(exclude))
        );
      }

      if (files.length === 0) {
        return [];
      }

      // Build search index
      const index = await this.buildSearchIndex(files);
      if (!index) {
        throw new Error('No searchable content found');
      }

      // Execute search
      const searchResults = await searchDocuments(query, index, {
        limit,
        minScore: min_score,
      });

      // Convert to extended format
      const results: SearchResultExtended[] = [];
      for (const result of searchResults) {
        const filename = result.uri?.replace('file://', '') || 'Unknown';
        const file = files.find((f) => f.path === filename);

        let content = '';
        if (include_content && file?.content) {
          content = file.content.substring(0, 500);
          if (file.content.length > 500) { content += '...'; }
        }

        results.push({
          uri: result.uri,
          score: result.score || 0,
          title: filename.split('/').pop() || filename,
          content: include_content ? content : undefined,
          type: 'codebase',
          fileSize: file?.size,
          lastModified: file?.lastModified,
        });
      }

      return results;
    } catch (error) {
      this.logger.error(`Codebase search failed for query: "${query}"`, error);
      throw error;
    }
  }

  /**
   * Search knowledge base only
   */
  async searchKnowledge(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResultExtended[]> {
    const { limit = 10, include_content = true } = options;

    try {
      const index = await this.knowledgeIndexer.loadIndex();
      const searchResults = await searchDocuments(query, index, { limit });

      const results: SearchResultExtended[] = searchResults.map((result) => ({
        uri: result.uri,
        score: result.score || 0,
        title: result.uri?.split('/').pop() || 'Unknown',
        content: include_content ? '' : undefined,
        type: 'knowledge',
        indexedAt: index.metadata?.generatedAt,
      }));

      return results;
    } catch (error) {
      this.logger.error(`Knowledge search failed for query: "${query}"`, error);
      throw error;
    }
  }

  /**
   * Get search statistics
   */
  async getStats(): Promise<SearchStats> {
    try {
      // Codebase status
      const codebaseFiles = await this.memoryStorage.getAllCodebaseFiles();
      const codebaseStats = await this.memoryStorage.getCodebaseIndexStats();

      // Knowledge status
      const knowledgeStatus = this.knowledgeIndexer.getStatus();
      let knowledgeIndexed = false;
      let knowledgeDocCount = 0;

      try {
        const knowledgeIndex = await this.knowledgeIndexer.loadIndex();
        knowledgeIndexed = true;
        knowledgeDocCount = knowledgeIndex.totalDocuments;
      } catch {
        // Not indexed yet
      }

      // Cache statistics
      const cacheTotal = this.cacheHits + this.cacheMisses;
      const hitRate = cacheTotal > 0 ? this.cacheHits / cacheTotal : 0;

      return {
        codebase: {
          indexed: codebaseFiles.length > 0,
          fileCount: codebaseFiles.length,
          indexedAt: codebaseStats.indexedAt,
          totalSize: codebaseFiles.reduce((sum, file) => sum + (file.size || 0), 0),
        },
        knowledge: {
          indexed: knowledgeIndexed,
          documentCount: knowledgeDocCount,
          isIndexing: knowledgeStatus.isIndexing,
          progress: knowledgeStatus.progress,
        },
        cache: {
          size: this.searchCache.size,
          hitRate: Math.round(hitRate * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get search statistics', error);
      throw error;
    }
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.logger.info('Search cache cleared');
  }

  /**
   * Get available knowledge URIs
   */
  async getAvailableKnowledgeURIs(): Promise<string[]> {
    try {
      const index = await this.knowledgeIndexer.loadIndex();
      return index.documents.map((doc) => doc.uri);
    } catch {
      return [];
    }
  }

  /**
   * Build search index for codebase files
   */
  private async buildSearchIndex(files: any[]): Promise<SearchIndex | null> {
    try {
      const documents = [];
      for (const file of files) {
        const tfidfDoc = await this.memoryStorage.getTFIDFDocument(file.path);
        if (tfidfDoc) {
          const rawTerms = tfidfDoc.rawTerms || {};
          const terms = new Map<string, number>();
          const rawTermsMap = new Map<string, number>();

          for (const [term, freq] of Object.entries(rawTerms)) {
            terms.set(term, freq as number);
            rawTermsMap.set(term, freq as number);
          }

          documents.push({
            uri: `file://${file.path}`,
            terms,
            rawTerms: rawTermsMap,
            magnitude: tfidfDoc.magnitude,
          });
        }
      }

      if (documents.length === 0) {
        return null;
      }

      // Get IDF values
      const idfRecords = await this.memoryStorage.getIDFValues();
      const idf = new Map<string, number>();
      for (const entry of idfRecords as any[]) {
        if (entry.term && entry.idfValue !== undefined) {
          idf.set(entry.term, entry.idfValue);
        }
      }

      return {
        documents,
        idf,
        totalDocuments: documents.length,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    } catch (error) {
      this.logger.error('Failed to build search index', error);
      return null;
    }
  }

  /**
   * Generate cache key for search results
   */
  private generateCacheKey(query: string, options: any): string {
    const optionsStr = JSON.stringify(options);
    return `${query}:${optionsStr}`;
  }

  /**
   * Get results from cache
   */
  private getFromCache(key: string): SearchResultExtended[] | null {
    const cached = this.searchCache.get(key);
    if (!cached) { return null; }

    const maxAge = this.config.cacheMaxAge || 300000; // 5 minutes default
    if (Date.now() - cached.timestamp > maxAge) {
      this.searchCache.delete(key);
      return null;
    }

    return cached.results;
  }

  /**
   * Set results in cache
   */
  private setCache(key: string, results: SearchResultExtended[]): void {
    this.searchCache.set(key, {
      results,
      timestamp: Date.now(),
    });

    // Enforce cache size limit
    if (this.searchCache.size > 100) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.clearCache();
    this.logger.info('Search service disposed');
  }
}
