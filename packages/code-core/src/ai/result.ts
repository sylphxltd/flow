/**
 * Unified Result Type - 統一結果類型
 * Single source of truth for Result<T, E> across the entire project
 *
 * This replaces all conflicting Result type definitions:
 * - src/core/type-utils.ts
 * - src/core/functional/result.ts
 * - src/utils/functional.ts
 */

// ============================================================================
// CORE RESULT TYPE
// ============================================================================

/**
 * Result type for functional error handling
 * Represents success or failure without exceptions
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// ============================================================================
// CONSTRUCTORS
// ============================================================================

/**
 * Create a successful result
 */
export const ok = <T>(data: T): Result<T> => ({ success: true, data });

/**
 * Create an error result
 */
export const err = <E>(error: E): Result<never, E> => ({ success: false, error });

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if result is successful
 */
export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } =>
  result.success;

/**
 * Check if result is an error
 */
export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success;

// ============================================================================
// TRANSFORMATIONS
// ============================================================================

/**
 * Transform the success value
 * Error propagates unchanged
 */
export const map =
  <T, U, E>(fn: (data: T) => U) =>
  (result: Result<T, E>): Result<U, E> => {
    if (isOk(result)) {
      return ok(fn(result.data));
    }
    return result;
  };

/**
 * Transform the success value with a function that returns a Result
 * Enables chaining operations that can fail
 * Error propagates unchanged
 */
export const flatMap =
  <T, U, E>(fn: (data: T) => Result<U, E>) =>
  (result: Result<T, E>): Result<U, E> => {
    if (isOk(result)) {
      return fn(result.data);
    }
    return result;
  };

/**
 * Transform the error
 * Success propagates unchanged
 */
export const mapError =
  <T, E, F>(fn: (error: E) => F) =>
  (result: Result<T, E>): Result<T, F> => {
    if (isErr(result)) {
      return err(fn(result.error));
    }
    return result;
  };

/**
 * Extract value or provide default
 */
export const getOrElse =
  <T>(defaultValue: T) =>
  <E>(result: Result<T, E>): T => {
    if (isOk(result)) {
      return result.data;
    }
    return defaultValue;
  };

/**
 * Extract value or compute default
 */
export const getOrElseLazy =
  <T>(fn: () => T) =>
  <E>(result: Result<T, E>): T => {
    if (isOk(result)) {
      return result.data;
    }
    return fn();
  };

/**
 * Pattern matching
 */
export const match =
  <T, E, U>(onSuccess: (data: T) => U, onError: (error: E) => U) =>
  (result: Result<T, E>): U => {
    if (isOk(result)) {
      return onSuccess(result.data);
    }
    return onError(result.error);
  };

/**
 * Extract value or throw error
 * Use only when you're certain the result is successful
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isOk(result)) {
    return result.data;
  }
  throw result.error;
};

/**
 * Extract error or throw
 * Use only when you're certain the result is an error
 */
export const unwrapError = <T, E>(result: Result<T, E>): E => {
  if (isErr(result)) {
    return result.error;
  }
  throw new Error('Expected error but got success');
};

// ============================================================================
// ASYNC SUPPORT
// ============================================================================

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Convert thrown exception to Result
 */
export const tryCatch = <T, E = Error>(
  fn: () => T,
  onError: (error: unknown) => E = (error: unknown) => error as E
): Result<T, E> => {
  try {
    return ok(fn());
  } catch (error) {
    return err(onError(error));
  }
};

/**
 * Convert Promise to Result
 */
export const tryCatchAsync = async <T, E = Error>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E = (error: unknown) => error as E
): Promise<Result<T, E>> => {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    return err(onError(error));
  }
};

/**
 * Safe async function wrapper
 */
export const safeAsync = async <T, E = Error>(
  fn: () => Promise<T>,
  errorFn?: (error: unknown) => E
): Promise<Result<T, E>> => {
  return tryCatchAsync(fn, errorFn);
};

/**
 * Safe sync function wrapper
 */
export const safeSync = <T, E = Error>(
  fn: () => T,
  errorFn?: (error: unknown) => E
): Result<T, E> => {
  return tryCatch(fn, errorFn);
};

// ============================================================================
// COMBINATORS
// ============================================================================

/**
 * Combine multiple Results into a single Result containing an array
 * Fails if any Result is an error (short-circuits on first error)
 */
export const all = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];

  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.data);
  }

  return ok(values);
};

/**
 * Combine multiple Results into a single Result containing an array
 * Collects all errors instead of short-circuiting
 */
export const allWithErrors = <T, E>(results: Result<T, E>[]): Result<T[], E[]> => {
  const values: T[] = [];
  const errors: E[] = [];

  for (const result of results) {
    if (isOk(result)) {
      values.push(result.data);
    } else {
      errors.push(result.error);
    }
  }

  return errors.length > 0 ? err(errors) : ok(values);
};

/**
 * Combine multiple AsyncResults
 */
export const allAsync = async <T, E>(results: AsyncResult<T, E>[]): Promise<Result<T[], E>> => {
  const settled = await Promise.all(results);
  return all(settled);
};

/**
 * Race multiple AsyncResults - returns first successful result
 */
export const raceAsync = async <T, E>(results: AsyncResult<T, E>[]): Promise<Result<T, E>> => {
  try {
    return await Promise.race(results);
  } catch (error) {
    return err(error as E);
  }
};

// ============================================================================
// SIDE EFFECTS
// ============================================================================

/**
 * Run side effect for success case
 */
export const tap =
  <T, E>(fn: (data: T) => void) =>
  (result: Result<T, E>): Result<T, E> => {
    if (isOk(result)) {
      fn(result.data);
    }
    return result;
  };

/**
 * Run side effect for error case
 */
export const tapError =
  <T, E>(fn: (error: E) => void) =>
  (result: Result<T, E>): Result<T, E> => {
    if (isErr(result)) {
      fn(result.error);
    }
    return result;
  };

/**
 * Run side effect for both cases
 */
export const tapBoth =
  <T, E>(onSuccess: (data: T) => void, onError: (error: E) => void) =>
  (result: Result<T, E>): Result<T, E> => {
    if (isOk(result)) {
      onSuccess(result.data);
    } else {
      onError(result.error);
    }
    return result;
  };

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy compatibility aliases
 * These help migrate from old Result implementations
 */

// For src/core/functional/result.ts users
export const success = ok;
export const failure = err;
export const isSuccess = isOk;
export const isFailure = isErr;

// For src/utils/functional.ts users
export const unwrapResult = unwrap;
export const mapResult = map;

// ============================================================================
// TYPE INFERENCE HELPERS
// ============================================================================

/**
 * Helper to infer the success type from a Result
 */
export type SuccessType<T> = T extends Result<infer U, any> ? U : never;

/**
 * Helper to infer the error type from a Result
 */
export type ErrorType<T> = T extends Result<any, infer E> ? E : never;

/**
 * Create a type-safe Result from a function that might throw
 */
export type SafeResult<T extends (...args: any[]) => any> =
  Result<ReturnType<T>, Error>;