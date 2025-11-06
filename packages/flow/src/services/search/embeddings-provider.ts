/**
 * Embeddings Provider Service - 嵌入向量提供者服務
 * 統一管理所有embedding相關操作
 */

import { type Result, tryCatchAsync } from '../../core/functional/result.js';
import {
  EmbeddingInitError,
  EmbeddingNotInitializedError,
  type EmbeddingsErrorType,
  VectorDimensionError,
} from '../../errors/embeddings-errors.js';
import type { EmbeddingProvider } from '../../utils/embeddings.js';
import { getDefaultEmbeddingProvider } from '../../utils/embeddings.js';
import { chunk } from '../../utils/functional/array.js';
import { createLogger } from '@sylphx/code-core';

const log = createLogger('search:embeddings');

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
 * Internal state for embeddings provider
 */
interface EmbeddingsProviderState {
  readonly provider?: EmbeddingProvider;
  readonly isInitialized: boolean;
}

/**
 * Embeddings Provider Service Interface
 * 嵌入向量提供者服務
 */
export interface EmbeddingsProviderService {
  readonly initialize: () => Promise<Result<void, EmbeddingsErrorType>>;
  readonly generateEmbeddings: (
    texts: string[]
  ) => Promise<Result<number[][], EmbeddingsErrorType>>;
  readonly generateEmbedding: (text: string) => Promise<Result<number[], EmbeddingsErrorType>>;
  readonly generateEmbeddingsWithMetrics: (
    texts: string[]
  ) => Promise<Result<EmbeddingResult, EmbeddingsErrorType>>;
  readonly isValidText: (text: string) => boolean;
  readonly preprocessText: (text: string) => string;
  readonly preprocessTexts: (texts: string[]) => string[];
  readonly cosineSimilarity: (
    vecA: number[],
    vecB: number[]
  ) => Result<number, VectorDimensionError>;
  readonly findMostSimilar: (
    queryVector: number[],
    candidateVectors: number[][]
  ) => Result<{ index: number; similarity: number }, VectorDimensionError>;
  readonly getConfig: () => EmbeddingConfig;
  readonly updateConfig: (newConfig: Partial<EmbeddingConfig>) => void;
  readonly getProviderInfo: () => Promise<
    Result<
      {
        provider: string;
        model: string;
        dimensions: number;
        available: boolean;
      },
      EmbeddingsErrorType
    >
  >;
}

/**
 * Create embeddings provider service (Factory Function)
 * 提供統一嘅embedding interface和配置管理
 */
export const createEmbeddingsProviderService = (
  config: EmbeddingConfig = {}
): EmbeddingsProviderService => {
  // Immutable config with defaults
  let serviceConfig: EmbeddingConfig = {
    provider: 'auto',
    batchSize: 10,
    maxTokens: 8000,
    dimensions: 1536,
    ...config,
  };

  // Mutable state in closure (will be updated immutably)
  let state: EmbeddingsProviderState = {
    provider: undefined,
    isInitialized: false,
  };

  // Helper: Update state immutably
  const updateState = (updates: Partial<EmbeddingsProviderState>): void => {
    state = { ...state, ...updates };
  };

  /**
   * 初始化embedding provider
   */
  const initialize = async (): Promise<Result<void, EmbeddingsErrorType>> => {
    if (state.isInitialized) {
      return { _tag: 'Success', value: undefined };
    }

    return await tryCatchAsync(
      async () => {
        const provider = await getDefaultEmbeddingProvider();
        updateState({ provider, isInitialized: true });
        return undefined;
      },
      (error) => new EmbeddingInitError(error)
    );
  };

  /**
   * 確保已初始化
   */
  const ensureInitialized = async (): Promise<Result<void, EmbeddingsErrorType>> => {
    if (!state.isInitialized) {
      return await initialize();
    }
    return { _tag: 'Success', value: undefined };
  };

  /**
   * 生成嵌入向量
   */
  const generateEmbeddings = async (
    texts: string[]
  ): Promise<Result<number[][], EmbeddingsErrorType>> => {
    return await tryCatchAsync(
      async () => {
        const initResult = await ensureInitialized();
        if (initResult._tag === 'Failure') {
          throw initResult.error;
        }

        if (!state.provider) {
          throw new EmbeddingNotInitializedError();
        }

        // 檢查文本長度
        const filteredTexts = texts.filter((text) => text.trim().length > 0);
        if (filteredTexts.length === 0) {
          return [];
        }

        // FUNCTIONAL: 批量處理 - Use chunk and flatMap instead of for loop
        const batchSize = serviceConfig.batchSize || 10;
        const batches = chunk(batchSize)(filteredTexts);

        // Process batches and flatten results
        const batchResults = await Promise.all(
          batches.map(async (batch, index) => {
            try {
              return await state.provider?.generateEmbeddings(batch);
            } catch (error) {
              log(
                `Batch ${index * batchSize}-${index * batchSize + batchSize} failed:`,
                error instanceof Error ? error.message : String(error)
              );
              // 為失敗嘅batch添加零向量
              const zeroVector = new Array(serviceConfig.dimensions || 1536).fill(0);
              return Array(batch.length).fill(zeroVector);
            }
          })
        );

        return batchResults.flat();
      },
      (error) => {
        if (error instanceof EmbeddingInitError || error instanceof EmbeddingNotInitializedError) {
          return error;
        }
        return new EmbeddingInitError(error);
      }
    );
  };

  /**
   * 生成單個文本嘅嵌入向量
   */
  const generateEmbedding = async (
    text: string
  ): Promise<Result<number[], EmbeddingsErrorType>> => {
    return await tryCatchAsync(
      async () => {
        const result = await generateEmbeddings([text]);
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
  };

  /**
   * 批量生成嵌入向量（帶性能監控）
   */
  const generateEmbeddingsWithMetrics = async (
    texts: string[]
  ): Promise<Result<EmbeddingResult, EmbeddingsErrorType>> => {
    return await tryCatchAsync(
      async () => {
        const startTime = Date.now();

        const result = await generateEmbeddings(texts);
        if (result._tag === 'Failure') {
          throw result.error;
        }

        const processingTime = Date.now() - startTime;
        const tokensUsed = estimateTokens(texts);

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
  };

  /**
   * 估算token數量
   */
  const estimateTokens = (texts: string[]): number => {
    // 簡單嘅token估算（約4 characters = 1 token）
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    return Math.ceil(totalChars / 4);
  };

  /**
   * 檢查文本是否適合生成embedding
   */
  const isValidText = (text: string): boolean => {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return false;
    }

    // 檢查長度限制
    const maxTokens = serviceConfig.maxTokens || 8000;
    const estimatedTokens = Math.ceil(trimmed.length / 4);

    return estimatedTokens <= maxTokens;
  };

  /**
   * 預處理文本
   */
  const preprocessText = (text: string): string => {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return (
      text
        .trim()
        // 移除多餘嘅空白字符
        .replace(/\s+/g, ' ')
        // 截斷過長嘅文本
        .slice(0, (serviceConfig.maxTokens || 8000) * 4)
    );
  };

  /**
   * 批量預處理文本
   */
  const preprocessTexts = (texts: string[]): string[] => {
    return texts.filter((text) => isValidText(text)).map((text) => preprocessText(text));
  };

  /**
   * 計算兩個向量嘅餘弦相似度
   */
  const cosineSimilarity = (
    vecA: number[],
    vecB: number[]
  ): Result<number, VectorDimensionError> => {
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
  };

  /**
   * 找到最相似嘅向量
   */
  const findMostSimilar = (
    queryVector: number[],
    candidateVectors: number[][]
  ): Result<{ index: number; similarity: number }, VectorDimensionError> => {
    // FUNCTIONAL: Use reduce instead of for loop
    const result = candidateVectors.reduce<
      Result<{ index: number; similarity: number }, VectorDimensionError>
    >(
      (acc, candidateVector, index) => {
        // Short-circuit on error
        if (acc._tag === 'Failure') {
          return acc;
        }

        const similarityResult = cosineSimilarity(queryVector, candidateVector);
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
  };

  /**
   * 獲取配置信息
   */
  const getConfig = (): EmbeddingConfig => {
    return { ...serviceConfig };
  };

  /**
   * 更新配置
   */
  const updateConfig = (newConfig: Partial<EmbeddingConfig>): void => {
    serviceConfig = { ...serviceConfig, ...newConfig };

    // 如果provider相關配置改變，需要重新初始化
    if (newConfig.provider || newConfig.model) {
      updateState({ isInitialized: false });
    }
  };

  /**
   * 獲取provider信息
   */
  const getProviderInfo = async (): Promise<
    Result<
      {
        provider: string;
        model: string;
        dimensions: number;
        available: boolean;
      },
      EmbeddingsErrorType
    >
  > => {
    return await tryCatchAsync(
      async () => {
        const initResult = await ensureInitialized();
        if (initResult._tag === 'Failure') {
          // Return unavailable info instead of throwing
          return {
            provider: serviceConfig.provider || 'unknown',
            model: serviceConfig.model || 'unknown',
            dimensions: serviceConfig.dimensions || 1536,
            available: false,
          };
        }

        if (!state.provider) {
          return {
            provider: serviceConfig.provider || 'unknown',
            model: serviceConfig.model || 'unknown',
            dimensions: serviceConfig.dimensions || 1536,
            available: false,
          };
        }

        // 這裡需要根據實際provider interface實現
        return {
          provider: serviceConfig.provider || 'unknown',
          model: serviceConfig.model || 'unknown',
          dimensions: serviceConfig.dimensions || 1536,
          available: true,
        };
      },
      (error) => new EmbeddingInitError(error)
    );
  };

  // Return service interface
  return {
    initialize,
    generateEmbeddings,
    generateEmbedding,
    generateEmbeddingsWithMetrics,
    isValidText,
    preprocessText,
    preprocessTexts,
    cosineSimilarity,
    findMostSimilar,
    getConfig,
    updateConfig,
    getProviderInfo,
  };
};

// 預設實例 - Use factory function
export const defaultEmbeddingsProvider = createEmbeddingsProviderService();

// 工廠函數別名 - For backwards compatibility
export function createEmbeddingsProvider(config?: EmbeddingConfig): EmbeddingsProviderService {
  return createEmbeddingsProviderService(config);
}
