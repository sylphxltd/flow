/**
 * Embedding generation utilities
 * Supports OpenAI embeddings (with fallback to mock embeddings)
 */

import { envSecurity, securitySchemas } from './security.js';
import { generateMockEmbedding } from './vector-storage.js';
import { secretUtils } from './secret-utils.js';

export interface ModelInfo {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

export interface EmbeddingModelOption {
  id: string;
  description: string;
}

export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * OpenAI Embedding Provider
 * Requires OPENAI_API_KEY environment variable
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  dimensions = 1536; // text-embedding-3-small
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(
    options: {
      apiKey?: string;
      model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
      baseURL?: string;
    } = {}
  ) {
    // Validate and get API key with security checks
    this.apiKey = options.apiKey || envSecurity.getEnvVar('OPENAI_API_KEY') || '';
    this.model = options.model || 'text-embedding-3-small';

    // Validate base URL
    const providedBaseURL =
      options.baseURL || envSecurity.getEnvVar('OPENAI_BASE_URL', 'https://api.openai.com/v1');
    if (providedBaseURL) {
      try {
        this.baseURL = securitySchemas.url.parse(providedBaseURL);
      } catch (_error) {
        console.warn('[WARN] Invalid OPENAI_BASE_URL format, using default');
        this.baseURL = 'https://api.openai.com/v1';
      }
    } else {
      this.baseURL = 'https://api.openai.com/v1';
    }

    // Set dimensions based on model
    if (this.model === 'text-embedding-3-large') {
      this.dimensions = 3072;
    } else if (this.model === 'text-embedding-ada-002') {
      this.dimensions = 1536;
    }

    if (this.apiKey) {
      // Validate API key format
      try {
        securitySchemas.apiKey.parse(this.apiKey);
      } catch (_error) {
        console.warn(
          '[WARN] Invalid OPENAI_API_KEY format. Embeddings will use mock implementation.'
        );
        this.apiKey = '';
      }
    } else {
      console.warn('[WARN] OPENAI_API_KEY not set. Embeddings will use mock implementation.');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      console.warn('[WARN] Using mock embedding (no API key)');
      return generateMockEmbedding(text, this.dimensions);
    }

    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('[ERROR] Failed to generate OpenAI embedding:', error);
      console.warn('[WARN] Falling back to mock embedding');
      return generateMockEmbedding(text, this.dimensions);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      console.warn('[WARN] Using mock embeddings (no API key)');
      return texts.map((text) => generateMockEmbedding(text, this.dimensions));
    }

    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.data.map((item: { embedding: number[] }) => item.embedding);
    } catch (error) {
      console.error('[ERROR] Failed to generate OpenAI embeddings:', error);
      console.warn('[WARN] Falling back to mock embeddings');
      return texts.map((text) => generateMockEmbedding(text, this.dimensions));
    }
  }

  /**
   * List all available models from the OpenAI-compatible API
   */
  async listModels(): Promise<ModelInfo[]> {
    if (!this.apiKey) {
      throw new Error('API key required to list models');
    }

    try {
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.data.map((model: any) => ({
        id: model.id,
        object: model.object,
        created: model.created,
        owned_by: model.owned_by,
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list models: ${error.message}`);
      }
      throw new Error('Failed to list models: Unknown error');
    }
  }

  /**
   * Filter models to only include embedding models
   */
  async listEmbeddingModels(): Promise<ModelInfo[]> {
    const allModels = await this.listModels();
    return allModels.filter(
      (model) => model.id.includes('embedding') || model.id.includes('text-embedding')
    );
  }

  /**
   * Test if the API connection is working
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listModels();
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get available embedding models with their details
   */
  async getEmbeddingModelOptions(): Promise<EmbeddingModelOption[]> {
    const embeddingModels = await this.listEmbeddingModels();

    return embeddingModels.map((model) => ({
      id: model.id,
      description: this.getModelDescription(model.id),
    }));
  }

  private getModelDescription(modelId: string): string {
    const descriptions: Record<string, string> = {
      'text-embedding-3-small': 'Latest small embedding model (1536 dimensions)',
      'text-embedding-3-large': 'Latest large embedding model (3072 dimensions)',
      'text-embedding-ada-002': 'Legacy embedding model (1536 dimensions)',
    };

    return descriptions[modelId] || `Embedding model: ${modelId}`;
  }
}

/**
 * Mock Embedding Provider (for testing without API key)
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  name = 'mock';
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
 * Uses OpenAI if API key is available, otherwise mock
 */
export async function getDefaultEmbeddingProvider(): Promise<EmbeddingProvider> {
  // Try to load from secrets first
  let secrets: Record<string, string> = {};
  try {
    secrets = await secretUtils.loadSecrets(process.cwd()).catch(() => ({}));
  } catch (_error) {
    // Ignore if secretUtils is not available
  }

  const apiKey = secrets.OPENAI_API_KEY || envSecurity.getEnvVar('OPENAI_API_KEY');
  const baseURL =
    secrets.OPENAI_BASE_URL ||
    envSecurity.getEnvVar('OPENAI_BASE_URL', 'https://api.openai.com/v1');
  const model = secrets.EMBEDDING_MODEL || envSecurity.getEnvVar('EMBEDDING_MODEL');

  if (apiKey) {
    console.error(`[INFO] Using OpenAI embeddings (${model || 'text-embedding-3-small'})`);
    return new OpenAIEmbeddingProvider({
      apiKey,
      baseURL,
      model: model as any,
    });
  }

  console.error('[INFO] Using mock embeddings (no OPENAI_API_KEY)');
  return new MockEmbeddingProvider();
}

/**
 * Chunk text into smaller pieces for embedding
 * Useful for long documents
 */
export function chunkText(
  text: string,
  options: {
    maxChunkSize?: number; // Max characters per chunk
    overlap?: number; // Overlap between chunks
  } = {}
): string[] {
  const { maxChunkSize = 1000, overlap = 100 } = options;

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);

    // Move start position with overlap
    start = end - overlap;
    if (start >= text.length) {
      break;
    }
  }

  return chunks;
}
