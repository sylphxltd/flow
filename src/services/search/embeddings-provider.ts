/**
 * Embeddings Provider Service - 嵌入向量提供者服務
 * 統一管理所有embedding相關操作
 */

import type { EmbeddingProvider } from '../../utils/embeddings.js';
import { getDefaultEmbeddingProvider } from '../../utils/embeddings.js';

export interface EmbeddingConfig {
  provider?: 'openai' | 'local' | 'auto';
  model?: string;
  dimensions?: number;
  batchSize?: number;
  maxTokens?: number;
}

export interface EmbeddingResult {
  embeddings: number[][];
  tokensUsed: number;
  processingTime: number;
}

/**
 * 嵌入向量提供者服務
 * 提供統一嘅embedding interface和配置管理
 */
export class EmbeddingsProviderService {
  private provider?: EmbeddingProvider;
  private config: EmbeddingConfig;
  private isInitialized = false;

  constructor(config: EmbeddingConfig = {}) {
    this.config = {
      provider: 'auto',
      batchSize: 10,
      maxTokens: 8000,
      dimensions: 1536,
      ...config,
    };
  }

  /**
   * 初始化embedding provider
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.provider = await getDefaultEmbeddingProvider();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize embedding provider: ${error}`);
    }
  }

  /**
   * 確保已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * 生成嵌入向量
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    await this.ensureInitialized();

    if (!this.provider) {
      throw new Error('Embedding provider not initialized');
    }

    // 檢查文本長度
    const filteredTexts = texts.filter((text) => text.trim().length > 0);
    if (filteredTexts.length === 0) {
      return [];
    }

    // 批量處理
    const batchSize = this.config.batchSize || 10;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < filteredTexts.length; i += batchSize) {
      const batch = filteredTexts.slice(i, i + batchSize);

      try {
        const embeddings = await this.provider.generateEmbeddings(batch);
        allEmbeddings.push(...embeddings);
      } catch (error) {
        console.error(`Failed to generate embeddings for batch ${i}-${i + batchSize}:`, error);
        // 為失敗嘅batch添加零向量
        const zeroVector = new Array(this.config.dimensions || 1536).fill(0);
        allEmbeddings.push(...Array(batch.length).fill(zeroVector));
      }
    }

    return allEmbeddings;
  }

  /**
   * 生成單個文本嘅嵌入向量
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0] || [];
  }

  /**
   * 批量生成嵌入向量（帶性能監控）
   */
  async generateEmbeddingsWithMetrics(texts: string[]): Promise<EmbeddingResult> {
    const startTime = Date.now();

    const embeddings = await this.generateEmbeddings(texts);

    const processingTime = Date.now() - startTime;
    const tokensUsed = this.estimateTokens(texts);

    return {
      embeddings,
      tokensUsed,
      processingTime,
    };
  }

  /**
   * 估算token數量
   */
  private estimateTokens(texts: string[]): number {
    // 簡單嘅token估算（約4 characters = 1 token）
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * 檢查文本是否適合生成embedding
   */
  isValidText(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return false;
    }

    // 檢查長度限制
    const maxTokens = this.config.maxTokens || 8000;
    const estimatedTokens = Math.ceil(trimmed.length / 4);

    return estimatedTokens <= maxTokens;
  }

  /**
   * 預處理文本
   */
  preprocessText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return (
      text
        .trim()
        // 移除多餘嘅空白字符
        .replace(/\s+/g, ' ')
        // 截斷過長嘅文本
        .slice(0, (this.config.maxTokens || 8000) * 4)
    );
  }

  /**
   * 批量預處理文本
   */
  preprocessTexts(texts: string[]): string[] {
    return texts.filter((text) => this.isValidText(text)).map((text) => this.preprocessText(text));
  }

  /**
   * 計算兩個向量嘅餘弦相似度
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 找到最相似嘅向量
   */
  findMostSimilar(
    queryVector: number[],
    candidateVectors: number[][]
  ): { index: number; similarity: number } {
    let bestMatch = { index: -1, similarity: 0 };

    for (let i = 0; i < candidateVectors.length; i++) {
      const similarity = this.cosineSimilarity(queryVector, candidateVectors[i]);
      if (similarity > bestMatch.similarity) {
        bestMatch = { index: i, similarity };
      }
    }

    return bestMatch;
  }

  /**
   * 獲取配置信息
   */
  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<EmbeddingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 如果provider相關配置改變，需要重新初始化
    if (newConfig.provider || newConfig.model) {
      this.isInitialized = false;
    }
  }

  /**
   * 獲取provider信息
   */
  async getProviderInfo(): Promise<{
    provider: string;
    model: string;
    dimensions: number;
    available: boolean;
  }> {
    try {
      await this.ensureInitialized();

      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      // 這裡需要根據實際provider interface實現
      return {
        provider: this.config.provider || 'unknown',
        model: this.config.model || 'unknown',
        dimensions: this.config.dimensions || 1536,
        available: true,
      };
    } catch (error) {
      return {
        provider: this.config.provider || 'unknown',
        model: this.config.model || 'unknown',
        dimensions: this.config.dimensions || 1536,
        available: false,
      };
    }
  }
}

// 預設實例
export const defaultEmbeddingsProvider = new EmbeddingsProviderService();

// 工廠函數
export function createEmbeddingsProvider(config?: EmbeddingConfig): EmbeddingsProviderService {
  return new EmbeddingsProviderService(config);
}
