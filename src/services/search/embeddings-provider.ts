/**
 * Embeddings Provider Service - 嵌入向量提供者服務
 * 統一管理所有embedding相關操作
 */

import { type Result, tryCatchAsync } from '../../core/functional/result.js';
import {
  EmbeddingInitError,
  EmbeddingNotInitializedError,
  VectorDimensionError,
  type EmbeddingsErrorType,
} from '../../errors/embeddings-errors.js';
import type { EmbeddingProvider } from '../../utils/embeddings.js';
import { getDefaultEmbeddingProvider } from '../../utils/embeddings.js';
import { chunk } from '../../utils/functional/array.js';

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
  async initialize(): Promise<Result<void, EmbeddingsErrorType>> {
    if (this.isInitialized) {
      return { _tag: 'Success', value: undefined };
    }

    return await tryCatchAsync(
      async () => {
        this.provider = await getDefaultEmbeddingProvider();
        this.isInitialized = true;
        return undefined;
      },
      (error) => new EmbeddingInitError(error)
    );
  }

  /**
   * 確保已初始化
   */
  private async ensureInitialized(): Promise<Result<void, EmbeddingsErrorType>> {
    if (!this.isInitialized) {
      return await this.initialize();
    }
    return { _tag: 'Success', value: undefined };
  }

  /**
   * 生成嵌入向量
   */
  async generateEmbeddings(texts: string[]): Promise<Result<number[][], EmbeddingsErrorType>> {
    return await tryCatchAsync(
      async () => {
        const initResult = await this.ensureInitialized();
        if (initResult._tag === 'Failure') {
          throw initResult.error;
        }

        if (!this.provider) {
          throw new EmbeddingNotInitializedError();
        }

        // 檢查文本長度
        const filteredTexts = texts.filter((text) => text.trim().length > 0);
        if (filteredTexts.length === 0) {
          return [];
        }

        // FUNCTIONAL: 批量處理 - Use chunk and flatMap instead of for loop
        const batchSize = this.config.batchSize || 10;
        const batches = chunk(batchSize)(filteredTexts);

        // Process batches and flatten results
        const batchResults = await Promise.all(
          batches.map(async (batch, index) => {
            try {
              return await this.provider.generateEmbeddings(batch);
            } catch (error) {
              console.error(
                `Failed to generate embeddings for batch ${index * batchSize}-${index * batchSize + batchSize}:`,
                error
              );
              // 為失敗嘅batch添加零向量
              const zeroVector = new Array(this.config.dimensions || 1536).fill(0);
              return Array(batch.length).fill(zeroVector);
            }
          })
        );

        return batchResults.flat();
      },
      (error) => {
        if (
          error instanceof EmbeddingInitError ||
          error instanceof EmbeddingNotInitializedError
        ) {
          return error;
        }
        return new EmbeddingInitError(error);
      }
    );
  }

  /**
   * 生成單個文本嘅嵌入向量
   */
  async generateEmbedding(text: string): Promise<Result<number[], EmbeddingsErrorType>> {
    return await tryCatchAsync(
      async () => {
        const result = await this.generateEmbeddings([text]);
        if (result._tag === 'Failure') {
          throw result.error;
        }
        return result.value[0] || [];
      },
      (error) => {
        if (error instanceof EmbeddingInitError || error instanceof EmbeddingNotInitializedError) {
          return error;
        }
        return new EmbeddingInitError(error);
      }
    );
  }

  /**
   * 批量生成嵌入向量（帶性能監控）
   */
  async generateEmbeddingsWithMetrics(
    texts: string[]
  ): Promise<Result<EmbeddingResult, EmbeddingsErrorType>> {
    return await tryCatchAsync(
      async () => {
        const startTime = Date.now();

        const result = await this.generateEmbeddings(texts);
        if (result._tag === 'Failure') {
          throw result.error;
        }

        const processingTime = Date.now() - startTime;
        const tokensUsed = this.estimateTokens(texts);

        return {
          embeddings: result.value,
          tokensUsed,
          processingTime,
        };
      },
      (error) => {
        if (error instanceof EmbeddingInitError || error instanceof EmbeddingNotInitializedError) {
          return error;
        }
        return new EmbeddingInitError(error);
      }
    );
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
  cosineSimilarity(vecA: number[], vecB: number[]): Result<number, VectorDimensionError> {
    if (vecA.length !== vecB.length) {
      return { _tag: 'Failure', error: new VectorDimensionError(vecA.length, vecB.length) };
    }

    // FUNCTIONAL: Use reduce instead of for loop
    const { dotProduct, normA, normB } = vecA.reduce(
      (acc, aVal, i) => {
        const bVal = vecB[i];
        return {
          dotProduct: acc.dotProduct + aVal * bVal,
          normA: acc.normA + aVal * aVal,
          normB: acc.normB + bVal * bVal,
        };
      },
      { dotProduct: 0, normA: 0, normB: 0 }
    );

    if (normA === 0 || normB === 0) {
      return { _tag: 'Success', value: 0 };
    }

    return { _tag: 'Success', value: dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) };
  }

  /**
   * 找到最相似嘅向量
   */
  findMostSimilar(
    queryVector: number[],
    candidateVectors: number[][]
  ): Result<{ index: number; similarity: number }, VectorDimensionError> {
    // FUNCTIONAL: Use reduce instead of for loop
    const result = candidateVectors.reduce<
      Result<{ index: number; similarity: number }, VectorDimensionError>
    >(
      (acc, candidateVector, index) => {
        // Short-circuit on error
        if (acc._tag === 'Failure') {
          return acc;
        }

        const similarityResult = this.cosineSimilarity(queryVector, candidateVector);
        if (similarityResult._tag === 'Failure') {
          return similarityResult;
        }

        const similarity = similarityResult.value;
        return similarity > acc.value.similarity
          ? { _tag: 'Success', value: { index, similarity } }
          : acc;
      },
      { _tag: 'Success', value: { index: -1, similarity: 0 } }
    );

    return result;
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
  async getProviderInfo(): Promise<
    Result<
      {
        provider: string;
        model: string;
        dimensions: number;
        available: boolean;
      },
      EmbeddingsErrorType
    >
  > {
    return await tryCatchAsync(
      async () => {
        const initResult = await this.ensureInitialized();
        if (initResult._tag === 'Failure') {
          // Return unavailable info instead of throwing
          return {
            provider: this.config.provider || 'unknown',
            model: this.config.model || 'unknown',
            dimensions: this.config.dimensions || 1536,
            available: false,
          };
        }

        if (!this.provider) {
          return {
            provider: this.config.provider || 'unknown',
            model: this.config.model || 'unknown',
            dimensions: this.config.dimensions || 1536,
            available: false,
          };
        }

        // 這裡需要根據實際provider interface實現
        return {
          provider: this.config.provider || 'unknown',
          model: this.config.model || 'unknown',
          dimensions: this.config.dimensions || 1536,
          available: true,
        };
      },
      (error) => new EmbeddingInitError(error)
    );
  }
}

// 預設實例
export const defaultEmbeddingsProvider = new EmbeddingsProviderService();

// 工廠函數
export function createEmbeddingsProvider(config?: EmbeddingConfig): EmbeddingsProviderService {
  return new EmbeddingsProviderService(config);
}
