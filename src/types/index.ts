// ============================================================================
// SYLPHX FLOW - MAIN TYPE EXPORTS
// ============================================================================

// Re-export original types for backward compatibility
export * from './types';

// Re-export new specialized type interfaces
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
// UTILITY TYPE EXPORTS
// ============================================================================

/**
 * Generic safe type replacement for 'any'
 * Use this type when you need flexibility but want to maintain some type safety
 */
export type SafeAny = unknown;

/**
 * Generic dictionary type for dynamic objects
 */
export type Dictionary<T = unknown> = Record<string, T>;

/**
 * Generic partial type for optional properties
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Generic required type for making properties required
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Deep partial type for nested objects
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends readonly (infer U)[]
      ? readonly DeepPartial<U>[]
      : T[P] extends object
        ? DeepPartial<T[P]>
        : T[P];
};

/**
 * Deep required type for nested objects
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends (infer U)[]
    ? DeepRequired<U>[]
    : T[P] extends readonly (infer U)[]
      ? readonly DeepRequired<U>[]
      : T[P] extends object
        ? DeepRequired<T[P]>
        : T[P];
};

/**
 * Type guard utility functions
 */
export const TypeGuards = {
  /** Check if value is a string */
  isString: (value: unknown): value is string => typeof value === 'string',

  /** Check if value is a number */
  isNumber: (value: unknown): value is number => typeof value === 'number' && !Number.isNaN(value),

  /** Check if value is a boolean */
  isBoolean: (value: unknown): value is boolean => typeof value === 'boolean',

  /** Check if value is an object */
  isObject: (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value),

  /** Check if value is an array */
  isArray: <T = unknown>(value: unknown): value is T[] => Array.isArray(value),

  /** Check if value is a function */
  isFunction: (value: unknown): value is Function => typeof value === 'function',

  /** Check if value is null or undefined */
  isNullOrUndefined: (value: unknown): value is null | undefined =>
    value === null || value === undefined,

  /** Check if value is a Date */
  isDate: (value: unknown): value is Date =>
    value instanceof Date || (typeof value === 'object' && value !== null && 'getTime' in value),

  /** Check if value is a valid URL */
  isURL: (value: unknown): value is string => {
    if (typeof value !== 'string') {
      return false;
    }
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /** Check if value is a valid email */
  isEmail: (value: unknown): value is string => {
    if (typeof value !== 'string') {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  /** Check if value is a valid UUID */
  isUUID: (value: unknown): value is string => {
    if (typeof value !== 'string') {
      return false;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },
};

// ============================================================================
// RUNTIME VALIDATION HELPERS
// ============================================================================

/**
 * Safe type casting with runtime validation
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

/**
 * Validate object structure against required keys
 */
export function validateObjectStructure<T extends Record<string, unknown>>(
  obj: unknown,
  requiredKeys: (keyof T)[]
): obj is T {
  if (!TypeGuards.isObject(obj)) {
    return false;
  }
  return requiredKeys.every((key) => key in obj);
}

/**
 * Create a type-safe partial object
 */
export function createPartialObject<T extends Record<string, unknown>>(
  data: Partial<T>
): Partial<T> {
  return data;
}

/**
 * Merge two type-safe objects
 */
export function mergeObjects<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  return { ...target, ...source };
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Helper to migrate from 'any' to properly typed interfaces
 */
export class MigrationHelper {
  /**
   * Convert legacy any data to new type with validation
   */
  static migrateFromAny<T>(
    data: unknown,
    validator: (value: unknown) => value is T,
    context = 'migration'
  ): Result<T> {
    try {
      if (validator(data)) {
        return { success: true, data };
      }
      return {
        success: false,
        error: new Error(`Migration failed in ${context}: Invalid data structure`),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Batch migrate array of any data
   */
  static migrateArrayFromAny<T>(
    dataArray: unknown[],
    validator: (value: unknown) => value is T,
    context = 'array-migration'
  ): Result<{ successes: T[]; failures: Array<{ index: number; error: Error }> }> {
    const successes: T[] = [];
    const failures: Array<{ index: number; error: Error }> = [];

    dataArray.forEach((item, index) => {
      const result = MigrationHelper.migrateFromAny(item, validator, `${context}[${index}]`);
      if (result.success) {
        successes.push(result.data);
      } else {
        failures.push({ index, error: result.error });
      }
    });

    return { success: true, data: { successes, failures } };
  }
}

/**
 * Generic result type for operations
 */
export interface Result<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Create a successful result
 */
export function createSuccessResult<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function createErrorResult(error: Error): Result {
  return { success: false, error };
}
