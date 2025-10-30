/**
 * Result type for functional error handling
 * Represents success or failure without exceptions
 *
 * DESIGN RATIONALE:
 * - Explicit error handling at type level
 * - Composable through map/flatMap
 * - Forces caller to handle errors
 * - No hidden control flow (no thrown exceptions)
 */

export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly _tag: 'Success';
  readonly value: T;
}

export interface Failure<E> {
  readonly _tag: 'Failure';
  readonly error: E;
}

/**
 * Constructors
 */

export const success = <T>(value: T): Success<T> => ({
  _tag: 'Success',
  value,
});

export const failure = <E>(error: E): Failure<E> => ({
  _tag: 'Failure',
  error,
});

/**
 * Type guards
 */

export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> =>
  result._tag === 'Success';

export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> =>
  result._tag === 'Failure';

/**
 * Transformations
 */

/**
 * Transform the success value
 * Failure propagates unchanged
 */
export const map = <T, U, E>(fn: (value: T) => U) => (result: Result<T, E>): Result<U, E> => {
  if (isSuccess(result)) {
    return success(fn(result.value));
  }
  return result;
};

/**
 * Transform the success value with a function that returns a Result
 * Enables chaining operations that can fail
 * Failure propagates unchanged
 */
export const flatMap =
  <T, U, E>(fn: (value: T) => Result<U, E>) =>
  (result: Result<T, E>): Result<U, E> => {
    if (isSuccess(result)) {
      return fn(result.value);
    }
    return result;
  };

/**
 * Transform the error
 * Success propagates unchanged
 */
export const mapError = <T, E, F>(fn: (error: E) => F) => (result: Result<T, E>): Result<T, F> => {
  if (isFailure(result)) {
    return failure(fn(result.error));
  }
  return result;
};

/**
 * Extract value or provide default
 */
export const getOrElse =
  <T>(defaultValue: T) =>
  <E>(result: Result<T, E>): T => {
    if (isSuccess(result)) {
      return result.value;
    }
    return defaultValue;
  };

/**
 * Extract value or compute default
 */
export const getOrElseLazy =
  <T>(fn: () => T) =>
  <E>(result: Result<T, E>): T => {
    if (isSuccess(result)) {
      return result.value;
    }
    return fn();
  };

/**
 * Pattern matching
 */
export const match =
  <T, E, U>(onSuccess: (value: T) => U, onFailure: (error: E) => U) =>
  (result: Result<T, E>): U => {
    if (isSuccess(result)) {
      return onSuccess(result.value);
    }
    return onFailure(result.error);
  };

/**
 * Convert thrown exception to Result
 */
export const tryCatch = <T, E = Error>(
  fn: () => T,
  onError: (error: unknown) => E = (error: unknown) => error as E
): Result<T, E> => {
  try {
    return success(fn());
  } catch (error) {
    return failure(onError(error));
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
    const value = await fn();
    return success(value);
  } catch (error) {
    return failure(onError(error));
  }
};

/**
 * Combine multiple Results into a single Result containing an array
 * Fails if any Result is a Failure (short-circuits on first failure)
 */
export const all = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];

  for (const result of results) {
    if (isFailure(result)) {
      return result;
    }
    values.push(result.value);
  }

  return success(values);
};

/**
 * Run side effect for success case
 */
export const tap =
  <T, E>(fn: (value: T) => void) =>
  (result: Result<T, E>): Result<T, E> => {
    if (isSuccess(result)) {
      fn(result.value);
    }
    return result;
  };

/**
 * Run side effect for failure case
 */
export const tapError =
  <T, E>(fn: (error: E) => void) =>
  (result: Result<T, E>): Result<T, E> => {
    if (isFailure(result)) {
      fn(result.error);
    }
    return result;
  };

/**
 * Functional pipe for composing Result transformations
 */
export const pipe =
  <T, E>(result: Result<T, E>) =>
  <U>(fn: (result: Result<T, E>) => U): U =>
    fn(result);
