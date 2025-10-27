// ============================================================================
// SYLPHX FLOW - MAIN TYPE EXPORTS
// ============================================================================

// Re-export core types
export * from './types';

// Re-export specialized type interfaces
export * from './target-config.types';
export * from './mcp-config.types';
export * from './database.types';

// API types - prefer organized version
export * from './api/index.js';

// Legacy API types (backward compatibility)
export * from './api.types';

// ============================================================================
// LEGACY TYPE ALIASES FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use EnhancedMCPServerConfigUnion instead
 */
export type MCPServerConfigUnion = import('./mcp-config.types').EnhancedMCPServerConfigUnion;

/**
 * @deprecated Use AgentMetadata instead
 */
export type AgentConfig = import('./target-config.types').AgentMetadata;

/**
 * @deprecated Use DatabaseHealthCheckResult instead
 */
export type HealthCheckResult = import('./database.types').DatabaseHealthCheckResult;

/**
 * @deprecated Use ApiResponse instead
 */
export type APIResponse<T = unknown> = import('./api.types').ApiResponse<T>;

/**
 * @deprecated Use EnhancedError instead
 */
export type SystemError = import('./api.types').EnhancedError;

// ============================================================================
// SIMPLE UTILITY TYPES
// ============================================================================

/**
 * Generic safe type replacement for 'any'
 * Just use TypeScript's built-in `unknown` type directly
 */
export type SafeAny = unknown;

/**
 * Generic dictionary type for dynamic objects
 * Use TypeScript's built-in `Record<string, T>` instead
 */
export type Dictionary<T = unknown> = Record<string, T>;

// ============================================================================
// RUNTIME VALIDATION HELPERS (simplified)
// ============================================================================

/**
 * Safe type casting with runtime validation
 * Consider using Zod or similar libraries for complex validation
 */
export function safeCast<T>(
  value: unknown,
  validator: (value: unknown) => value is T,
  errorMessage?: string
): T | never {
  if (validator(value)) {
    return value;
  }
  throw new Error(errorMessage || `Type validation failed for value: ${JSON.stringify(value)}`);
}

/**
 * Safe type casting with optional fallback
 */
export function safeCastOrDefault<T>(
  value: unknown,
  validator: (value: unknown) => value is T,
  defaultValue: T
): T {
  if (validator(value)) {
    return value;
  }
  return defaultValue;
}