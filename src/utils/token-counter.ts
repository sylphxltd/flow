/**
 * Token Counter Utility
 * BPE-based token counting using StarCoder2
 *
 * Primary method: BPE tokenizer (StarCoder2)
 * Fallback: Fast estimation when tokenizer unavailable
 */

import { AdvancedCodeTokenizer } from './advanced-tokenizer.js';

// Singleton instance for StarCoder2 BPE tokenizer (lazy-loaded)
let bpeTokenizer: AdvancedCodeTokenizer | null = null;
let tokenizerInitializing = false;
let initializationFailed = false;

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
 */
async function ensureTokenizer(): Promise<AdvancedCodeTokenizer | null> {
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

  // Initialize
  try {
    tokenizerInitializing = true;
    bpeTokenizer = new AdvancedCodeTokenizer();
    await bpeTokenizer.initialize();
    tokenizerInitializing = false;
    return bpeTokenizer;
  } catch (error) {
    console.warn('BPE tokenizer initialization failed, using fallback estimation:', error);
    initializationFailed = true;
    tokenizerInitializing = false;
    return null;
  }
}

/**
 * Count tokens using BPE tokenizer (StarCoder2)
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
    const result = await tokenizer.tokenize(text);
    return result.metadata.totalTokens;
  } catch (error) {
    console.warn('Token counting failed, using fallback:', error);
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
