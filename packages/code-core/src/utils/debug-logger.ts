/**
 * Debug Logger
 * Conditional logging based on DEBUG environment variable
 *
 * Usage:
 *   DEBUG=* bun ./packages/code/src/index.ts              // All debug logs
 *   DEBUG=subscription,stream bun ...                      // Specific namespaces
 *   DEBUG=subscription:* bun ...                           // Namespace with wildcard
 *   (no DEBUG) bun ...                                     // No debug logs
 *
 * Examples:
 *   debugLog('subscription', 'Received event:', event.type);
 *   debugLog('stream', 'Processing delta:', text);
 */

const DEBUG_ENV = process.env.DEBUG || '';
const enabledNamespaces = new Set(
  DEBUG_ENV.split(',').map(ns => ns.trim()).filter(Boolean)
);

// Check if namespace is enabled
function isEnabled(namespace: string): boolean {
  if (DEBUG_ENV === '*') return true;
  if (enabledNamespaces.has(namespace)) return true;

  // Check wildcard patterns (e.g., "subscription:*")
  for (const pattern of enabledNamespaces) {
    if (pattern.endsWith(':*') && namespace.startsWith(pattern.slice(0, -1))) {
      return true;
    }
  }

  return false;
}

/**
 * Debug logger with namespace filtering
 */
export function debugLog(namespace: string, ...args: any[]) {
  if (isEnabled(namespace)) {
    console.error(`[${namespace}]`, ...args);
  }
}

/**
 * Create a logger for a specific namespace
 *
 * Usage:
 *   const log = createLogger('subscription');
 *   log('Received event:', event.type);
 */
export function createLogger(namespace: string) {
  return (...args: any[]) => debugLog(namespace, ...args);
}
