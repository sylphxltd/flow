/**
 * Functional error handling utilities
 * Replaces exception-based error handling with Result-based approach
 *
 * DESIGN RATIONALE:
 * - Errors as values, not exceptions
 * - Explicit error handling in function signatures
 * - Composable error handling
 * - Separation of error handling from business logic
 */

import type { AppError } from './error-types.js';
import { formatError, toAppError } from './error-types.js';
import type { Result } from './result.js';
import { failure, success } from './result.js';

/**
 * Execute a function and convert exceptions to Result
 */
export const execute = <T>(fn: () => T): Result<T, AppError> => {
  try {
    return success(fn());
  } catch (error) {
    return failure(toAppError(error));
  }
};

/**
 * Execute an async function and convert exceptions to Result
 */
export const executeAsync = async <T>(
  fn: () => Promise<T>
): Promise<Result<T, AppError>> => {
  try {
    const value = await fn();
    return success(value);
  } catch (error) {
    return failure(toAppError(error));
  }
};

/**
 * Log error to console (side effect)
 */
export const logError = (error: AppError): void => {
  console.error(formatError(error));
};

/**
 * Log error and exit process (side effect)
 * Only use at top-level command handlers
 */
export const exitWithError = (error: AppError, exitCode = 1): never => {
  logError(error);
  process.exit(exitCode);
};

/**
 * Convert Result to exit code
 * 0 for success, 1 for failure
 * Use at top-level command handlers
 */
export const toExitCode = <T>(result: Result<T, AppError>): number => {
  if (result._tag === 'Success') {
    return 0;
  }
  logError(result.error);
  return 1;
};

/**
 * Retry logic with exponential backoff
 * Retries a function that returns a Result
 */
export const retry = async <T>(
  fn: () => Promise<Result<T, AppError>>,
  options: {
    maxRetries: number;
    delayMs: number;
    backoff?: number;
    onRetry?: (error: AppError, attempt: number) => void;
  }
): Promise<Result<T, AppError>> => {
  const { maxRetries, delayMs, backoff = 2, onRetry } = options;

  let lastError: AppError | null = null;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fn();

    if (result._tag === 'Success') {
      return result;
    }

    lastError = result.error;

    if (attempt < maxRetries) {
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoff;
    }
  }

  return failure(lastError!);
};

/**
 * Create an async handler that wraps a function returning Result
 * Useful for command handlers
 */
export const createAsyncHandler =
  <T extends Record<string, any>>(
    handler: (options: T) => Promise<Result<void, AppError>>
  ) =>
  async (options: T): Promise<void> => {
    const result = await handler(options);

    if (result._tag === 'Failure') {
      exitWithError(result.error);
    }
  };

/**
 * Create a sync handler that wraps a function returning Result
 * Useful for command handlers
 */
export const createSyncHandler =
  <T extends Record<string, any>>(handler: (options: T) => Result<void, AppError>) =>
  (options: T): void => {
    const result = handler(options);

    if (result._tag === 'Failure') {
      exitWithError(result.error);
    }
  };
