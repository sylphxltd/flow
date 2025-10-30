/**
 * Async/Promise utilities for functional programming
 * Handle promises with Result types
 *
 * DESIGN RATIONALE:
 * - Convert Promise rejections to Result types
 * - Composable async operations
 * - No unhandled promise rejections
 * - Type-safe async error handling
 */

import type { AppError } from './error-types.js';
import { toAppError } from './error-types.js';
import type { Result } from './result.js';
import { failure, isSuccess, success } from './result.js';

/**
 * Async Result type
 */
export type AsyncResult<T, E = AppError> = Promise<Result<T, E>>;

/**
 * Convert Promise to AsyncResult
 * Catches rejections and converts to Result
 */
export const fromPromise = async <T>(
  promise: Promise<T>,
  onError?: (error: unknown) => AppError
): AsyncResult<T> => {
  try {
    const value = await promise;
    return success(value);
  } catch (error) {
    return failure(onError ? onError(error) : toAppError(error));
  }
};

/**
 * Map over async result
 */
export const mapAsync =
  <T, U>(fn: (value: T) => U | Promise<U>) =>
  async <E>(result: AsyncResult<T, E>): AsyncResult<U, E> => {
    const resolved = await result;
    if (isSuccess(resolved)) {
      const mapped = await fn(resolved.value);
      return success(mapped);
    }
    return resolved;
  };

/**
 * FlatMap over async result
 */
export const flatMapAsync =
  <T, U, E>(fn: (value: T) => AsyncResult<U, E>) =>
  async (result: AsyncResult<T, E>): AsyncResult<U, E> => {
    const resolved = await result;
    if (isSuccess(resolved)) {
      return fn(resolved.value);
    }
    return resolved;
  };

/**
 * Run async operation with timeout
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => AppError
): AsyncResult<T> => {
  return fromPromise(
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      ),
    ]),
    onTimeout
  );
};

/**
 * Retry async operation
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts: number;
    delayMs?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: AppError) => void;
  }
): AsyncResult<T> => {
  const { maxAttempts, delayMs = 1000, backoff = 2, onRetry } = options;

  let lastError: AppError | null = null;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await fromPromise(fn());

    if (isSuccess(result)) {
      return result;
    }

    lastError = result.error;

    if (attempt < maxAttempts) {
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoff;
    }
  }

  return failure(lastError!);
};

/**
 * Run promises in parallel and collect results
 * Fails if any promise fails
 */
export const allAsync = async <T>(
  promises: Array<AsyncResult<T, AppError>>
): AsyncResult<T[]> => {
  const results = await Promise.all(promises);

  const values: T[] = [];
  for (const result of results) {
    if (isSuccess(result)) {
      values.push(result.value);
    } else {
      return result;
    }
  }

  return success(values);
};

/**
 * Run promises in parallel and collect all results
 * Returns both successes and failures
 */
export const allSettledAsync = async <T>(
  promises: Array<AsyncResult<T, AppError>>
): Promise<Array<Result<T, AppError>>> => {
  return Promise.all(promises);
};

/**
 * Run promises sequentially
 */
export const sequenceAsync = async <T>(
  promises: Array<() => AsyncResult<T, AppError>>
): AsyncResult<T[]> => {
  const values: T[] = [];

  for (const promiseFn of promises) {
    const result = await promiseFn();
    if (isSuccess(result)) {
      values.push(result.value);
    } else {
      return result;
    }
  }

  return success(values);
};

/**
 * Race promises - return first to complete
 */
export const raceAsync = async <T>(
  promises: Array<AsyncResult<T, AppError>>
): AsyncResult<T> => {
  return Promise.race(promises);
};

/**
 * Delay execution
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Run with concurrency limit
 */
export const withConcurrency = async <T>(
  tasks: Array<() => AsyncResult<T, AppError>>,
  concurrency: number
): AsyncResult<T[]> => {
  const results: T[] = [];
  const executing: Array<Promise<void>> = [];

  for (const task of tasks) {
    const promise = (async () => {
      const result = await task();
      if (isSuccess(result)) {
        results.push(result.value);
      } else {
        throw result.error;
      }
    })();

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }

  try {
    await Promise.all(executing);
    return success(results);
  } catch (error) {
    return failure(toAppError(error));
  }
};

/**
 * Memoize async function
 */
export const memoizeAsync = <Args extends any[], T>(
  fn: (...args: Args) => AsyncResult<T, AppError>,
  keyFn?: (...args: Args) => string
): ((...args: Args) => AsyncResult<T, AppError>) => {
  const cache = new Map<string, AsyncResult<T, AppError>>();

  return (...args: Args): AsyncResult<T, AppError> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Debounce async function
 */
export const debounceAsync = <Args extends any[], T>(
  fn: (...args: Args) => AsyncResult<T, AppError>,
  delayMs: number
): ((...args: Args) => AsyncResult<T, AppError>) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let latestArgs: Args | null = null;
  let latestPromise: AsyncResult<T, AppError> | null = null;

  return (...args: Args): AsyncResult<T, AppError> => {
    latestArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!latestPromise) {
      latestPromise = new Promise((resolve) => {
        timeoutId = setTimeout(async () => {
          if (latestArgs) {
            const result = await fn(...latestArgs);
            resolve(result);
            latestPromise = null;
            timeoutId = null;
          }
        }, delayMs);
      }) as AsyncResult<T, AppError>;
    }

    return latestPromise;
  };
};

/**
 * Throttle async function
 */
export const throttleAsync = <Args extends any[], T>(
  fn: (...args: Args) => AsyncResult<T, AppError>,
  limitMs: number
): ((...args: Args) => AsyncResult<T, AppError>) => {
  let lastRun = 0;
  let pending: AsyncResult<T, AppError> | null = null;

  return (...args: Args): AsyncResult<T, AppError> => {
    const now = Date.now();

    if (now - lastRun >= limitMs) {
      lastRun = now;
      return fn(...args);
    }

    if (!pending) {
      pending = new Promise((resolve) => {
        setTimeout(async () => {
          lastRun = Date.now();
          const result = await fn(...args);
          pending = null;
          resolve(result);
        }, limitMs - (now - lastRun));
      }) as AsyncResult<T, AppError>;
    }

    return pending;
  };
};
