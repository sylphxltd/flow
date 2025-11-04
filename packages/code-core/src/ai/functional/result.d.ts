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
export declare const success: <T>(value: T) => Success<T>;
export declare const failure: <E>(error: E) => Failure<E>;
/**
 * Type guards
 */
export declare const isSuccess: <T, E>(result: Result<T, E>) => result is Success<T>;
export declare const isFailure: <T, E>(result: Result<T, E>) => result is Failure<E>;
/**
 * Transformations
 */
/**
 * Transform the success value
 * Failure propagates unchanged
 */
export declare const map: <T, U, E>(fn: (value: T) => U) => (result: Result<T, E>) => Result<U, E>;
/**
 * Transform the success value with a function that returns a Result
 * Enables chaining operations that can fail
 * Failure propagates unchanged
 */
export declare const flatMap: <T, U, E>(fn: (value: T) => Result<U, E>) => (result: Result<T, E>) => Result<U, E>;
/**
 * Transform the error
 * Success propagates unchanged
 */
export declare const mapError: <T, E, F>(fn: (error: E) => F) => (result: Result<T, E>) => Result<T, F>;
/**
 * Extract value or provide default
 */
export declare const getOrElse: <T>(defaultValue: T) => <E>(result: Result<T, E>) => T;
/**
 * Extract value or compute default
 */
export declare const getOrElseLazy: <T>(fn: () => T) => <E>(result: Result<T, E>) => T;
/**
 * Pattern matching
 */
export declare const match: <T, E, U>(onSuccess: (value: T) => U, onFailure: (error: E) => U) => (result: Result<T, E>) => U;
/**
 * Convert thrown exception to Result
 */
export declare const tryCatch: <T, E = Error>(fn: () => T, onError?: (error: unknown) => E) => Result<T, E>;
/**
 * Convert Promise to Result
 */
export declare const tryCatchAsync: <T, E = Error>(fn: () => Promise<T>, onError?: (error: unknown) => E) => Promise<Result<T, E>>;
/**
 * Combine multiple Results into a single Result containing an array
 * Fails if any Result is a Failure (short-circuits on first failure)
 */
export declare const all: <T, E>(results: Result<T, E>[]) => Result<T[], E>;
/**
 * Run side effect for success case
 */
export declare const tap: <T, E>(fn: (value: T) => void) => (result: Result<T, E>) => Result<T, E>;
/**
 * Run side effect for failure case
 */
export declare const tapError: <T, E>(fn: (error: E) => void) => (result: Result<T, E>) => Result<T, E>;
/**
 * Functional pipe for composing Result transformations
 */
export declare const pipe: <T, E>(result: Result<T, E>) => <U>(fn: (result: Result<T, E>) => U) => U;
//# sourceMappingURL=result.d.ts.map