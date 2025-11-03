/**
 * Query Validation Utilities
 * Shared validation and normalization for query parameters
 */

/**
 * Normalize query string by trimming whitespace
 * Pure - string transformation
 *
 * @param query - The query string to normalize
 * @returns Trimmed query string
 *
 * @example
 * normalizeQuery('  hello  ') // 'hello'
 * normalizeQuery('test') // 'test'
 * normalizeQuery('') // ''
 */
export function normalizeQuery(query: string): string {
  return query.trim();
}
