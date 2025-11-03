/**
 * Token Counter Utility
 * BPE-based token counting using Hugging Face AutoTokenizer
 *
 * Primary method: BPE tokenizer (auto-selected by Hugging Face)
 * Fallback: Fast estimation when tokenizer unavailable
 */

import { AutoTokenizer } from '@huggingface/transformers';

// Cache for multiple tokenizers (keyed by tokenizer name)
// Limited to 3 tokenizers to prevent memory leak (each ~100-500MB)
const tokenizerCache = new Map<string, any>();
const tokenizerInitializing = new Set<string>();
const tokenizerFailed = new Set<string>();
const MAX_CACHED_TOKENIZERS = 3;

/**
 * Map provider model names to tokenizer names
 * AutoTokenizer will automatically find the right tokenizer for each model
 */
const MODEL_TO_TOKENIZER: Record<string, string> = {
  // OpenAI models
  'gpt-4': 'Xenova/gpt-4',
  'gpt-4-turbo': 'Xenova/gpt-4',
  'gpt-4o': 'Xenova/gpt-4',
  'gpt-3.5-turbo': 'Xenova/gpt-3.5-turbo',
  'gpt-3.5': 'Xenova/gpt-3.5-turbo',

  // Anthropic Claude models
  'claude-3-opus': 'Xenova/claude-tokenizer',
  'claude-3-sonnet': 'Xenova/claude-tokenizer',
  'claude-3-haiku': 'Xenova/claude-tokenizer',
  'claude-3.5-sonnet': 'Xenova/claude-tokenizer',
  'claude-3.5-haiku': 'Xenova/claude-tokenizer',

  // Code models
  'starcoder': 'bigcode/starcoder',
  'starcoder2': 'bigcode/starcoder2-3b',
  'codellama': 'codellama/CodeLlama-7b-hf',

  // Google models
  'gemini': 'Xenova/gpt-4', // Fallback to GPT-4 (no official Gemini tokenizer)

  // Fallback
  'default': 'Xenova/gpt-4',
};

/**
 * Get tokenizer name for a model
 * AutoTokenizer will find the right tokenizer automatically
 */
function getTokenizerForModel(modelName?: string): string {
  if (!modelName) return MODEL_TO_TOKENIZER['default'];

  // Direct match
  if (MODEL_TO_TOKENIZER[modelName]) {
    return MODEL_TO_TOKENIZER[modelName];
  }

  // Fuzzy match (e.g., "gpt-4-turbo-preview" → "gpt-4")
  const modelLower = modelName.toLowerCase();
  for (const [key, tokenizer] of Object.entries(MODEL_TO_TOKENIZER)) {
    if (modelLower.includes(key)) {
      return tokenizer;
    }
  }

  // Default fallback
  return MODEL_TO_TOKENIZER['default'];
}

/**
 * Fast fallback estimation (only when BPE tokenizer unavailable)
 * Based on ~3.5 chars per token for code
 */
function estimateFallback(text: string): number {
  if (!text) return 0;

  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;

  const charBasedEstimate = Math.ceil(chars / 3.5);
  const wordBasedEstimate = Math.ceil(words * 1.3);

  return Math.round((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Initialize BPE tokenizer (lazy, cached per tokenizer name)
 * Uses Hugging Face AutoTokenizer to automatically select best tokenizer
 */
async function ensureTokenizer(modelName?: string): Promise<any | null> {
  // Get tokenizer name for this model
  const tokenizerName = getTokenizerForModel(modelName);

  // Check if already cached
  if (tokenizerCache.has(tokenizerName)) {
    return tokenizerCache.get(tokenizerName);
  }

  // Check if previous initialization failed
  if (tokenizerFailed.has(tokenizerName)) {
    return null;
  }

  // Wait if initialization in progress for this tokenizer
  while (tokenizerInitializing.has(tokenizerName)) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Check again after waiting
  if (tokenizerCache.has(tokenizerName)) {
    return tokenizerCache.get(tokenizerName);
  }
  if (tokenizerFailed.has(tokenizerName)) {
    return null;
  }

  // Initialize with Hugging Face AutoTokenizer
  try {
    tokenizerInitializing.add(tokenizerName);

    // Let Hugging Face auto-select and load the best tokenizer
    const tokenizer = await AutoTokenizer.from_pretrained(tokenizerName, {
      // Cache models locally for faster subsequent loads
      cache_dir: './models/.cache',
      // Use local files if available, otherwise download
      local_files_only: false,
    });

    // Limit cache size - evict oldest tokenizer if limit reached
    if (tokenizerCache.size >= MAX_CACHED_TOKENIZERS) {
      const oldestKey = tokenizerCache.keys().next().value;
      if (oldestKey) {
        tokenizerCache.delete(oldestKey);
      }
    }

    tokenizerCache.set(tokenizerName, tokenizer);
    tokenizerInitializing.delete(tokenizerName);
    return tokenizer;
  } catch (error) {
    console.warn('[TokenCounter] BPE tokenizer initialization failed, using fallback estimation:', error);
    tokenizerFailed.add(tokenizerName);
    tokenizerInitializing.delete(tokenizerName);
    return null;
  }
}

/**
 * Count tokens using BPE tokenizer (Hugging Face AutoTokenizer)
 * Falls back to estimation if tokenizer unavailable
 *
 * @param text Text to count tokens for
 * @param modelName Optional model name to use specific tokenizer
 * @returns Token count
 */
export async function countTokens(text: string, modelName?: string): Promise<number> {
  if (!text) return 0;

  const tokenizer = await ensureTokenizer(modelName);

  if (!tokenizer) {
    // Tokenizer unavailable, use fallback
    return estimateFallback(text);
  }

  try {
    // Use Hugging Face tokenizer API
    const encoded = await tokenizer(text);

    // Get token count from encoded result
    if (encoded.input_ids && encoded.input_ids.size) {
      return encoded.input_ids.size;
    }

    // Fallback: count array length
    if (Array.isArray(encoded.input_ids)) {
      return encoded.input_ids.length;
    }

    // Fallback: if it's a tensor, get its length
    if (encoded.input_ids.data) {
      return encoded.input_ids.data.length;
    }

    // Last resort fallback
    return estimateFallback(text);
  } catch (error) {
    console.warn('[TokenCounter] Token counting failed, using fallback:', error);
    return estimateFallback(text);
  }
}

/**
 * Synchronous token estimation (for cases where async is not possible)
 * Uses fallback estimation only
 */
export function estimateTokens(text: string): number {
  return estimateFallback(text);
}

/**
 * Format token count for display
 * Examples: 150 -> "150", 1500 -> "1.5K", 1500000 -> "1.5M"
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }

  if (count < 1000000) {
    const k = count / 1000;
    return `${k.toFixed(1)}K`;
  }

  const m = count / 1000000;
  return `${m.toFixed(1)}M`;
}

/**
 * Count tokens for specific model
 * Uses the correct tokenizer for that model
 */
export async function countTokensForModel(text: string, modelName: string): Promise<number> {
  return countTokens(text, modelName);
}

/**
 * Count tokens with display formatting
 * Uses BPE tokenizer (async)
 */
export async function countAndFormat(text: string, modelName?: string): Promise<string> {
  const count = await countTokens(text, modelName);
  return `${formatTokenCount(count)} Tokens`;
}

/**
 * Count tokens with display formatting (sync, estimation only)
 * Use this only when async is not possible
 */
export function countAndFormatSync(text: string): string {
  const count = estimateTokens(text);
  return `${formatTokenCount(count)} Tokens`;
}

/**
 * Batch count tokens for multiple texts
 * Uses BPE tokenizer
 */
export async function countTokensBatch(texts: string[], modelName?: string): Promise<number[]> {
  return Promise.all(texts.map(text => countTokens(text, modelName)));
}

/**
 * Batch count tokens (sync estimation fallback)
 */
export function estimateTokensBatch(texts: string[]): number[] {
  return texts.map(estimateTokens);
}

/**
 * Get tokenizer info (for debugging)
 */
export async function getTokenizerInfo(modelName?: string): Promise<{
  modelName: string;
  tokenizerName: string;
  loaded: boolean;
  failed: boolean;
} | null> {
  const tokenizerName = getTokenizerForModel(modelName);
  const tokenizer = await ensureTokenizer(modelName);

  return {
    modelName: modelName || 'default',
    tokenizerName,
    loaded: tokenizer !== null,
    failed: tokenizerFailed.has(tokenizerName),
  };
}

/**
 * Get supported models
 */
export function getSupportedModels(): string[] {
  return Object.keys(MODEL_TO_TOKENIZER).filter(k => k !== 'default');
}
