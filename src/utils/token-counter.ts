/**
 * Token Counter Utility
 * BPE-based token counting using Hugging Face AutoTokenizer
 *
 * Primary method: BPE tokenizer (auto-selected by Hugging Face)
 * Fallback: Fast estimation when tokenizer unavailable
 */

import { AutoTokenizer } from '@huggingface/transformers';

// Singleton instance for BPE tokenizer (lazy-loaded)
let bpeTokenizer: any | null = null;
let tokenizerInitializing = false;
let initializationFailed = false;

/**
 * Tokenizer model options
 */
export const TOKENIZER_MODELS = {
  GPT4: 'Xenova/gpt-4',           // GPT-4 tokenizer (most accurate for general use)
  STARCODER: 'bigcode/starcoder2-3b', // Code-optimized (best for code)
  GPT2: 'gpt2',                    // Fast, general purpose
  CLAUDE: 'Xenova/claude-tokenizer', // Claude tokenizer (if available)
} as const;

/**
 * Default tokenizer model
 * Can be overridden via environment variable: TOKENIZER_MODEL
 */
const DEFAULT_TOKENIZER_MODEL =
  (process.env.TOKENIZER_MODEL as keyof typeof TOKENIZER_MODELS)
  || TOKENIZER_MODELS.GPT4;

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
 * Initialize BPE tokenizer (lazy, singleton)
 * Uses Hugging Face AutoTokenizer to automatically select best tokenizer
 */
async function ensureTokenizer(): Promise<any | null> {
  // Already initialized
  if (bpeTokenizer) return bpeTokenizer;

  // Previous initialization failed
  if (initializationFailed) return null;

  // Wait if initialization in progress
  while (tokenizerInitializing) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Check again after waiting
  if (bpeTokenizer) return bpeTokenizer;
  if (initializationFailed) return null;

  // Initialize with Hugging Face AutoTokenizer
  try {
    tokenizerInitializing = true;
    console.log(`[TokenCounter] Loading tokenizer: ${DEFAULT_TOKENIZER_MODEL}`);

    // Let Hugging Face auto-select and load the best tokenizer
    bpeTokenizer = await AutoTokenizer.from_pretrained(DEFAULT_TOKENIZER_MODEL, {
      // Cache models locally for faster subsequent loads
      cache_dir: './models/.cache',
      // Use local files if available, otherwise download
      local_files_only: false,
    });

    console.log(`[TokenCounter] Tokenizer loaded successfully`);
    tokenizerInitializing = false;
    return bpeTokenizer;
  } catch (error) {
    console.warn('[TokenCounter] BPE tokenizer initialization failed, using fallback estimation:', error);
    initializationFailed = true;
    tokenizerInitializing = false;
    return null;
  }
}

/**
 * Count tokens using BPE tokenizer (Hugging Face AutoTokenizer)
 * Falls back to estimation if tokenizer unavailable
 *
 * This is the primary token counting method.
 */
export async function countTokens(text: string): Promise<number> {
  if (!text) return 0;

  const tokenizer = await ensureTokenizer();

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
 * Alias for countTokens (for clarity)
 * Uses BPE tokenizer
 */
export async function countTokensPrecise(text: string): Promise<number> {
  return countTokens(text);
}

/**
 * Count tokens with display formatting
 * Uses BPE tokenizer (async)
 */
export async function countAndFormat(text: string): Promise<string> {
  const count = await countTokens(text);
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
export async function countTokensBatch(texts: string[]): Promise<number[]> {
  return Promise.all(texts.map(countTokens));
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
export async function getTokenizerInfo(): Promise<{
  model: string;
  loaded: boolean;
  failed: boolean;
} | null> {
  const tokenizer = await ensureTokenizer();

  return {
    model: DEFAULT_TOKENIZER_MODEL,
    loaded: tokenizer !== null,
    failed: initializationFailed,
  };
}

/**
 * Get available tokenizer models
 */
export function getAvailableTokenizers(): typeof TOKENIZER_MODELS {
  return TOKENIZER_MODELS;
}
