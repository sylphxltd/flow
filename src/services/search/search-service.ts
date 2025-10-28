/**
 * Semantic Search Service - 統一語義搜索服務
 * 提供跨domain嘅搜索功能：workspace, codebase, knowledge
 */

import type { VectorStorage } from '../storage/lancedb-vector-storage.js';
import { SeparatedMemoryStorage } from '../storage/separated-storage.js';
import type { EmbeddingProvider } from './embeddings.js';
import { getDefaultEmbeddingProvider } from './embeddings.js';
import { type SearchIndex, buildSearchIndex, searchDocuments } from './tfidf.js';

export interface SearchResult {
  uri: string;
  score: number;
  title?: string;
  content?: string;
  metadata?: {
    type: 'codebase' | 'knowledge' | 'workspace';
    category?: string;
    language?: string;
    path?: string;
  };
}

export interface SearchOptions {
  limit?: number;
  include_content?: boolean;
  file_extensions?: string[];
  path_filter?: string;
  exclude_paths?: string[];
  min_score?: number;
  domain?: 'codebase' | 'knowledge' | 'workspace' | 'all';
}

export interface ContentMetadata {
  uri: string;
  content: string;
  type: 'codebase' | 'knowledge' | 'workspace';
  category?: string;
  language?: string;
  path?: string;
}

/**
 * 語義搜索服務
 * 統一處理所有domain嘅搜索需求
 */
export class SemanticSearchService {
  private memoryStorage: SeparatedMemoryStorage;
  private embeddingProvider?: EmbeddingProvider;
  private vectorStorage?: VectorStorage;
  private searchIndexes: Map<string, SearchIndex> = new Map();

  constructor(embeddingProvider?: EmbeddingProvider) {
    this.memoryStorage = new SeparatedMemoryStorage();
    this.embeddingProvider = embeddingProvider;
  }

  /**
   * 初始化embedding provider
   */
  async initialize(): Promise<void> {
    if (!this.embeddingProvider) {
      this.embeddingProvider = await getDefaultEmbeddingProvider();
    }
  }

  /**
   * 搜索指定domain嘅內容
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { domain = 'all', limit = 10, include_content = false } = options;

    // 確保已初始化
    await this.initialize();

    const results: SearchResult[] = [];

    // 根據domain搜索
    if (domain === 'all' || domain === 'knowledge') {
      const knowledgeResults = await this.searchKnowledge(query, {
        limit: Math.ceil(limit / 3),
        include_content,
      });
      results.push(...knowledgeResults);
    }

    if (domain === 'all' || domain === 'codebase') {
      const codebaseResults = await this.searchCodebase(query, {
        limit: Math.ceil(limit / 3),
        include_content,
      });
      results.push(...codebaseResults);
    }

    if (domain === 'all' || domain === 'workspace') {
      const workspaceResults = await this.searchWorkspace(query, {
        limit: Math.ceil(limit / 3),
        include_content,
      });
      results.push(...workspaceResults);
    }

    // 按score排序並限制結果數量
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * 搜索knowledge base
   */
  private async searchKnowledge(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // 實現knowledge搜索邏輯
    const knowledgeIndex = this.searchIndexes.get('knowledge');
    if (!knowledgeIndex) {
      return [];
    }

    const searchResults = searchDocuments(query, knowledgeIndex, {
      limit: options.limit,
      minScore: options.min_score || 0.1,
    });

    return searchResults.map((result) => ({
      ...result,
      metadata: {
        type: 'knowledge' as const,
        category: result.metadata?.category,
        language: 'markdown',
      },
    }));
  }

  /**
   * 搜索codebase
   */
  private async searchCodebase(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // 實現codebase搜索邏輯
    const codebaseIndex = this.searchIndexes.get('codebase');
    if (!codebaseIndex) {
      return [];
    }

    const searchResults = searchDocuments(query, codebaseIndex, {
      limit: options.limit,
      minScore: options.min_score || 0.1,
    });

    return searchResults.map((result) => ({
      ...result,
      metadata: {
        type: 'codebase' as const,
        language: result.metadata?.language,
        path: result.metadata?.path,
      },
    }));
  }

  /**
   * 搜索workspace
   */
  private async searchWorkspace(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // 實現workspace搜索邏輯
    const workspaceIndex = this.searchIndexes.get('workspace');
    if (!workspaceIndex) {
      return [];
    }

    const searchResults = searchDocuments(query, workspaceIndex, {
      limit: options.limit,
      minScore: options.min_score || 0.1,
    });

    return searchResults.map((result) => ({
      ...result,
      metadata: {
        type: 'workspace' as const,
        category: result.metadata?.category,
      },
    }));
  }

  /**
   * 索引內容
   */
  async indexContent(content: ContentMetadata): Promise<void> {
    const domain = content.type;

    // 確保index存在
    if (!this.searchIndexes.has(domain)) {
      await this.buildIndexForDomain(domain);
    }

    // 如果有embedding provider，加入向量索引
    if (this.embeddingProvider) {
      await this.addToVectorIndex(content);
    }
  }

  /**
   * 為指定domain建立index
   */
  private async buildIndexForDomain(domain: string): Promise<void> {
    // 根據domain獲取相應內容並建立index
    // 這裡需要根據實際需求實現
    console.log(`Building search index for domain: ${domain}`);
  }

  /**
   * 加入向量索引
   */
  private async addToVectorIndex(content: ContentMetadata): Promise<void> {
    if (!this.embeddingProvider || !this.vectorStorage) {
      return;
    }

    try {
      const embedding = await this.embeddingProvider.generateEmbeddings([content.content]);

      await this.vectorStorage.addDocument({
        id: content.uri,
        embedding: embedding[0],
        metadata: {
          type: content.type,
          content: content.content.slice(0, 500),
          category: content.category,
          language: content.language,
          path: content.path,
        },
      });
    } catch (error) {
      console.error(`Failed to add ${content.uri} to vector index:`, error);
    }
  }

  /**
   * 獲取搜索狀態
   */
  async getSearchStatus(): Promise<{
    [domain: string]: {
      indexed: boolean;
      documentCount: number;
      indexedAt?: string;
    };
  }> {
    return {
      knowledge: {
        indexed: this.searchIndexes.has('knowledge'),
        documentCount: 0, // 需要實際計算
      },
      codebase: {
        indexed: this.searchIndexes.has('codebase'),
        documentCount: 0, // 需要實際計算
      },
      workspace: {
        indexed: this.searchIndexes.has('workspace'),
        documentCount: 0, // 需要實際計算
      },
    };
  }
}

// Singleton instance
let searchService: SemanticSearchService | null = null;

export function getSearchService(): SemanticSearchService {
  if (!searchService) {
    searchService = new SemanticSearchService();
  }
  return searchService;
}
