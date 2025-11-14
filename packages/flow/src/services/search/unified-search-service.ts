/**
 * Unified Search Service - Refactored
 * 統一 Vector 優先 + TF-IDF fallback 架構
 *
 * 核心設計：
 * - searchCodebase 同 searchKnowledge 用同一套邏輯
 * - Vector Search 優先（如果有 embeddingProvider）
 * - TF-IDF fallback（冇 embedding 或 vector search 失敗）
 * - 冇 chunking（直接用整個文件）
 */

import { SeparatedMemoryStorage } from '../storage/separated-storage.js';
import { CodebaseIndexer } from './codebase-indexer.js';
import type { EmbeddingProvider } from './embeddings.js';
import { getDefaultEmbeddingProvider } from './embeddings.js';
import { getKnowledgeIndexer } from './knowledge-indexer.js';
import type { VectorStorage } from '../storage/vector-storage.js';

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

/**
 * 數據源類型
 */
type DataSourceType = 'codebase' | 'knowledge';

/**
 * 數據源接口（統一 codebase 同 knowledge）
 */
interface DataSource {
  type: DataSourceType;

  // Vector storage (可選)
  vectorStorage?: VectorStorage;

  // TF-IDF fallback functions
  getAllDocuments: () => Promise<Array<{ path: string; content?: string }>>;
  buildTFIDFIndex: (filters?: any) => Promise<any>;
  searchTFIDF: (query: string, index: any, limit: number) => Promise<Array<{
    uri: string;
    score: number;
    matchedTerms?: string[];
  }>>;
}

/**
 * 核心統一搜索函數
 * Vector 優先，TF-IDF fallback
 */
async function hybridSearch(
  dataSource: DataSource,
  query: string,
  options: SearchOptions,
  embeddingProvider?: EmbeddingProvider
): Promise<{
  results: SearchResult[];
  totalIndexed: number;
  searchMethod: 'vector' | 'tfidf';
}> {
  const { limit = 10, include_content = true, min_score = 0.001 } = options;

  // 1. 檢查有幾多文檔
  const allDocs = await dataSource.getAllDocuments();
  const totalIndexed = allDocs.length;

  if (totalIndexed === 0) {
    return { results: [], totalIndexed: 0, searchMethod: 'tfidf' };
  }

  // 2. Vector Search 優先（如果有 embedding provider）
  if (dataSource.vectorStorage && embeddingProvider) {
    try {
      console.log(`[${dataSource.type}] Using Vector Search`);

      // 生成 query embedding（直接送 OpenAI，冇用 StarCoder2）
      const queryEmbedding = await embeddingProvider.generateEmbedding(query);

      // Vector 搜索
      const vectorResults = await dataSource.vectorStorage.search(queryEmbedding, {
        k: limit,
      });

      // 轉換格式
      const results: SearchResult[] = await Promise.all(
        vectorResults.map(async (result) => {
          const uri = result.doc.id;
          const filename = uri.replace('file://', '').replace('knowledge://', '');

          let content = result.doc.metadata?.content || '';

          // 如果需要完整內容，從數據源讀取
          if (include_content && !content) {
            const doc = allDocs.find(d => d.path === filename);
            content = doc?.content || '';
          }

          return {
            uri,
            score: result.similarity,
            title: filename.split('/').pop() || filename,
            content: include_content ? content : undefined,
            metadata: result.doc.metadata,
          };
        })
      );

      // 過濾低分結果
      const filtered = results.filter(r => r.score >= min_score);

      return {
        results: filtered,
        totalIndexed,
        searchMethod: 'vector',
      };

    } catch (error) {
      console.warn(`[${dataSource.type}] Vector search failed, falling back to TF-IDF:`, error);
      // Fall through to TF-IDF
    }
  }

  // 3. TF-IDF Fallback
  console.log(`[${dataSource.type}] Using TF-IDF Search`);

  // 建立 TF-IDF 索引（會用 StarCoder2 tokenize）
  const tfidfIndex = await dataSource.buildTFIDFIndex({
    file_extensions: options.file_extensions,
    path_filter: options.path_filter,
    exclude_paths: options.exclude_paths,
  });

  if (!tfidfIndex) {
    return { results: [], totalIndexed, searchMethod: 'tfidf' };
  }

  // TF-IDF 搜索
  const tfidfResults = await dataSource.searchTFIDF(query, tfidfIndex, limit);

  // 轉換格式
  const results: SearchResult[] = await Promise.all(
    tfidfResults.map(async (result) => {
      const uri = result.uri;
      const filename = uri.replace('file://', '').replace('knowledge://', '');

      let content = '';

      // 如果需要內容，從數據源讀取
      if (include_content) {
        const doc = allDocs.find(d =>
          `file://${d.path}` === uri || `knowledge://${d.path}` === uri
        );

        if (doc?.content && result.matchedTerms) {
          // 提取匹配行（顯示 context）
          const lines = doc.content.split('\n');
          const matchedLines: string[] = [];

          for (let i = 0; i < lines.length && matchedLines.length < 3; i++) {
            const line = lines[i].toLowerCase();
            if (result.matchedTerms.some(term => line.includes(term.toLowerCase()))) {
              matchedLines.push(lines[i].substring(0, 100));
            }
          }

          content = matchedLines.join('\n');
        }
      }

      return {
        uri,
        score: result.score,
        title: filename.split('/').pop() || filename,
        content: include_content ? content : undefined,
      };
    })
  );

  // 過濾低分結果
  const filtered = results.filter(r => r.score >= min_score);

  return {
    results: filtered,
    totalIndexed,
    searchMethod: 'tfidf',
  };
}

/**
 * Create Unified Search Service
 */
export const createUnifiedSearchService = (dependencies: {
  memoryStorage?: SeparatedMemoryStorage;
  knowledgeIndexer?: ReturnType<typeof getKnowledgeIndexer>;
  codebaseIndexer?: CodebaseIndexer;
  embeddingProvider?: EmbeddingProvider;
} = {}) => {
  const state = {
    memoryStorage: dependencies.memoryStorage || new SeparatedMemoryStorage(),
    knowledgeIndexer: dependencies.knowledgeIndexer || getKnowledgeIndexer(),
    codebaseIndexer: dependencies.codebaseIndexer,
    embeddingProvider: dependencies.embeddingProvider,
  };

  /**
   * Initialize
   */
  const initialize = async (): Promise<void> => {
    await state.memoryStorage.initialize();

    // Initialize embedding provider if API key exists
    if (!state.embeddingProvider && process.env.OPENAI_API_KEY) {
      state.embeddingProvider = await getDefaultEmbeddingProvider();
    }

    // Reinitialize knowledge indexer with embedding provider
    state.knowledgeIndexer = getKnowledgeIndexer(state.embeddingProvider);
  };

  /**
   * Search Codebase - 統一用 hybridSearch
   */
  const searchCodebase = async (
    query: string,
    options: SearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    totalIndexed: number;
    query: string;
  }> => {
    // 建立 codebase 數據源
    const dataSource: DataSource = {
      type: 'codebase',

      // Vector storage（如果 codebase indexer 有建立）
      vectorStorage: state.codebaseIndexer?.getVectorStorage?.(),

      // 獲取所有文檔
      getAllDocuments: async () => {
        let files = await state.memoryStorage.getAllCodebaseFiles();

        // 應用過濾
        if (options.file_extensions?.length) {
          files = files.filter(f =>
            options.file_extensions!.some(ext => f.path.endsWith(ext))
          );
        }
        if (options.path_filter) {
          files = files.filter(f => f.path.includes(options.path_filter!));
        }
        if (options.exclude_paths?.length) {
          files = files.filter(f =>
            !options.exclude_paths!.some(exclude => f.path.includes(exclude))
          );
        }

        return files.map(f => ({ path: f.path, content: f.content }));
      },

      // 建立 TF-IDF 索引
      buildTFIDFIndex: async (filters) => {
        const { buildSearchIndexFromDB } = await import('./tfidf.js');
        return await buildSearchIndexFromDB(state.memoryStorage, filters);
      },

      // TF-IDF 搜索
      searchTFIDF: async (query, index, limit) => {
        const { processQuery } = await import('./tfidf.js');
        const queryVector = await processQuery(query, index.idf);

        // 計算相似度
        let queryMagnitude = 0;
        for (const value of queryVector.values()) {
          queryMagnitude += value * value;
        }
        queryMagnitude = Math.sqrt(queryMagnitude);

        const results = index.documents.map((doc: any) => {
          let dotProduct = 0;
          const matchedTerms: string[] = [];

          for (const [term, queryScore] of queryVector.entries()) {
            const docScore = doc.terms.get(term) || 0;
            if (docScore > 0) {
              dotProduct += queryScore * docScore;
              matchedTerms.push(term);
            }
          }

          const similarity =
            queryMagnitude > 0 && doc.magnitude > 0
              ? dotProduct / (queryMagnitude * doc.magnitude)
              : 0;

          return {
            uri: doc.uri,
            score: similarity,
            matchedTerms,
          };
        });

        // 排序 + 限制數量
        return results
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, limit);
      },
    };

    // 用統一搜索函數
    const result = await hybridSearch(dataSource, query, options, state.embeddingProvider);

    return {
      results: result.results,
      totalIndexed: result.totalIndexed,
      query,
    };
  };

  /**
   * Search Knowledge - 統一用 hybridSearch
   */
  const searchKnowledge = async (
    query: string,
    options: SearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    totalIndexed: number;
    query: string;
  }> => {
    // 建立 knowledge 數據源
    const dataSource: DataSource = {
      type: 'knowledge',

      // Vector storage（如果 knowledge indexer 有建立）
      vectorStorage: state.knowledgeIndexer.getVectorStorage?.(),

      // 獲取所有文檔
      getAllDocuments: async () => {
        const index = await state.knowledgeIndexer.loadIndex();
        return index.documents.map(d => ({
          path: d.uri.replace('knowledge://', ''),
          content: '', // Knowledge indexer 唔存完整內容
        }));
      },

      // 建立 TF-IDF 索引
      buildTFIDFIndex: async () => {
        return await state.knowledgeIndexer.loadIndex();
      },

      // TF-IDF 搜索
      searchTFIDF: async (query, index, limit) => {
        const { processQuery } = await import('./tfidf.js');
        const queryVector = await processQuery(query, index.idf);

        // 計算相似度
        let queryMagnitude = 0;
        for (const value of queryVector.values()) {
          queryMagnitude += value * value;
        }
        queryMagnitude = Math.sqrt(queryMagnitude);

        const results = index.documents.map((doc: any) => {
          let dotProduct = 0;
          const matchedTerms: string[] = [];

          for (const [term, queryScore] of queryVector.entries()) {
            const docScore = doc.terms.get(term) || 0;
            if (docScore > 0) {
              dotProduct += queryScore * docScore;
              matchedTerms.push(term);
            }
          }

          const similarity =
            queryMagnitude > 0 && doc.magnitude > 0
              ? dotProduct / (queryMagnitude * doc.magnitude)
              : 0;

          return {
            uri: doc.uri,
            score: similarity,
            matchedTerms,
          };
        });

        // 排序 + 限制數量
        return results
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, limit);
      },
    };

    // 用統一搜索函數
    const result = await hybridSearch(dataSource, query, options, state.embeddingProvider);

    return {
      results: result.results,
      totalIndexed: result.totalIndexed,
      query,
    };
  };

  /**
   * Get search status
   */
  const getStatus = async () => {
    // Codebase status
    const codebaseFiles = await state.memoryStorage.getAllCodebaseFiles();
    const codebaseStats = await state.memoryStorage.getCodebaseIndexStats();
    const codebaseIndexingStatus = state.codebaseIndexer?.getStatus();

    // Knowledge status
    const knowledgeStatus = state.knowledgeIndexer.getStatus();
    let knowledgeIndexed = false;
    let knowledgeDocCount = 0;

    try {
      const knowledgeIndex = await state.knowledgeIndexer.loadIndex();
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
  };

  /**
   * Format results for CLI
   */
  const formatResultsForCLI = (
    results: SearchResult[],
    query: string,
    totalIndexed: number
  ): string => {
    if (results.length === 0) {
      return `📭 No results found for "${query}"\n\n**Total indexed files:** ${totalIndexed}`;
    }

    const summary = `✓ Found ${results.length} result(s) for "${query}":\n\n`;
    const formattedResults = results
      .map((result, i) => {
        let line = `${i + 1}. **${result.title}** (Score: ${result.score.toFixed(3)})`;

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
  };

  /**
   * Format results for MCP
   */
  const formatResultsForMCP = (
    results: SearchResult[],
    query: string,
    _totalIndexed: number
  ) => {
    const summary = `Found ${results.length} result(s) for "${query}":\n\n`;
    const formattedResults = results
      .map((result, i) => {
        let line = `${i + 1}. **${result.title}** (Score: ${result.score.toFixed(3)})`;

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
          type: 'text' as const,
          text: summary + formattedResults,
        },
      ],
    };
  };

  /**
   * Get available knowledge URIs
   */
  const getAvailableKnowledgeURIs = async (): Promise<string[]> => {
    try {
      const index = await state.knowledgeIndexer.loadIndex();
      return index.documents.map((doc: any) => doc.uri);
    } catch {
      return [];
    }
  };

  /**
   * Start codebase watching
   */
  const startCodebaseWatching = (): void => {
    if (state.codebaseIndexer) {
      state.codebaseIndexer.startWatching();
    }
  };

  /**
   * Stop codebase watching
   */
  const stopCodebaseWatching = (): void => {
    if (state.codebaseIndexer) {
      state.codebaseIndexer.stopWatching();
    }
  };

  return {
    initialize,
    getStatus,
    searchCodebase,
    searchKnowledge,
    formatResultsForCLI,
    formatResultsForMCP,
    getAvailableKnowledgeURIs,
    startCodebaseWatching,
    stopCodebaseWatching,
  };
};

/**
 * Singleton instance
 */
let serviceInstance: ReturnType<typeof createUnifiedSearchService> | null = null;

export const getSearchService = (): ReturnType<typeof createUnifiedSearchService> => {
  if (!serviceInstance) {
    serviceInstance = createUnifiedSearchService();
  }
  return serviceInstance;
};
