/**
 * Unified Search Service - 統一搜索服務
 * 所有搜索功能（CLI、MCP、API）都使用相同的核心邏輯
 */

import { SeparatedMemoryStorage } from '../storage/separated-storage.js';
import { CodebaseIndexer } from './codebase-indexer.js';
import type { EmbeddingProvider } from './embeddings.js';
import { getDefaultEmbeddingProvider } from './embeddings.js';
import { getKnowledgeIndexer, getKnowledgeIndexerWithEmbeddings } from './knowledge-indexer.js';
import { type SearchIndex, searchDocuments } from './tfidf.js';

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
  private codebaseIndexer?: CodebaseIndexer;
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

    // Initialize codebase indexer
    this.codebaseIndexer = new CodebaseIndexer();
  }

  /**
   * 獲取搜索狀態
   */
  async getStatus(): Promise<SearchStatus> {
    // Codebase status - use CodebaseIndexer
    let codebaseIndexed = false;
    let codebaseFileCount = 0;
    let codebaseIndexedAt: string | undefined;

    if (this.codebaseIndexer) {
      try {
        const stats = await this.codebaseIndexer.getCacheStats();
        codebaseIndexed = stats.fileCount > 0;
        codebaseFileCount = stats.fileCount;
        codebaseIndexedAt = stats.indexedAt;
      } catch {
        // Not indexed yet or error
      }
    }

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
        indexed: codebaseIndexed,
        fileCount: codebaseFileCount,
        indexedAt: codebaseIndexedAt,
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
      min_score = 0.0,
    } = options;

    if (!this.codebaseIndexer) {
      throw new Error('Codebase indexer not initialized');
    }

    // 確保索引已建立
    await this.ensureCodebaseIndexed();

    // 使用 CodebaseIndexer 的搜索功能
    const searchResults = await this.codebaseIndexer.search(query, {
      limit,
      minScore: min_score,
      includeContent: include_content,
    });

    // 轉換結果格式
    const results: SearchResult[] = searchResults.map((result) => ({
      uri: `file://${result.path}`,
      score: result.score || 0,
      title: result.path.split('/').pop() || result.path,
      content: include_content && result.content ?
        (result.content.length > 500 ? result.content.substring(0, 500) + '...' : result.content) :
        undefined,
    }));

    return {
      results,
      totalIndexed: await this.getCodebaseFileCount(),
      query,
    };
  }

  /**
   * 確保代碼庫已索引
   */
  private async ensureCodebaseIndexed(): Promise<void> {
    if (!this.codebaseIndexer) {
      throw new Error('Codebase indexer not initialized');
    }

    try {
      const stats = await this.codebaseIndexer.getCacheStats();
      if (stats.fileCount === 0) {
        console.log('[INFO] Codebase not indexed, auto-indexing...');
        await this.codebaseIndexer.indexCodebase({
          embeddingProvider: this.embeddingProvider
        });
        console.log('[INFO] Codebase indexing complete');
      }
    } catch (error) {
      console.error('[ERROR] Failed to ensure codebase is indexed:', error);
      throw new Error('Failed to index codebase. Please run "sylphx-flow codebase reindex" manually.');
    }
  }

  /**
   * 獲取代碼庫文件數量
   */
  private async getCodebaseFileCount(): Promise<number> {
    if (!this.codebaseIndexer) {
      return 0;
    }

    try {
      const stats = await this.codebaseIndexer.getCacheStats();
      return stats.fileCount;
    } catch {
      return 0;
    }
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
      const searchResults = await searchDocuments(query, index, { limit });

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
   * 構建搜索索引 - 內部方法
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

      // 獲取 IDF 值
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
      console.error('[ERROR] Failed to build search index:', error);
      return null;
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
