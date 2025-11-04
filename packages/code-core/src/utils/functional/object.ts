/**
 * Functional object utilities
 * Pure object transformation functions
 *
 * DESIGN RATIONALE:
 * - Pure functions for object operations
 * - Immutable transformations
 * - Type-safe operations
 * - No side effects
 */

/**
 * Get keys of object
 */
export const keys = <T extends object>(obj: T): Array<keyof T> => {
  return Object.keys(obj) as Array<keyof T>;
};

/**
 * Get values of object
 */
export const values = <T extends object>(obj: T): T[keyof T][] => {
  return Object.values(obj);
};

/**
 * Get entries of object
 */
export const entries = <T extends object>(obj: T): [keyof T, T[keyof T]][] => {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
};

/**
 * Create object from entries
 */
export const fromEntries = <K extends string | number | symbol, V>(
  entries: [K, V][]
): Record<K, V> => {
  return Object.fromEntries(entries) as Record<K, V>;
};

/**
 * Pick properties from object
 */
export const pick =
  <T extends object, K extends keyof T>(keys: K[]) =>
  (obj: T): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  };

/**
 * Omit properties from object
 */
export const omit =
  <T extends object, K extends keyof T>(keys: K[]) =>
  (obj: T): Omit<T, K> => {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result;
  };

/**
 * Map over object values
 */
export const mapValues =
  <T extends object, U>(fn: (value: T[keyof T], key: keyof T) => U) =>
  (obj: T): Record<keyof T, U> => {
    const result = {} as Record<keyof T, U>;
    for (const [key, value] of entries(obj)) {
      result[key] = fn(value, key);
    }
    return result;
  };

/**
 * Map over object keys
 */
export const mapKeys =
  <T extends object, K extends string | number | symbol>(
    fn: (key: keyof T, value: T[keyof T]) => K
  ) =>
  (obj: T): Record<K, T[keyof T]> => {
    const result = {} as Record<K, T[keyof T]>;
    for (const [key, value] of entries(obj)) {
      const newKey = fn(key, value);
      result[newKey] = value;
    }
    return result;
  };

/**
 * Filter object by predicate
 */
export const filterObj =
  <T extends object>(predicate: (value: T[keyof T], key: keyof T) => boolean) =>
  (obj: T): Partial<T> => {
    const result = {} as Partial<T>;
    for (const [key, value] of entries(obj)) {
      if (predicate(value, key)) {
        result[key] = value;
      }
    }
    return result;
  };

/**
 * Merge objects (shallow)
 */
export const merge = <T extends object, U extends object>(obj1: T, obj2: U): T & U => {
  return { ...obj1, ...obj2 };
};

/**
 * Deep merge objects
 */
export const deepMerge = <T extends object>(target: T, source: Partial<T>): T => {
  const result = { ...target };

  for (const key of keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue as any);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
};

/**
 * Check if object has property
 */
export const has =
  <T extends object>(key: PropertyKey) =>
  (obj: T): boolean => {
    return key in obj;
  };

/**
 * Get property safely
 */
export const get =
  <T extends object, K extends keyof T>(key: K) =>
  (obj: T): T[K] | undefined => {
    return obj[key];
  };

/**
 * Get nested property safely
 */
export const getPath =
  (path: string) =>
  (obj: any): any => {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  };

/**
 * Set property immutably
 */
export const set =
  <T extends object, K extends keyof T>(key: K, value: T[K]) =>
  (obj: T): T => {
    return { ...obj, [key]: value };
  };

/**
 * Update property immutably
 */
export const update =
  <T extends object, K extends keyof T>(key: K, fn: (value: T[K]) => T[K]) =>
  (obj: T): T => {
    return { ...obj, [key]: fn(obj[key]) };
  };

/**
 * Check if object is empty
 */
export const isEmpty = <T extends object>(obj: T): boolean => {
  return keys(obj).length === 0;
};

/**
 * Check if object is not empty
 */
export const isNotEmpty = <T extends object>(obj: T): boolean => {
  return keys(obj).length > 0;
};

/**
 * Remove undefined values
 */
export const compact = <T extends object>(obj: T): Partial<T> => {
  return filterObj((value: any) => value !== undefined)(obj);
};

/**
 * Remove null and undefined values
 */
export const compactAll = <T extends object>(obj: T): Partial<T> => {
  return filterObj((value: any) => value !== null && value !== undefined)(obj);
};

/**
 * Invert object (swap keys and values)
 */
export const invert = <T extends Record<string, string | number>>(
  obj: T
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[String(value)] = key;
  }
  return result;
};

/**
 * Deep clone object
 */
export const clone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(clone) as any;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      cloned[key] = clone(obj[key]);
    }
  }

  return cloned;
};

/**
 * Freeze object deeply (make immutable)
 */
export const deepFreeze = <T extends object>(obj: T): Readonly<T> => {
  Object.freeze(obj);

  for (const value of values(obj)) {
    if (typeof value === 'object' && value !== null) {
      deepFreeze(value);
    }
  }

  return obj;
};
