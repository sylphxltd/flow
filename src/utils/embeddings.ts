/**
 * Embedding generation utilities
 * Supports OpenAI embeddings (with fallback to mock embeddings)
 */

import { generateMockEmbedding } from './vector-storage.js';

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
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = options.model || 'text-embedding-3-small';
    this.baseURL = options.baseURL || 'https://api.openai.com/v1';

    // Set dimensions based on model
    if (this.model === 'text-embedding-3-large') {
      this.dimensions = 3072;
    } else if (this.model === 'text-embedding-ada-002') {
      this.dimensions = 1536;
    }

    if (!this.apiKey) {
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
export function getDefaultEmbeddingProvider(): EmbeddingProvider {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    console.error('[INFO] Using OpenAI embeddings (text-embedding-3-small)');
    return new OpenAIEmbeddingProvider({ apiKey });
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
    if (start >= text.length) break;
  }

  return chunks;
}
