/**
 * Debug Logger
 * Uses industry-standard 'debug' package
 *
 * Usage:
 *   DEBUG=* bun ./packages/code/src/index.ts              // All debug logs
 *   DEBUG=sylphx:* bun ...                                 // All sylphx namespaces
 *   DEBUG=sylphx:subscription:* bun ...                    // Subscription namespace
 *   DEBUG=sylphx:subscription:session bun ...              // Specific logger
 *   (no DEBUG) bun ...                                     // No debug logs
 *
 * Examples:
 *   import { createLogger } from '@sylphx/code-core';
 *
 *   const log = createLogger('subscription:session');
 *   log('Session created:', sessionId);
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
 * const log = createLogger('subscription:session');
 * log('Session created:', sessionId);
 *
 * // Enable with:
 * // DEBUG=sylphx:subscription:session bun ./packages/code/src/index.ts
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
