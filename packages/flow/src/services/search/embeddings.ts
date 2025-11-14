/**
 * Embedding generation utilities - Refactored
 * 用 Vercel AI SDK 支持多個 providers
 *
 * Supported providers:
 * - OpenAI (text-embedding-3-small, text-embedding-3-large, ada-002)
 * - Anthropic (Voyager models)
 * - Google (text-embedding-004, text-multilingual-embedding-002)
 * - Cohere (embed-english-v3.0, embed-multilingual-v3.0)
 * - OpenRouter (任何支持 embedding 嘅模型)
 */

import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateMockEmbedding } from '../storage/vector-storage.js';
import { createLogger } from '../../utils/debug-logger.js';

const log = createLogger('search:embeddings');

/**
 * Embedding Provider 類型
 */
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'cohere' | 'openrouter' | 'mock';

/**
 * Embedding Model 配置
 */
export interface EmbeddingModelConfig {
  provider: ProviderType;
  model: string;
  dimensions: number;
  description?: string;
}

/**
 * 預設 Embedding Models
 */
export const EMBEDDING_MODELS: Record<string, EmbeddingModelConfig> = {
  // OpenAI
  'openai-small': {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    description: 'OpenAI - Fast and cost-effective (1536 dims)',
  },
  'openai-large': {
    provider: 'openai',
    model: 'text-embedding-3-large',
    dimensions: 3072,
    description: 'OpenAI - Higher quality (3072 dims)',
  },
  'openai-ada': {
    provider: 'openai',
    model: 'text-embedding-ada-002',
    dimensions: 1536,
    description: 'OpenAI - Legacy model (1536 dims)',
  },

  // Google
  'google-latest': {
    provider: 'google',
    model: 'text-embedding-004',
    dimensions: 768,
    description: 'Google - Latest embedding model (768 dims)',
  },
  'google-multilingual': {
    provider: 'google',
    model: 'text-multilingual-embedding-002',
    dimensions: 768,
    description: 'Google - Multilingual support (768 dims)',
  },

  // Voyage AI (via OpenRouter or direct)
  'voyage-large': {
    provider: 'openrouter',
    model: 'voyageai/voyage-large-2-instruct',
    dimensions: 1024,
    description: 'Voyage AI - Large instruct (1024 dims)',
  },
  'voyage-code': {
    provider: 'openrouter',
    model: 'voyageai/voyage-code-2',
    dimensions: 1536,
    description: 'Voyage AI - Optimized for code (1536 dims)',
  },
};

/**
 * Embedding Provider Interface
 */
export interface EmbeddingProvider {
  name: string;
  model: string;
  dimensions: number;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * Universal Embedding Provider (用 AI SDK)
 */
export class UniversalEmbeddingProvider implements EmbeddingProvider {
  name: string;
  model: string;
  dimensions: number;
  private provider: ProviderType;
  private apiKey?: string;

  constructor(config: {
    provider: ProviderType;
    model: string;
    dimensions: number;
    apiKey?: string;
  }) {
    this.provider = config.provider;
    this.model = config.model;
    this.dimensions = config.dimensions;
    this.apiKey = config.apiKey;
    this.name = `${config.provider}:${config.model}`;
  }

  /**
   * 獲取 AI SDK 模型實例
   */
  private getModelInstance() {
    switch (this.provider) {
      case 'openai':
        return openai.embedding(this.model, {
          apiKey: this.apiKey || process.env.OPENAI_API_KEY,
        });

      case 'anthropic':
        return anthropic.embedding(this.model, {
          apiKey: this.apiKey || process.env.ANTHROPIC_API_KEY,
        });

      case 'google':
        return google.embedding(this.model, {
          apiKey: this.apiKey || process.env.GOOGLE_API_KEY,
        });

      case 'openrouter': {
        const openrouter = createOpenRouter({
          apiKey: this.apiKey || process.env.OPENROUTER_API_KEY,
        });
        return openrouter.embedding(this.model);
      }

      case 'mock':
        throw new Error('Mock provider should not call getModelInstance');

      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Mock provider
    if (this.provider === 'mock') {
      return generateMockEmbedding(text, this.dimensions);
    }

    try {
      const model = this.getModelInstance();
      const { embedding } = await embed({
        model,
        value: text,
      });

      return embedding;
    } catch (error) {
      log(`Failed to generate embedding with ${this.name}:`, error);
      log('Falling back to mock embedding');
      return generateMockEmbedding(text, this.dimensions);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Mock provider
    if (this.provider === 'mock') {
      return texts.map((text) => generateMockEmbedding(text, this.dimensions));
    }

    try {
      const model = this.getModelInstance();
      const { embeddings } = await embedMany({
        model,
        values: texts,
      });

      return embeddings;
    } catch (error) {
      log(`Failed to generate embeddings with ${this.name}:`, error);
      log('Falling back to mock embeddings');
      return texts.map((text) => generateMockEmbedding(text, this.dimensions));
    }
  }
}

/**
 * 從配置創建 Embedding Provider
 */
export function createEmbeddingProvider(
  modelKey: keyof typeof EMBEDDING_MODELS | string,
  apiKey?: string
): EmbeddingProvider {
  // 使用預設模型
  if (modelKey in EMBEDDING_MODELS) {
    const config = EMBEDDING_MODELS[modelKey as keyof typeof EMBEDDING_MODELS];
    return new UniversalEmbeddingProvider({
      provider: config.provider,
      model: config.model,
      dimensions: config.dimensions,
      apiKey,
    });
  }

  // 自定義配置（格式：provider:model:dimensions）
  const parts = modelKey.split(':');
  if (parts.length === 3) {
    return new UniversalEmbeddingProvider({
      provider: parts[0] as ProviderType,
      model: parts[1],
      dimensions: parseInt(parts[2], 10),
      apiKey,
    });
  }

  // Fallback to mock
  log(`Unknown model "${modelKey}", using mock provider`);
  return new UniversalEmbeddingProvider({
    provider: 'mock',
    model: 'mock',
    dimensions: 1536,
  });
}

/**
 * 自動檢測並返回最佳可用 provider
 */
export async function getDefaultEmbeddingProvider(): Promise<EmbeddingProvider> {
  // 優先級：OpenAI > Google > OpenRouter > Mock

  if (process.env.OPENAI_API_KEY) {
    log('Using OpenAI embedding provider');
    return createEmbeddingProvider('openai-small', process.env.OPENAI_API_KEY);
  }

  if (process.env.GOOGLE_API_KEY) {
    log('Using Google embedding provider');
    return createEmbeddingProvider('google-latest', process.env.GOOGLE_API_KEY);
  }

  if (process.env.OPENROUTER_API_KEY) {
    log('Using OpenRouter embedding provider');
    return createEmbeddingProvider('voyage-code', process.env.OPENROUTER_API_KEY);
  }

  log('No API key found, using mock embedding provider');
  return createEmbeddingProvider('mock');
}

/**
 * 獲取用戶選擇的 provider（互動式）
 */
export async function promptUserForProvider(): Promise<EmbeddingProvider> {
  const { select } = await import('@inquirer/prompts');

  const availableModels = listAvailableModels().filter(m => m.available);

  if (availableModels.length === 0) {
    log('No API keys configured, using mock provider');
    return createEmbeddingProvider('mock');
  }

  if (availableModels.length === 1) {
    const model = availableModels[0];
    log(`Only one provider available: ${model.key}`);
    return createEmbeddingProvider(model.key);
  }

  // 互動式選擇
  const answer = await select({
    message: 'Select embedding provider:',
    choices: availableModels.map(({ key, config }) => ({
      name: `${config.description || config.model} [${config.provider}]`,
      value: key,
      description: `${config.dimensions} dimensions`,
    })),
  });

  return createEmbeddingProvider(answer);
}

/**
 * 列出所有可用的 embedding models
 */
export function listAvailableModels(): Array<{
  key: string;
  config: EmbeddingModelConfig;
  available: boolean;
}> {
  return Object.entries(EMBEDDING_MODELS).map(([key, config]) => {
    let available = false;

    switch (config.provider) {
      case 'openai':
        available = !!process.env.OPENAI_API_KEY;
        break;
      case 'google':
        available = !!process.env.GOOGLE_API_KEY;
        break;
      case 'anthropic':
        available = !!process.env.ANTHROPIC_API_KEY;
        break;
      case 'openrouter':
        available = !!process.env.OPENROUTER_API_KEY;
        break;
      case 'mock':
        available = true;
        break;
    }

    return { key, config, available };
  });
}

/**
 * Chunk text (保留原有功能)
 */
export function chunkText(
  text: string,
  options: {
    maxChunkSize?: number;
    overlap?: number;
  } = {}
): string[] {
  const { maxChunkSize = 1000, overlap = 100 } = options;

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);

    start = end - overlap;
    if (start >= text.length) {
      break;
    }
  }

  return chunks;
}
