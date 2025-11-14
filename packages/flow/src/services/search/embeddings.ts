/**
 * Embedding generation utilities - Pure Functional
 * 用 Vercel AI SDK OpenAI Provider
 *
 * Design:
 * - Pure functions (no classes)
 * - Immutable data structures
 * - Function composition
 * - Config from environment variables
 */

import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { EmbeddingModel } from '@ai-sdk/openai/internal';
import { generateMockEmbedding } from '../storage/vector-storage.js';
import { createLogger } from '../../utils/debug-logger.js';

const log = createLogger('search:embeddings');

/**
 * Embedding Provider Config
 */
export interface EmbeddingConfig {
  readonly provider: 'openai' | 'mock';
  readonly model: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  readonly dimensions: number;
  readonly apiKey?: string;
}

/**
 * Embedding Provider Interface
 */
export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;
  readonly generateEmbedding: (text: string) => Promise<number[]>;
  readonly generateEmbeddings: (texts: string[]) => Promise<number[][]>;
}

/**
 * Get dimensions for OpenAI model
 */
const getModelDimensions = (
  model: EmbeddingConfig['model']
): number => {
  switch (model) {
    case 'text-embedding-3-large':
      return 3072;
    case 'text-embedding-3-small':
    case 'text-embedding-ada-002':
    default:
      return 1536;
  }
};

/**
 * Create default config from environment
 */
export const createDefaultConfig = (): EmbeddingConfig => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = (process.env.EMBEDDING_MODEL || 'text-embedding-3-small') as EmbeddingConfig['model'];

  return {
    provider: apiKey ? 'openai' : 'mock',
    model,
    dimensions: getModelDimensions(model),
    apiKey,
  };
};

/**
 * Create OpenAI embedding model instance
 */
const createEmbeddingModel = (config: EmbeddingConfig): EmbeddingModel<string> => {
  const provider = createOpenAI({
    apiKey: config.apiKey || process.env.OPENAI_API_KEY,
  });

  return provider.embedding(config.model);
};

/**
 * Generate single embedding (OpenAI)
 */
const generateOpenAIEmbedding = async (
  model: EmbeddingModel<string>,
  text: string,
  dimensions: number
): Promise<number[]> => {
  try {
    const { embedding } = await embed({ model, value: text });
    return embedding;
  } catch (error) {
    log('OpenAI embedding failed, falling back to mock:', error);
    return generateMockEmbedding(text, dimensions);
  }
};

/**
 * Generate multiple embeddings (OpenAI)
 */
const generateOpenAIEmbeddings = async (
  model: EmbeddingModel<string>,
  texts: string[],
  dimensions: number
): Promise<number[][]> => {
  try {
    const { embeddings } = await embedMany({ model, values: texts });
    return embeddings;
  } catch (error) {
    log('OpenAI embeddings failed, falling back to mock:', error);
    return texts.map((text) => generateMockEmbedding(text, dimensions));
  }
};

/**
 * Create OpenAI Embedding Provider (pure function)
 */
export const createOpenAIProvider = (config: EmbeddingConfig): EmbeddingProvider => {
  const model = createEmbeddingModel(config);

  return {
    name: 'openai',
    model: config.model,
    dimensions: config.dimensions,
    generateEmbedding: (text: string) =>
      generateOpenAIEmbedding(model, text, config.dimensions),
    generateEmbeddings: (texts: string[]) =>
      generateOpenAIEmbeddings(model, texts, config.dimensions),
  };
};

/**
 * Create Mock Embedding Provider (pure function)
 */
export const createMockProvider = (dimensions = 1536): EmbeddingProvider => ({
  name: 'mock',
  model: 'mock',
  dimensions,
  generateEmbedding: (text: string) =>
    Promise.resolve(generateMockEmbedding(text, dimensions)),
  generateEmbeddings: (texts: string[]) =>
    Promise.resolve(texts.map((text) => generateMockEmbedding(text, dimensions))),
});

/**
 * Create Embedding Provider from config (pure function)
 */
export const createEmbeddingProvider = (config: EmbeddingConfig): EmbeddingProvider => {
  switch (config.provider) {
    case 'openai':
      log(`Creating OpenAI provider: ${config.model} (${config.dimensions} dims)`);
      return createOpenAIProvider(config);

    case 'mock':
      log('Creating Mock provider');
      return createMockProvider(config.dimensions);

    default:
      log('Unknown provider, using mock');
      return createMockProvider(config.dimensions);
  }
};

/**
 * Get default embedding provider (pure function with I/O)
 */
export const getDefaultEmbeddingProvider = async (): Promise<EmbeddingProvider> => {
  const config = createDefaultConfig();
  return createEmbeddingProvider(config);
};

/**
 * Chunk text into smaller pieces
 * Pure function - no side effects
 */
export const chunkText = (
  text: string,
  options: {
    readonly maxChunkSize?: number;
    readonly overlap?: number;
  } = {}
): readonly string[] => {
  const maxChunkSize = options.maxChunkSize ?? 1000;
  const overlap = options.overlap ?? 100;

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
};

/**
 * Compose embedding providers (utility)
 */
export const composeProviders = (
  primary: EmbeddingProvider,
  fallback: EmbeddingProvider
): EmbeddingProvider => ({
  name: `${primary.name}+${fallback.name}`,
  model: primary.model,
  dimensions: primary.dimensions,
  generateEmbedding: async (text: string) => {
    try {
      return await primary.generateEmbedding(text);
    } catch {
      return await fallback.generateEmbedding(text);
    }
  },
  generateEmbeddings: async (texts: string[]) => {
    try {
      return await primary.generateEmbeddings(texts);
    } catch {
      return await fallback.generateEmbeddings(texts);
    }
  },
});
