/**
 * Unified Search Service
 * Shared search logic for CLI, MCP, and API
 */

import { CodebaseIndexer } from './codebase-indexer.js';
import { SeparatedMemoryStorage } from '../storage/separated-storage.js';
import type { EmbeddingProvider } from './embeddings.js';
import { getDefaultEmbeddingProvider } from './embeddings.js';
import { getKnowledgeIndexer, getKnowledgeIndexerWithEmbeddings } from './knowledge-indexer.js';
import { type SearchIndex, searchDocuments, buildSearchIndex } from './tfidf.js';

export interface SearchResult {
  uri: string;
  score: number;
  title?: string;
  content?: string;
  metadata?: any;
}

export interface SearchOptions {
  limit?: number;
  include_content?: boolean;
  file_extensions?: string[];
  path_filter?: string;
  exclude_paths?: string[];
  min_score?: number;
}

export interface SearchStatus {
  codebase: {
    indexed: boolean;
    fileCount: number;
    indexedAt?: string;
    isIndexing?: boolean;
    progress?: number;
    currentFile?: string;
  };
  knowledge: {
    indexed: boolean;
    documentCount: number;
    isIndexing?: boolean;
    progress?: number;
  };
}

/**
 * Dependencies for UnifiedSearchService
 * Allows dependency injection for testing and flexibility
 */
export interface SearchServiceDependencies {
  readonly memoryStorage?: SeparatedMemoryStorage;
  readonly knowledgeIndexer?: ReturnType<typeof getKnowledgeIndexer>;
  readonly codebaseIndexer?: CodebaseIndexer;
  readonly embeddingProvider?: EmbeddingProvider;
}

/**
 * Unified Search Service - shared by CLI and MCP
 */
export class UnifiedSearchService {
  private memoryStorage: SeparatedMemoryStorage;
  private knowledgeIndexer: ReturnType<typeof getKnowledgeIndexer>;
  private codebaseIndexer?: CodebaseIndexer;
  private embeddingProvider?: EmbeddingProvider;

  constructor(dependencies: SearchServiceDependencies = {}) {
    // Use provided dependencies or create defaults
    this.memoryStorage = dependencies.memoryStorage || new SeparatedMemoryStorage();
    this.knowledgeIndexer = dependencies.knowledgeIndexer || getKnowledgeIndexer();
    this.codebaseIndexer = dependencies.codebaseIndexer;
    this.embeddingProvider = dependencies.embeddingProvider;
  }

  /**
   * Initialize search service
   */
  async initialize(): Promise<void> {
    await this.memoryStorage.initialize();

    // Initialize embedding provider only if API key exists
    if (!this.embeddingProvider && process.env.OPENAI_API_KEY) {
      this.embeddingProvider = await getDefaultEmbeddingProvider();
    }

    // Reinitialize knowledge indexer with embedding provider (or undefined)
    this.knowledgeIndexer = getKnowledgeIndexer(this.embeddingProvider);
  }

  /**
   * Get search status
   */
  async getStatus(): Promise<SearchStatus> {
    // Codebase status
    const codebaseFiles = await this.memoryStorage.getAllCodebaseFiles();
    const codebaseStats = await this.memoryStorage.getCodebaseIndexStats();
    const codebaseIndexingStatus = this.codebaseIndexer?.getStatus();

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

    return {
      codebase: {
        indexed: codebaseFiles.length > 0,
        fileCount: codebaseFiles.length,
        indexedAt: codebaseStats.indexedAt,
        isIndexing: codebaseIndexingStatus?.isIndexing || false,
        progress: codebaseIndexingStatus?.progress || 0,
        currentFile: codebaseIndexingStatus?.currentFile,
      },
      knowledge: {
        indexed: knowledgeIndexed,
        documentCount: knowledgeDocCount,
        isIndexing: knowledgeStatus.isIndexing,
        progress: knowledgeStatus.progress,
      },
    };
  }

  /**
   * Search codebase - shared by CLI and MCP
   */
  async searchCodebase(
    query: string,
    options: SearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    totalIndexed: number;
    query: string;
  }> {
    const {
      limit = 10,
      include_content = true,
      file_extensions,
      path_filter,
      exclude_paths,
      min_score = 0.001, // Default: filter out zero-score results
    } = options;

    // Check if codebase is indexed
    const allFiles = await this.memoryStorage.getAllCodebaseFiles();
    if (allFiles.length === 0) {
      throw new Error('Codebase not indexed yet. Run "sylphx search reindex" first.');
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
      files = files.filter((file) => !exclude_paths.some((exclude) => file.path.includes(exclude)));
    }

    if (files.length === 0) {
      return {
        results: [],
        totalIndexed: allFiles.length,
        query,
      };
    }

    // Use TF-IDF index from database to avoid rebuilding
    const { buildSearchIndexFromDB } = await import('./tfidf.js');
    const index = await buildSearchIndexFromDB(this.memoryStorage, {
      file_extensions,
      path_filter,
      exclude_paths
    });

    if (!index) {
      throw new Error('No searchable content found');
    }

    // Process query TF-IDF vector using database values
    const { processQuery } = await import('./tfidf.js');
    const queryVector = await processQuery(query, index.idf);

    // Calculate query magnitude
    let queryMagnitude = 0;
    for (const value of queryVector.values()) {
      queryMagnitude += value * value;
    }
    queryMagnitude = Math.sqrt(queryMagnitude);

    // Calculate similarity manually (don't use searchDocuments to avoid reprocessing query)
    const searchResults = index.documents.map((doc) => {
      let dotProduct = 0;
      const matchedTerms: string[] = [];

      // Calculate dot product
      for (const [term, queryScore] of queryVector.entries()) {
        const docScore = doc.terms.get(term) || 0;
        if (docScore > 0) {
          dotProduct += queryScore * docScore;
          matchedTerms.push(term);
        }
      }

      // Calculate cosine similarity
      let similarity = 0;
      if (queryMagnitude > 0 && doc.magnitude > 0) {
        similarity = dotProduct / (queryMagnitude * doc.magnitude);
      }

      // Use pure TF-IDF score without extra boosting
      // StarCoder2 tokenization is already optimal
      let finalScore = similarity;

      return {
        uri: doc.uri,
        score: finalScore,
        matchedTerms,
      };
    });

    // Convert result format
    const results: SearchResult[] = [];
    for (const result of searchResults) {
      const filename = result.uri?.replace('file://', '') || 'Unknown';
      let content = '';

      if (include_content && result.matchedTerms.length > 0) {
        const file = await this.memoryStorage.getCodebaseFile(filename);
        if (file?.content) {
          // Find lines containing matched terms (show context)
          const lines = file.content.split('\n');
          const matchedLines: string[] = [];

          for (let i = 0; i < lines.length && matchedLines.length < 3; i++) {
            const line = lines[i].toLowerCase();
            if (result.matchedTerms.some((term) => line.includes(term.toLowerCase()))) {
              matchedLines.push(lines[i].substring(0, 100)); // Limit line length
            }
          }

          if (matchedLines.length > 0) {
            content = matchedLines.join('\n');
          }
        }
      }

      results.push({
        uri: result.uri,
        score: result.score || 0,
        title: filename.split('/').pop() || filename,
        content: include_content && content ? content : undefined,
      });
    }

    // Sort by score (descending), filter by min_score, and limit results
    const filteredResults = results
      .filter((r) => r.score >= min_score)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      results: filteredResults,
      totalIndexed: allFiles.length,
      query,
    };
  }

  
  /**
   * Search knowledge base - shared by CLI and MCP
   */
  async searchKnowledge(
    query: string,
    options: SearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    totalIndexed: number;
    query: string;
  }> {
    const { limit = 10, include_content = true } = options;

    try {
      const index = await this.knowledgeIndexer.loadIndex();
      const searchResults = await searchDocuments(query, index, {
        limit,
        boostFactors: {
          exactMatch: 1.5,
          phraseMatch: 2.0,
          technicalMatch: 1.8, // Enhanced boost for technical terms
          identifierMatch: 1.3, // Boost for code identifiers
        },
      });

      const results: SearchResult[] = searchResults.map((result) => ({
        uri: result.uri,
        score: result.score || 0,
        title: result.uri?.split('/').pop() || 'Unknown',
        content: include_content ? '' : undefined, // Knowledge search doesn't include content by default
      }));

      return {
        results,
        totalIndexed: index.totalDocuments,
        query,
      };
    } catch {
      throw new Error('Knowledge base not indexed yet');
    }
  }

  
  /**
   * Format search results for CLI output
   */
  formatResultsForCLI(results: SearchResult[], query: string, totalIndexed: number): string {
    if (results.length === 0) {
      return `📭 No results found for "${query}"\n\n**Total indexed files:** ${totalIndexed}`;
    }

    const summary = `✓ Found ${results.length} result(s) for "${query}":\n\n`;
    const formattedResults = results
      .map((result, i) => {
        let line = `${i + 1}. **${result.title}** (Score: ${result.score.toFixed(3)})`;

        // Display full path or URI
        if (result.uri.startsWith('file://')) {
          const filePath = result.uri.replace('file://', '');
          line += `\n   📁 Path: \`${filePath}\``;
        } else if (result.uri.startsWith('knowledge://')) {
          line += `\n   📚 Source: ${result.uri}`;
        } else {
          line += `\n   🔗 URI: ${result.uri}`;
        }

        if (result.content) {
          line += `\n   \`\`\`\n${result.content}\n\`\`\``;
        }
        return line;
      })
      .join('\n\n');

    return summary + formattedResults;
  }

  /**
   * Format search results for MCP response
   */
  formatResultsForMCP(
    results: SearchResult[],
    query: string,
    _totalIndexed: number
  ): {
    content: Array<{ type: 'text'; text: string }>;
  } {
    const summary = `Found ${results.length} result(s) for "${query}":\n\n`;
    const formattedResults = results
      .map((result, i) => {
        let line = `${i + 1}. **${result.title}** (Score: ${result.score.toFixed(3)})`;

        // Include URI for knowledge_get tool
        if (result.uri.startsWith('file://')) {
          const filePath = result.uri.replace('file://', '');
          line += `\n   📁 Path: \`${filePath}\``;
        } else if (result.uri.startsWith('knowledge://')) {
          line += `\n   📚 URI: ${result.uri}`;
        } else {
          line += `\n   🔗 URI: ${result.uri}`;
        }

        if (result.content) {
          line += `\n\`\`\`\n${result.content}\n\`\`\``;
        }
        return line;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: summary + formattedResults,
        },
      ],
    };
  }

  /**
   * Get all available knowledge URIs - dynamically generated
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
   * Start codebase file watching
   * IMPORTANT: Only call when codebase tools are enabled in MCP server
   * Prevents stale codebase data from misleading users
   */
  startCodebaseWatching(): void {
    if (!this.codebaseIndexer) {
      this.codebaseIndexer = new CodebaseIndexer();
    }
    this.codebaseIndexer.startWatching();
  }

  /**
   * Stop codebase file watching
   * Called when codebase tools are disabled or MCP server shuts down
   */
  stopCodebaseWatching(): void {
    if (this.codebaseIndexer) {
      this.codebaseIndexer.stopWatching();
    }
  }
}

// ============================================================================
// FACTORY PATTERN & DEPENDENCY INJECTION
// ============================================================================

/**
 * Create search service with custom dependencies
 * Useful for testing and custom configurations
 *
 * @example
 * // Custom service for testing
 * const testService = createSearchService({
 *   memoryStorage: mockStorage,
 *   knowledgeIndexer: mockKnowledgeIndexer,
 * });
 *
 * // Custom service with specific configuration
 * const customService = createSearchService({
 *   embeddingProvider: myEmbeddingProvider,
 * });
 */
export const createSearchService = (
  dependencies?: SearchServiceDependencies
): UnifiedSearchService => {
  return new UnifiedSearchService(dependencies);
};

/**
 * Default search service instance (singleton)
 * Used by CLI and MCP for standard operation
 *
 * This maintains backward compatibility with existing code.
 */
export const searchService = createSearchService();

/**
 * Create test search service with mock dependencies
 * Convenience function for testing
 *
 * @example
 * const testService = createTestSearchService({
 *   memoryStorage: mockStorage,
 * });
 */
export const createTestSearchService = (
  mockDependencies: Partial<SearchServiceDependencies> = {}
): UnifiedSearchService => {
  return createSearchService({
    memoryStorage: mockDependencies.memoryStorage,
    knowledgeIndexer: mockDependencies.knowledgeIndexer,
    codebaseIndexer: mockDependencies.codebaseIndexer,
    embeddingProvider: mockDependencies.embeddingProvider,
  });
};
