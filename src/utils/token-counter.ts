/**
 * Token Counter Utility
 * Fast token counting for UI display
 *
 * Supports:
 * - Fast estimation (for UI)
 * - Precise counting with StarCoder2 (when needed)
 */

import { AdvancedCodeTokenizer } from './advanced-tokenizer.js';

// Singleton instance for StarCoder2 tokenizer (lazy-loaded)
let starCoderTokenizer: AdvancedCodeTokenizer | null = null;
let tokenizerInitializing = false;

/**
 * Fast token estimation (good for UI)
 * Based on OpenAI's rule of thumb: ~4 chars per token for English
 * Code is typically ~3-4 chars per token
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Simple heuristic:
  // - Count words (split by whitespace)
  // - Add punctuation and symbols
  // - Average ~0.75 tokens per word for code/English mix

  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;

  // Use character-based estimation as baseline
  // Code is denser: ~3.5 chars per token
  const charBasedEstimate = Math.ceil(chars / 3.5);

  // Word-based estimate (more accurate for natural text)
  // Avg 1.3 tokens per word (accounts for punctuation)
  const wordBasedEstimate = Math.ceil(words * 1.3);

  // Return the average of both methods
  return Math.round((charBasedEstimate + wordBasedEstimate) / 2);
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
 * Get precise token count using StarCoder2
 * This is async and may take longer - use for final/accurate counts
 */
export async function countTokensPrecise(text: string): Promise<number> {
  if (!text) return 0;

  try {
    // Initialize tokenizer if needed (lazy)
    if (!starCoderTokenizer && !tokenizerInitializing) {
      tokenizerInitializing = true;
      starCoderTokenizer = new AdvancedCodeTokenizer();
      await starCoderTokenizer.initialize();
      tokenizerInitializing = false;
    }

    // Wait for initialization if in progress
    while (tokenizerInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!starCoderTokenizer) {
      // Fallback to estimation if tokenizer failed
      return estimateTokens(text);
    }

    const result = await starCoderTokenizer.tokenize(text);
    return result.metadata.totalTokens;
  } catch (error) {
    console.warn('Precise token counting failed, falling back to estimation:', error);
    return estimateTokens(text);
  }
}

/**
 * Count tokens with display formatting
 * Fast version using estimation
 */
export function countAndFormat(text: string): string {
  const count = estimateTokens(text);
  return `${formatTokenCount(count)} Tokens`;
}

/**
 * Count tokens with display formatting (precise)
 * Async version using StarCoder2
 */
export async function countAndFormatPrecise(text: string): Promise<string> {
  const count = await countTokensPrecise(text);
  return `${formatTokenCount(count)} Tokens`;
}

/**
 * Batch count tokens for multiple texts
 * Returns array of token counts
 */
export function estimateTokensBatch(texts: string[]): number[] {
  return texts.map(estimateTokens);
}

/**
 * Batch count tokens (precise) for multiple texts
 */
export async function countTokensBatchPrecise(texts: string[]): Promise<number[]> {
  return Promise.all(texts.map(countTokensPrecise));
}
