/**
 * Embedding generation utilities
 * 用 Vercel AI SDK - 第一個支持 OpenAI
 *
 * Design:
 * - MCP Server (headless, no interaction)
 * - Config from environment variables
 * - Extensible for future providers
 */

import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { generateMockEmbedding } from '../storage/vector-storage.js';
import { createLogger } from '../../utils/debug-logger.js';

const log = createLogger('search:embeddings');

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
 * OpenAI Embedding Provider (用 AI SDK)
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  model: string;
  dimensions: number;
  private apiKey?: string;

  constructor(
    options: {
      model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
      apiKey?: string;
    } = {}
  ) {
    this.model = options.model || 'text-embedding-3-small';
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;

    // Set dimensions based on model
    switch (this.model) {
      case 'text-embedding-3-large':
        this.dimensions = 3072;
        break;
      case 'text-embedding-3-small':
      case 'text-embedding-ada-002':
      default:
        this.dimensions = 1536;
        break;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // No API key → mock
    if (!this.apiKey) {
      log('No OPENAI_API_KEY, using mock embedding');
      return generateMockEmbedding(text, this.dimensions);
    }

    try {
      const { embedding } = await embed({
        model: openai.embedding(this.model, {
          apiKey: this.apiKey,
        }),
        value: text,
      });

      return embedding;
    } catch (error) {
      log(`OpenAI embedding failed:`, error);
      log('Falling back to mock embedding');
      return generateMockEmbedding(text, this.dimensions);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // No API key → mock
    if (!this.apiKey) {
      log('No OPENAI_API_KEY, using mock embeddings');
      return texts.map((text) => generateMockEmbedding(text, this.dimensions));
    }

    try {
      const { embeddings } = await embedMany({
        model: openai.embedding(this.model, {
          apiKey: this.apiKey,
        }),
        values: texts,
      });

      return embeddings;
    } catch (error) {
      log(`OpenAI embeddings failed:`, error);
      log('Falling back to mock embeddings');
      return texts.map((text) => generateMockEmbedding(text, this.dimensions));
    }
  }
}

/**
 * Mock Embedding Provider (for testing)
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  name = 'mock';
  model = 'mock';
  dimensions: number;

  constructor(dimensions = 1536) {
    this.dimensions = dimensions;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return generateMockEmbedding(text, this.dimensions);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map((text) => generateMockEmbedding(text, this.dimensions));
  }
}

/**
 * Get default embedding provider
 * Read from environment variables (MCP Server headless mode)
 */
export async function getDefaultEmbeddingProvider(): Promise<EmbeddingProvider> {
  // Check OPENAI_API_KEY
  if (process.env.OPENAI_API_KEY) {
    const model = (process.env.EMBEDDING_MODEL ||
      'text-embedding-3-small') as 'text-embedding-3-small';

    log(`Using OpenAI embedding provider: ${model}`);
    return new OpenAIEmbeddingProvider({
      model,
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // No API key → mock
  log('No embedding provider configured, using mock');
  return new MockEmbeddingProvider();
}

/**
 * Chunk text into smaller pieces for embedding
 * (Currently not used - we index whole files)
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
