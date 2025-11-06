/**
 * Debug Logger
 * Uses industry-standard 'debug' package
 *
 * Usage:
 *   DEBUG=* bun ./packages/flow/src/index.ts              // All debug logs
 *   DEBUG=sylphx:* bun ...                                 // All sylphx namespaces
 *   DEBUG=sylphx:search:* bun ...                          // Search namespace
 *   (no DEBUG) bun ...                                     // No debug logs
 *
 * Examples:
 *   import { createLogger } from '../utils/debug-logger.js';
 *
 *   const log = createLogger('search:indexing');
 *   log('Indexing started:', filePath);
 *
 * Features from 'debug' package:
 *   - Color-coded namespaces
 *   - Timestamp support (DEBUG_COLORS=no for no color)
 *   - Wildcard matching (DEBUG=sylphx:*)
 *   - Conditional logging (no performance impact when disabled)
 *   - Industry standard (used by Express, Socket.io, etc.)
 */

import debug from 'debug';

/**
 * Create a logger for a specific namespace
 * Namespace will be prefixed with 'sylphx:'
 *
 * @example
 * const log = createLogger('search:indexing');
 * log('Indexing started:', filePath);
 *
 * // Enable with:
 * // DEBUG=sylphx:search:indexing bun ./packages/flow/src/index.ts
 */
export function createLogger(namespace: string) {
  return debug(`sylphx:${namespace}`);
}

/**
 * For backwards compatibility
 * @deprecated Use createLogger instead
 */
export function debugLog(namespace: string, ...args: any[]) {
  const log = debug(`sylphx:${namespace}`);
  log(...args);
}
