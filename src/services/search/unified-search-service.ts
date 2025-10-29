/**
 * Unified Search Service - 統一搜索服務
 * 所有搜索功能（CLI、MCP、API）都使用相同的核心邏輯
 */

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
  };
  knowledge: {
    indexed: boolean;
    documentCount: number;
    isIndexing?: boolean;
    progress?: number;
  };
}

/**
 * 統一搜索服務 - CLI 同 MCP 都用呢個
 */
export class UnifiedSearchService {
  private memoryStorage: SeparatedMemoryStorage;
  private knowledgeIndexer = getKnowledgeIndexer();
  private embeddingProvider?: EmbeddingProvider;

  constructor() {
    this.memoryStorage = new SeparatedMemoryStorage();
  }

  /**
   * 初始化搜索服務
   */
  async initialize(): Promise<void> {
    await this.memoryStorage.initialize();

    // Initialize embedding provider if not already done
    if (!this.embeddingProvider) {
      this.embeddingProvider = await getDefaultEmbeddingProvider();
    }

    // Reinitialize knowledge indexer with embedding provider
    this.knowledgeIndexer = getKnowledgeIndexer(this.embeddingProvider);
  }

  /**
   * 獲取搜索狀態
   */
  async getStatus(): Promise<SearchStatus> {
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

    return {
      codebase: {
        indexed: codebaseFiles.length > 0,
        fileCount: codebaseFiles.length,
        indexedAt: codebaseStats.indexedAt,
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
   * 搜索代碼庫 - CLI 同 MCP 都用呢個方法
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
      min_score = 0.0, // Keep the fix for min_score
    } = options;

    // 檢查是否已索引
    const allFiles = await this.memoryStorage.getAllCodebaseFiles();
    if (allFiles.length === 0) {
      throw new Error('Codebase not indexed yet. Run "sylphx search reindex" first.');
    }

    // 應用過濾器
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

  // 使用資料庫中嘅 TF-IDF 索引，避免重新建立
    const { buildSearchIndexFromDB } = await import('./tfidf.js');
    const index = await buildSearchIndexFromDB(this.memoryStorage, {
      file_extensions,
      path_filter,
      exclude_paths
    });

    if (!index) {
      throw new Error('No searchable content found');
    }

    // 執行搜索 with enhanced boost factors for professional tokenizer
    const searchResults = await searchDocuments(query, index, {
      limit,
      minScore: min_score,
      boostFactors: {
        exactMatch: 1.5,
        phraseMatch: 2.0,
        technicalMatch: 1.8, // Enhanced boost for technical terms
        identifierMatch: 1.3, // Boost for code identifiers
      },
    });

    // 轉換結果格式
    const results: SearchResult[] = [];
    for (const result of searchResults) {
      const filename = result.uri?.replace('file://', '') || 'Unknown';
      let content = '';

      if (include_content) {
        const file = await this.memoryStorage.getCodebaseFile(filename);
        if (file?.content) {
          content = file.content.substring(0, 500);
          if (file.content.length > 500) {
            content += '...';
          }
        }
      }

      results.push({
        uri: result.uri,
        score: result.score || 0,
        title: filename.split('/').pop() || filename,
        content: include_content ? content : undefined,
      });
    }

    return {
      results,
      totalIndexed: allFiles.length,
      query,
    };
  }

  
  /**
   * 搜索知識庫 - CLI 同 MCP 都用呢個方法
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
   * 格式化搜索結果為 CLI 輸出 - CLI 用
   */
  formatResultsForCLI(results: SearchResult[], query: string, totalIndexed: number): string {
    if (results.length === 0) {
      return `📭 No results found for "${query}"\n\n**Total indexed files:** ${totalIndexed}`;
    }

    const summary = `✓ Found ${results.length} result(s) for "${query}":\n\n`;
    const formattedResults = results
      .map((result, i) => {
        let line = `${i + 1}. **${result.title}** (Score: ${result.score.toFixed(3)})`;

        // 顯示完整 path 或 URI
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
   * 格式化搜索結果為 MCP 回應 - MCP 用
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

        // 包含 URI 方便 knowledge_get 使用
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
   * 獲取所有可用嘅 knowledge URIs - 動態生成，唔 hardcoded
   */
  async getAvailableKnowledgeURIs(): Promise<string[]> {
    try {
      const index = await this.knowledgeIndexer.loadIndex();
      return index.documents.map((doc) => doc.uri);
    } catch {
      return [];
    }
  }
}

// 單例模式 - 確保所有地方都用同一個實例
export const searchService = new UnifiedSearchService();
