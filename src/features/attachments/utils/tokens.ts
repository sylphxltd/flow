/**
 * Attachment Token Management - Pure functions for token counting
 * @module features/attachments/utils/tokens
 */

/**
 * Update token count for a file path
 * @pure No side effects
 *
 * @example
 * const newTokens = setTokenCount(existingTokens, "src/index.ts", 1500)
 */
export function setTokenCount(
  tokens: Map<string, number>,
  path: string,
  count: number
): Map<string, number> {
  const newTokens = new Map(tokens);
  newTokens.set(path, count);
  return newTokens;
}

/**
 * Get token count for a file path
 * @pure No side effects
 *
 * @example
 * getTokenCount(tokens, "src/index.ts") // 1500 or undefined
 */
export function getTokenCount(
  tokens: Map<string, number>,
  path: string
): number | undefined {
  return tokens.get(path);
}

/**
 * Remove token count for a file path
 * @pure No side effects
 */
export function removeTokenCount(
  tokens: Map<string, number>,
  path: string
): Map<string, number> {
  const newTokens = new Map(tokens);
  newTokens.delete(path);
  return newTokens;
}

/**
 * Calculate total tokens for all attachments
 * @pure No side effects
 *
 * @example
 * getTotalTokens(tokens) // Sum of all token counts
 */
export function getTotalTokens(tokens: Map<string, number>): number {
  let total = 0;
  for (const count of tokens.values()) {
    total += count;
  }
  return total;
}

/**
 * Clear all token counts
 * @pure No side effects
 */
export function clearTokenCounts(): Map<string, number> {
  return new Map();
}

/**
 * Batch set token counts
 * @pure No side effects
 *
 * @example
 * const counts = { "src/index.ts": 1500, "test.ts": 800 }
 * setBatchTokenCounts(existingTokens, counts)
 */
export function setBatchTokenCounts(
  tokens: Map<string, number>,
  counts: Record<string, number>
): Map<string, number> {
  const newTokens = new Map(tokens);
  for (const [path, count] of Object.entries(counts)) {
    newTokens.set(path, count);
  }
  return newTokens;
}
