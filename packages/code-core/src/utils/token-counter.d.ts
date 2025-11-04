/**
 * Token Counter Utility
 * BPE-based token counting using Hugging Face AutoTokenizer
 *
 * Primary method: BPE tokenizer (auto-selected by Hugging Face)
 * Fallback: Fast estimation when tokenizer unavailable
 */
/**
 * Count tokens using BPE tokenizer (Hugging Face AutoTokenizer)
 * Falls back to estimation if tokenizer unavailable
 *
 * @param text Text to count tokens for
 * @param modelName Optional model name to use specific tokenizer
 * @returns Token count
 */
export declare function countTokens(text: string, modelName?: string): Promise<number>;
/**
 * Synchronous token estimation (for cases where async is not possible)
 * Uses fallback estimation only
 */
export declare function estimateTokens(text: string): number;
/**
 * Format token count for display
 * Examples: 150 -> "150", 1500 -> "1.5K", 1500000 -> "1.5M"
 */
export declare function formatTokenCount(count: number): string;
/**
 * Count tokens for specific model
 * Uses the correct tokenizer for that model
 */
export declare function countTokensForModel(text: string, modelName: string): Promise<number>;
/**
 * Count tokens with display formatting
 * Uses BPE tokenizer (async)
 */
export declare function countAndFormat(text: string, modelName?: string): Promise<string>;
/**
 * Count tokens with display formatting (sync, estimation only)
 * Use this only when async is not possible
 */
export declare function countAndFormatSync(text: string): string;
/**
 * Batch count tokens for multiple texts
 * Uses BPE tokenizer
 */
export declare function countTokensBatch(texts: string[], modelName?: string): Promise<number[]>;
/**
 * Batch count tokens (sync estimation fallback)
 */
export declare function estimateTokensBatch(texts: string[]): number[];
/**
 * Get tokenizer info (for debugging)
 */
export declare function getTokenizerInfo(modelName?: string): Promise<{
    modelName: string;
    tokenizerName: string;
    loaded: boolean;
    failed: boolean;
} | null>;
/**
 * Get supported models
 */
export declare function getSupportedModels(): string[];
//# sourceMappingURL=token-counter.d.ts.map