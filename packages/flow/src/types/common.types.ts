/**
 * Common types shared across modules
 * Reusable types for cross-cutting concerns
 */

/**
 * Type for resolvable values
 * Can be a static value, sync function, or async function
 * Enables lazy evaluation and dynamic configuration
 */
export type Resolvable<T> = T | (() => Promise<T>) | (() => T);

/**
 * Common options shared across commands and operations
 */
export interface CommonOptions {
  target?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  mcp?: string[] | null | boolean;
  quiet?: boolean;
  agent?: string;
}

/**
 * Standardized result from setup methods
 * Used for consistent UI feedback across different setup operations
 */
export interface SetupResult {
  /** Number of items processed (servers, agents, files, etc.) */
  count: number;
  /** Optional detailed message */
  message?: string;
}
