/**
 * Functional Programming Utilities
 * Core utilities for functional composition and transformation
 *
 * Principles:
 * - Pure functions (no side effects)
 * - Immutable data
 * - Function composition
 * - Point-free style support
 */

// ============================================================================
// FUNCTION COMPOSITION
// ============================================================================

/**
 * Pipe - Left-to-right function composition
 * Applies functions sequentially from left to right
 *
 * @example
 * const result = pipe(
 *   5,
 *   x => x * 2,      // 10
 *   x => x + 3,      // 13
 *   x => x.toString() // "13"
 * );
 */
export const pipe = <T>(value: T, ...fns: Array<(arg: any) => any>): any =>
  fns.reduce((acc, fn) => fn(acc), value);

/**
 * Compose - Right-to-left function composition
 * Applies functions sequentially from right to left
 *
 * @example
 * const addThenMultiply = compose(
 *   (x: number) => x * 2,    // Applied second
 *   (x: number) => x + 3     // Applied first
 * );
 * addThenMultiply(5); // (5 + 3) * 2 = 16
 */
export const compose =
  <T>(...fns: Array<(arg: any) => any>) =>
  (value: T): any =>
    fns.reduceRight((acc, fn) => fn(acc), value);

/**
 * Flow - Alias for pipe (for function composition without initial value)
 *
 * @example
 * const transform = flow(
 *   (x: number) => x * 2,
 *   (x: number) => x + 3,
 *   (x: number) => x.toString()
 * );
 * transform(5); // "13"
 */
export const flow =
  <A, B>(...fns: Array<(arg: any) => any>) =>
  (value: A): B =>
    pipe(value, ...fns);

// ============================================================================
// CURRYING & PARTIAL APPLICATION
// ============================================================================

/**
 * Curry - Transform multi-argument function to curried form
 *
 * @example
 * const add = (a: number, b: number) => a + b;
 * const curriedAdd = curry(add);
 * curriedAdd(5)(3); // 8
 */
export const curry =
  <A, B, C>(fn: (a: A, b: B) => C) =>
  (a: A) =>
  (b: B): C =>
    fn(a, b);

/**
 * Curry3 - Curry function with 3 arguments
 */
export const curry3 =
  <A, B, C, D>(fn: (a: A, b: B, c: C) => D) =>
  (a: A) =>
  (b: B) =>
  (c: C): D =>
    fn(a, b, c);

/**
 * Partial - Partial application of function arguments
 *
 * @example
 * const add = (a: number, b: number, c: number) => a + b + c;
 * const add5 = partial(add, 5);
 * add5(3, 2); // 10
 */
export const partial =
  <A extends any[], R>(fn: (...args: A) => R, ...partialArgs: Partial<A>) =>
  (...remainingArgs: any[]): R =>
    fn(...([...partialArgs, ...remainingArgs] as A));

// ============================================================================
// ARRAY TRANSFORMATIONS (Point-free style)
// ============================================================================

/**
 * Map - Transform array elements
 *
 * @example
 * pipe(
 *   [1, 2, 3],
 *   map((x: number) => x * 2)
 * ); // [2, 4, 6]
 */
export const map =
  <A, B>(fn: (item: A, index: number) => B) =>
  (items: readonly A[]): B[] =>
    items.map(fn);

/**
 * Filter - Keep elements matching predicate
 *
 * @example
 * pipe(
 *   [1, 2, 3, 4],
 *   filter((x: number) => x > 2)
 * ); // [3, 4]
 */
export const filter =
  <A>(predicate: (item: A, index: number) => boolean) =>
  (items: readonly A[]): A[] =>
    items.filter(predicate);

/**
 * Reduce - Accumulate array to single value
 *
 * @example
 * pipe(
 *   [1, 2, 3, 4],
 *   reduce((acc: number, x: number) => acc + x, 0)
 * ); // 10
 */
export const reduce =
  <A, B>(fn: (acc: B, item: A, index: number) => B, initial: B) =>
  (items: readonly A[]): B =>
    items.reduce(fn, initial);

/**
 * FlatMap - Map then flatten
 *
 * @example
 * pipe(
 *   [1, 2, 3],
 *   flatMap((x: number) => [x, x * 2])
 * ); // [1, 2, 2, 4, 3, 6]
 */
export const flatMap =
  <A, B>(fn: (item: A, index: number) => B[]) =>
  (items: readonly A[]): B[] =>
    items.flatMap(fn);

/**
 * Sort - Sort array (returns new array)
 *
 * @example
 * pipe(
 *   [3, 1, 2],
 *   sort((a: number, b: number) => a - b)
 * ); // [1, 2, 3]
 */
export const sort =
  <A>(compareFn: (a: A, b: A) => number) =>
  (items: readonly A[]): A[] =>
    [...items].sort(compareFn);

/**
 * SortBy - Sort by property
 *
 * @example
 * pipe(
 *   [{ age: 30 }, { age: 20 }, { age: 25 }],
 *   sortBy('age')
 * ); // [{ age: 20 }, { age: 25 }, { age: 30 }]
 */
export const sortBy =
  <A>(key: keyof A) =>
  (items: readonly A[]): A[] =>
    [...items].sort((a, b) => {
      if (a[key] < b[key]) return -1;
      if (a[key] > b[key]) return 1;
      return 0;
    });

/**
 * Reverse - Reverse array (returns new array)
 */
export const reverse = <A>(items: readonly A[]): A[] => [...items].reverse();

/**
 * Take - Take first n elements
 *
 * @example
 * pipe([1, 2, 3, 4, 5], take(3)); // [1, 2, 3]
 */
export const take =
  (n: number) =>
  <A>(items: readonly A[]): A[] =>
    items.slice(0, n);

/**
 * Drop - Drop first n elements
 *
 * @example
 * pipe([1, 2, 3, 4, 5], drop(2)); // [3, 4, 5]
 */
export const drop =
  (n: number) =>
  <A>(items: readonly A[]): A[] =>
    items.slice(n);

/**
 * Unique - Remove duplicates
 *
 * @example
 * pipe([1, 2, 2, 3, 3, 3], unique); // [1, 2, 3]
 */
export const unique = <A>(items: readonly A[]): A[] => [...new Set(items)];

/**
 * UniqueBy - Remove duplicates by key
 *
 * @example
 * pipe(
 *   [{ id: 1 }, { id: 2 }, { id: 1 }],
 *   uniqueBy('id')
 * ); // [{ id: 1 }, { id: 2 }]
 */
export const uniqueBy =
  <A>(key: keyof A) =>
  (items: readonly A[]): A[] => {
    const seen = new Set();
    return items.filter((item) => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  };

/**
 * Partition - Split array by predicate
 *
 * @example
 * pipe(
 *   [1, 2, 3, 4, 5],
 *   partition((x: number) => x > 3)
 * ); // [[4, 5], [1, 2, 3]]
 */
export const partition =
  <A>(predicate: (item: A) => boolean) =>
  (items: readonly A[]): [A[], A[]] => {
    const pass: A[] = [];
    const fail: A[] = [];
    for (const item of items) {
      (predicate(item) ? pass : fail).push(item);
    }
    return [pass, fail];
  };

/**
 * GroupBy - Group items by key
 *
 * @example
 * pipe(
 *   [{ type: 'a', val: 1 }, { type: 'b', val: 2 }, { type: 'a', val: 3 }],
 *   groupBy('type')
 * ); // { a: [...], b: [...] }
 */
export const groupBy =
  <A>(key: keyof A) =>
  (items: readonly A[]): Record<string, A[]> =>
    items.reduce(
      (acc, item) => {
        const groupKey = String(item[key]);
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
      },
      {} as Record<string, A[]>
    );

// ============================================================================
// ASYNC TRANSFORMATIONS
// ============================================================================

/**
 * MapAsync - Map with async function
 *
 * @example
 * await pipe(
 *   [1, 2, 3],
 *   mapAsync(async (x) => x * 2)
 * ); // [2, 4, 6]
 */
export const mapAsync =
  <A, B>(fn: (item: A, index: number) => Promise<B>) =>
  (items: readonly A[]): Promise<B[]> =>
    Promise.all(items.map(fn));

/**
 * FilterAsync - Filter with async predicate
 */
export const filterAsync =
  <A>(predicate: (item: A, index: number) => Promise<boolean>) =>
  async (items: readonly A[]): Promise<A[]> => {
    const results = await Promise.all(items.map(predicate));
    return items.filter((_, i) => results[i]);
  };

/**
 * ReduceAsync - Reduce with async function
 */
export const reduceAsync =
  <A, B>(fn: (acc: B, item: A, index: number) => Promise<B>, initial: B) =>
  async (items: readonly A[]): Promise<B> => {
    let acc = initial;
    for (let i = 0; i < items.length; i++) {
      acc = await fn(acc, items[i], i);
    }
    return acc;
  };

// ============================================================================
// SIDE EFFECTS & DEBUGGING
// ============================================================================

/**
 * Tap - Execute side effect without changing value
 *
 * @example
 * pipe(
 *   5,
 *   x => x * 2,
 *   tap((x) => console.log('Debug:', x)), // Logs: Debug: 10
 *   x => x + 3
 * ); // 13
 */
export const tap =
  <T>(fn: (value: T) => void) =>
  (value: T): T => {
    fn(value);
    return value;
  };

/**
 * TapAsync - Execute async side effect
 */
export const tapAsync =
  <T>(fn: (value: T) => Promise<void>) =>
  async (value: T): Promise<T> => {
    await fn(value);
    return value;
  };

/**
 * Trace - Log value with label
 *
 * @example
 * pipe(
 *   5,
 *   x => x * 2,
 *   trace('After multiply'), // Logs: "After multiply: 10"
 *   x => x + 3
 * );
 */
export const trace =
  (label: string) =>
  <T>(value: T): T => {
    console.log(`${label}:`, value);
    return value;
  };

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Result type - Represents success or failure
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * TryCatch - Convert exception to Result type
 *
 * @example
 * const result = tryCatch(() => JSON.parse(input));
 * if (result.ok) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 */
export const tryCatch = <T, E = Error>(fn: () => T): Result<T, E> => {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error: error as E };
  }
};

/**
 * TryCatchAsync - Async version of tryCatch
 */
export const tryCatchAsync = async <T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>> => {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { ok: false, error: error as E };
  }
};

/**
 * UnwrapResult - Extract value from Result or throw error
 */
export const unwrapResult = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw result.error;
};

/**
 * MapResult - Transform Result value
 */
export const mapResult =
  <T, U, E>(fn: (value: T) => U) =>
  (result: Result<T, E>): Result<U, E> => {
    if (result.ok) return { ok: true, value: fn(result.value) };
    return result;
  };

// ============================================================================
// PREDICATES & LOGIC
// ============================================================================

/**
 * Not - Negate predicate
 */
export const not =
  <A>(predicate: (item: A) => boolean) =>
  (item: A): boolean =>
    !predicate(item);

/**
 * And - Combine predicates with AND
 */
export const and =
  <A>(...predicates: Array<(item: A) => boolean>) =>
  (item: A): boolean =>
    predicates.every((p) => p(item));

/**
 * Or - Combine predicates with OR
 */
export const or =
  <A>(...predicates: Array<(item: A) => boolean>) =>
  (item: A): boolean =>
    predicates.some((p) => p(item));

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Identity - Return value as-is
 */
export const identity = <T>(value: T): T => value;

/**
 * Constant - Always return same value
 */
export const constant =
  <T>(value: T) =>
  (): T =>
    value;

/**
 * Noop - Do nothing
 */
export const noop = (): void => {};

/**
 * Prop - Extract property value
 *
 * @example
 * pipe(
 *   [{ name: 'Alice' }, { name: 'Bob' }],
 *   map(prop('name'))
 * ); // ['Alice', 'Bob']
 */
export const prop =
  <K extends string | number | symbol>(key: K) =>
  <T extends Record<K, any>>(obj: T): T[K] =>
    obj[key];

/**
 * Pick - Pick properties from object
 */
export const pick =
  <T, K extends keyof T>(keys: K[]) =>
  (obj: T): Pick<T, K> =>
    keys.reduce(
      (acc, key) => {
        acc[key] = obj[key];
        return acc;
      },
      {} as Pick<T, K>
    );

/**
 * Omit - Omit properties from object
 */
export const omit =
  <T, K extends keyof T>(keys: K[]) =>
  (obj: T): Omit<T, K> => {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result;
  };
