/**
 * Type Utilities - 類型安全工具
 * Functional approach to type safety and validation
 */

import { z } from 'zod';

// Re-export unified Result type and utilities
export {
  Result,
  AsyncResult,
  ok,
  err,
  isOk,
  isErr,
  map,
  flatMap,
  mapError,
  getOrElse,
  getOrElseLazy,
  match,
  unwrap,
  tryCatch,
  tryCatchAsync,
  safeAsync,
  safeSync,
  all,
  allAsync,
  tap,
  tapError,
  type SuccessType,
  type ErrorType,
  type SafeResult,
} from './result.js';

/**
 * Common validation schemas
 */
export const Schemas = {
  /** Non-empty string validation */
  nonEmptyString: z.string().min(1, 'String cannot be empty'),

  /** Optional non-empty string */
  optionalNonEmptyString: z.string().min(1).optional(),

  /** Positive number validation */
  positiveNumber: z.number().positive('Number must be positive'),

  /** Optional positive number */
  optionalPositiveNumber: z.number().positive().optional(),

  /** Array validation */
  nonEmptyArray: z.array(z.any()).min(1, 'Array cannot be empty'),

  /** Email validation */
  email: z.string().email('Invalid email format'),

  /** URL validation */
  url: z.string().url('Invalid URL format'),

  /** Object validation */
  object: z.object({}).passthrough(),

  /** Storage configuration */
  storageConfig: z.object({
    type: z.enum(['memory', 'cache', 'vector', 'drizzle']),
    connectionString: z.string().optional(),
    defaultTTL: z.number().positive().optional(),
    maxCacheSize: z.number().positive().optional(),
    vectorDimensions: z.number().positive().optional(),
    storageDir: z.string().optional(),
  }),

  /** CLI options */
  cliOptions: z.object({
    target: z.string().optional(),
    verbose: z.boolean().default(false),
    dryRun: z.boolean().default(false),
    clear: z.boolean().default(false),
    mcp: z.union([z.array(z.string()), z.boolean(), z.null()]).default(null),
    quiet: z.boolean().default(false),
    agent: z.string().optional(),
  }),
} as const;

/**
 * Type guards
 */
export const TypeGuards = {
  /** Check if value is a non-empty string */
  isNonEmptyString: (value: unknown): value is string => {
    return typeof value === 'string' && value.length > 0;
  },

  /** Check if value is a positive number */
  isPositiveNumber: (value: unknown): value is number => {
    return typeof value === 'number' && value > 0;
  },

  /** Check if value is a non-empty array */
  isNonEmptyArray: (value: unknown): value is unknown[] => {
    return Array.isArray(value) && value.length > 0;
  },

  /** Check if value is an object */
  isObject: (value: unknown): value is Record<string, unknown> => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  },

  /** Check if value is a function */
  isFunction: (value: unknown): value is Function => {
    return typeof value === 'function';
  },

  /** Check if value is a Date */
  isDate: (value: unknown): value is Date => {
    return value instanceof Date && !isNaN(value.getTime());
  },

  /** Check if value is a Buffer */
  isBuffer: (value: unknown): value is Buffer => {
    return Buffer.isBuffer(value);
  },
} as const;

/**
 * Safe parsing utilities
 */
export const SafeParse = {
  /** Parse JSON safely */
  json: <T = unknown>(str: string): Result<T> => {
    return safeSync(() => JSON.parse(str) as T,
      error => new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
  },

  /** Parse number safely */
  number: (str: string, radix = 10): Result<number> => {
    return safeSync(() => {
      const num = parseInt(str, radix);
      if (isNaN(num)) throw new Error(`Invalid number: ${str}`);
      return num;
    }, error => new Error(`Failed to parse number: ${error instanceof Error ? error.message : String(error)}`));
  },

  /** Parse float safely */
  float: (str: string): Result<number> => {
    return safeSync(() => {
      const num = parseFloat(str);
      if (isNaN(num)) throw new Error(`Invalid float: ${str}`);
      return num;
    }, error => new Error(`Failed to parse float: ${error instanceof Error ? error.message : String(error)}`));
  },

  /** Parse boolean safely */
  boolean: (str: string): Result<boolean> => {
    const lower = str.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(lower)) return ok(true);
    if (['false', '0', 'no', 'off'].includes(lower)) return ok(false);
    return err(new Error(`Invalid boolean: ${str}`));
  },
} as const;

/**
 * String utilities
 */
export const StringUtils = {
  /** Truncate string to max length */
  truncate: (str: string, maxLength: number, suffix = '...'): string => {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
  },

  /** Convert to kebab-case */
  kebabCase: (str: string): string => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  },

  /** Convert to camelCase */
  camelCase: (str: string): string => {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^[A-Z]/, char => char.toLowerCase());
  },

  /** Convert to PascalCase */
  pascalCase: (str: string): string => {
    const camel = StringUtils.camelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  },

  /** Capitalize first letter */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /** Check if string is empty or whitespace */
  isEmpty: (str: string): boolean => {
    return str.trim().length === 0;
  },

  /** Generate random string */
  random: (length = 8): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /** Escape regex special characters */
  escapeRegex: (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },
} as const;

/**
 * Array utilities
 */
export const ArrayUtils = {
  /** Check if array is empty */
  isEmpty: <T>(arr: T[]): boolean => arr.length === 0,

  /** Remove duplicates */
  unique: <T>(arr: T[]): T[] => [...new Set(arr)],

  /** Group array by key */
  groupBy: <T, K extends string | number>(
    arr: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> => {
    return arr.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<K, T[]>);
  },

  /** Chunk array into smaller arrays */
  chunk: <T>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  /** Flatten nested arrays */
  flatten: <T>(arr: (T | T[])[]): T[] => {
    return arr.reduce<T[]>((flat, item) => {
      return flat.concat(Array.isArray(item) ? ArrayUtils.flatten(item) : item);
    }, []);
  },

  /** Pick random element */
  sample: <T>(arr: T[]): T | undefined => {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /** Shuffle array */
  shuffle: <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },
} as const;

/**
 * Object utilities
 */
export const ObjectUtils = {
  /** Check if object is empty */
  isEmpty: (obj: Record<string, unknown>): boolean => {
    return Object.keys(obj).length === 0;
  },

  /** Pick specific keys from object */
  pick: <T extends Record<string, unknown>, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Pick<T, K> => {
    return keys.reduce((picked, key) => {
      if (key in obj) {
        picked[key] = obj[key];
      }
      return picked;
    }, {} as Pick<T, K>);
  },

  /** Omit specific keys from object */
  omit: <T extends Record<string, unknown>, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result as Omit<T, K>;
  },

  /** Deep clone object */
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },

  /** Merge objects */
  merge: <T extends Record<string, unknown>>(
    ...objects: Partial<T>[]
  ): T => {
    return objects.reduce((merged, obj) => ({ ...merged, ...obj }), {} as T);
  },

  /** Get nested value from object */
  get: (obj: any, path: string, defaultValue?: unknown): unknown => {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }

    return current !== undefined ? current : defaultValue;
  },

  /** Set nested value in object */
  set: (obj: any, path: string, value: unknown): void => {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  },
} as const;

/**
 * Function utilities
 */
export const FunctionUtils = {
  /** Debounce function */
  debounce: <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },

  /** Throttle function */
  throttle: <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  },

  /** Memoize function */
  memoize: <T extends (...args: any[]) => any>(
    fn: T,
    keyFn?: (...args: Parameters<T>) => string
  ): T => {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  /** Retry function */
  retry: async <T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxAttempts) {
          throw lastError;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError!;
  },
} as const;