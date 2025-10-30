/**
 * Functional array utilities
 * Pure array transformation functions
 *
 * DESIGN RATIONALE:
 * - Pure functions for array operations
 * - Composable transformations
 * - Type-safe operations
 * - No side effects (no mutations)
 */

/**
 * Map over array
 */
export const map =
  <T, U>(fn: (item: T, index: number) => U) =>
  (arr: T[]): U[] =>
    arr.map(fn);

/**
 * Filter array
 */
export const filter =
  <T>(predicate: (item: T, index: number) => boolean) =>
  (arr: T[]): T[] =>
    arr.filter(predicate);

/**
 * Reduce array
 */
export const reduce =
  <T, U>(fn: (acc: U, item: T, index: number) => U, initial: U) =>
  (arr: T[]): U =>
    arr.reduce(fn, initial);

/**
 * Find first element matching predicate
 */
export const find =
  <T>(predicate: (item: T, index: number) => boolean) =>
  (arr: T[]): T | undefined =>
    arr.find(predicate);

/**
 * Find index of first element matching predicate
 */
export const findIndex =
  <T>(predicate: (item: T, index: number) => boolean) =>
  (arr: T[]): number =>
    arr.findIndex(predicate);

/**
 * Check if any element matches predicate
 */
export const some =
  <T>(predicate: (item: T, index: number) => boolean) =>
  (arr: T[]): boolean =>
    arr.some(predicate);

/**
 * Check if all elements match predicate
 */
export const every =
  <T>(predicate: (item: T, index: number) => boolean) =>
  (arr: T[]): boolean =>
    arr.every(predicate);

/**
 * Flatten array one level
 */
export const flatten = <T>(arr: T[][]): T[] => arr.flat();

/**
 * Flatten array deeply
 */
export const flattenDeep = <T>(arr: any[]): T[] => arr.flat(Number.POSITIVE_INFINITY);

/**
 * Map and flatten (flatMap)
 */
export const flatMap =
  <T, U>(fn: (item: T, index: number) => U[]) =>
  (arr: T[]): U[] =>
    arr.flatMap(fn);

/**
 * Take first n elements
 */
export const take =
  (n: number) =>
  <T>(arr: T[]): T[] =>
    arr.slice(0, n);

/**
 * Skip first n elements
 */
export const skip =
  (n: number) =>
  <T>(arr: T[]): T[] =>
    arr.slice(n);

/**
 * Take while predicate is true
 */
export const takeWhile =
  <T>(predicate: (item: T) => boolean) =>
  (arr: T[]): T[] => {
    const index = arr.findIndex((item) => !predicate(item));
    return index === -1 ? arr : arr.slice(0, index);
  };

/**
 * Skip while predicate is true
 */
export const skipWhile =
  <T>(predicate: (item: T) => boolean) =>
  (arr: T[]): T[] => {
    const index = arr.findIndex((item) => !predicate(item));
    return index === -1 ? [] : arr.slice(index);
  };

/**
 * Reverse array
 */
export const reverse = <T>(arr: T[]): T[] => [...arr].reverse();

/**
 * Sort array
 */
export const sort =
  <T>(compareFn?: (a: T, b: T) => number) =>
  (arr: T[]): T[] =>
    [...arr].sort(compareFn);

/**
 * Sort by key
 */
export const sortBy =
  <T, K extends keyof T>(key: K, order: 'asc' | 'desc' = 'asc') =>
  (arr: T[]): T[] => {
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  };

/**
 * Remove duplicates
 */
export const unique = <T>(arr: T[]): T[] => [...new Set(arr)];

/**
 * Remove duplicates by key
 */
export const uniqueBy =
  <T, K extends keyof T>(key: K) =>
  (arr: T[]): T[] => {
    const seen = new Set();
    return arr.filter((item) => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  };

/**
 * Partition array into two based on predicate
 */
export const partition =
  <T>(predicate: (item: T) => boolean) =>
  (arr: T[]): [T[], T[]] => {
    const pass: T[] = [];
    const fail: T[] = [];

    for (const item of arr) {
      if (predicate(item)) {
        pass.push(item);
      } else {
        fail.push(item);
      }
    }

    return [pass, fail];
  };

/**
 * Group by key
 */
export const groupBy =
  <T, K extends keyof T>(key: K) =>
  (arr: T[]): Record<string, T[]> => {
    return arr.reduce((acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  };

/**
 * Count occurrences
 */
export const countBy =
  <T>(fn: (item: T) => string) =>
  (arr: T[]): Record<string, number> => {
    return arr.reduce((acc, item) => {
      const key = fn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

/**
 * Chunk array into smaller arrays
 */
export const chunk =
  (size: number) =>
  <T>(arr: T[]): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

/**
 * Zip arrays together
 */
export const zip = <T, U>(arr1: T[], arr2: U[]): Array<[T, U]> => {
  const length = Math.min(arr1.length, arr2.length);
  const result: Array<[T, U]> = [];

  for (let i = 0; i < length; i++) {
    result.push([arr1[i], arr2[i]]);
  }

  return result;
};

/**
 * Unzip array of tuples
 */
export const unzip = <T, U>(arr: Array<[T, U]>): [T[], U[]] => {
  const first: T[] = [];
  const second: U[] = [];

  for (const [a, b] of arr) {
    first.push(a);
    second.push(b);
  }

  return [first, second];
};

/**
 * Intersperse value between array elements
 */
export const intersperse =
  <T>(separator: T) =>
  (arr: T[]): T[] => {
    if (arr.length === 0) return [];

    const result: T[] = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
      result.push(separator, arr[i]);
    }

    return result;
  };

/**
 * Get first element
 */
export const head = <T>(arr: T[]): T | undefined => arr[0];

/**
 * Get last element
 */
export const last = <T>(arr: T[]): T | undefined => arr[arr.length - 1];

/**
 * Get all but first element
 */
export const tail = <T>(arr: T[]): T[] => arr.slice(1);

/**
 * Get all but last element
 */
export const init = <T>(arr: T[]): T[] => arr.slice(0, -1);

/**
 * Check if array is empty
 */
export const isEmpty = <T>(arr: T[]): boolean => arr.length === 0;

/**
 * Check if array is not empty
 */
export const isNotEmpty = <T>(arr: T[]): boolean => arr.length > 0;

/**
 * Sum numbers in array
 */
export const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);

/**
 * Get average of numbers in array
 */
export const average = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
};

/**
 * Get min value
 */
export const min = (arr: number[]): number | undefined => {
  if (arr.length === 0) return undefined;
  return Math.min(...arr);
};

/**
 * Get max value
 */
export const max = (arr: number[]): number | undefined => {
  if (arr.length === 0) return undefined;
  return Math.max(...arr);
};
