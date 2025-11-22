/**
 * Error Handling - 統一錯誤處理
 * Functional, composable error handling system
 */

import { logger } from '../utils/display/logger.js';
import type { Result } from './result.js';

/**
 * Base error class
 */
export class BaseError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
  }
}

/**
 * Storage error
 */
export class StorageError extends BaseError {
  constructor(message: string, operation?: string, details?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', 500, { operation, ...details });
  }
}

/**
 * Network error
 */
export class NetworkError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 503, details);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends BaseError {
  constructor(message: string, resource?: string, details?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', 404, { resource, ...details });
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends BaseError {
  constructor(message: string, timeout?: number, details?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', 408, { timeout, ...details });
  }
}

/**
 * Error types
 */
export const ErrorTypes = {
  ValidationError,
  ConfigurationError,
  StorageError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  TimeoutError,
} as const;

/**
 * Error codes
 */
export const ErrorCodes = {
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Configuration errors
  MISSING_CONFIG: 'MISSING_CONFIG',
  INVALID_CONFIG: 'INVALID_CONFIG',
  CONFIG_PARSE_ERROR: 'CONFIG_PARSE_ERROR',

  // Storage errors
  STORAGE_CONNECTION_FAILED: 'STORAGE_CONNECTION_FAILED',
  STORAGE_OPERATION_FAILED: 'STORAGE_OPERATION_FAILED',
  STORAGE_TIMEOUT: 'STORAGE_TIMEOUT',
  STORAGE_FULL: 'STORAGE_FULL',

  // Network errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  REQUEST_FAILED: 'REQUEST_FAILED',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Not found errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  ENDPOINT_NOT_FOUND: 'ENDPOINT_NOT_FOUND',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
} as const;

/**
 * Error handler interface
 */
export interface ErrorHandler {
  canHandle(error: Error): boolean;
  handle(error: Error): void | Promise<void>;
}

/**
 * Logger error handler
 */
export class LoggerErrorHandler implements ErrorHandler {
  constructor(private level: 'error' | 'warn' | 'info' | 'debug' = 'error') {}

  canHandle(error: Error): boolean {
    return true; // Logger can handle all errors
  }

  handle(error: Error): void {
    const errorData = {
      name: error.name,
      message: error.message,
      code: (error as BaseError).code,
      statusCode: (error as BaseError).statusCode,
      stack: error.stack,
      details: (error as BaseError).details,
    };

    switch (this.level) {
      case 'error':
        logger.error(error.message, errorData);
        break;
      case 'warn':
        logger.warn(error.message, errorData);
        break;
      case 'info':
        logger.info(error.message, errorData);
        break;
      case 'debug':
        logger.debug(error.message, errorData);
        break;
    }
  }
}

/**
 * Console error handler
 */
export class ConsoleErrorHandler implements ErrorHandler {
  canHandle(error: Error): boolean {
    return true; // Console can handle all errors
  }

  handle(error: Error): void {
    if (error instanceof BaseError) {
      console.error(`[${error.code}] ${error.message}`);
      if (error.details) {
        console.error('Details:', error.details);
      }
    } else {
      console.error(error.message);
    }

    if (process.env.NODE_ENV === 'development' && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

/**
 * Error handler chain
 */
export class ErrorHandlerChain {
  private handlers: ErrorHandler[] = [];

  constructor(handlers: ErrorHandler[] = []) {
    this.handlers = handlers;
  }

  addHandler(handler: ErrorHandler): void {
    this.handlers.push(handler);
  }

  removeHandler(handler: ErrorHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  async handle(error: Error): Promise<void> {
    for (const handler of this.handlers) {
      if (handler.canHandle(error)) {
        await handler.handle(error);
        return;
      }
    }

    // If no handler can handle the error, use default console handler
    new ConsoleErrorHandler().handle(error);
  }
}

/**
 * Global error handler
 */
export const globalErrorHandler = new ErrorHandlerChain([
  new LoggerErrorHandler('error'),
]);

/**
 * Set up global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
    globalErrorHandler.handle(error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled Rejection:', { error: error.message, reason, promise });
    globalErrorHandler.handle(error);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    logger.info('Process terminated by user');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Process terminated');
    process.exit(0);
  });
}

/**
 * Safe function wrapper with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => void | Promise<void>
): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    if (errorHandler) {
      await errorHandler(errorObj);
    } else {
      await globalErrorHandler.handle(errorObj);
    }

    return { success: false, error: errorObj };
  }
}

/**
 * Safe sync function wrapper with error handling
 */
export function withSyncErrorHandling<T>(
  fn: () => T,
  errorHandler?: (error: Error) => void | Promise<void>
): Result<T> {
  try {
    const data = fn();
    return { success: true, data };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    if (errorHandler) {
      // For sync error handlers, we need to handle them asynchronously
      void errorHandler(errorObj);
    } else {
      void globalErrorHandler.handle(errorObj);
    }

    return { success: false, error: errorObj };
  }
}

/**
 * Retry function with error handling
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
    retryableErrors?: string[];
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<Result<T>> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    retryableErrors = [],
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable = retryableErrors.length === 0 ||
        retryableErrors.includes((lastError as BaseError).code) ||
        retryableErrors.includes(lastError.constructor.name);

      if (!isRetryable || attempt === maxAttempts) {
        await globalErrorHandler.handle(lastError);
        return { success: false, error: lastError };
      }

      // Call retry callback
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Calculate delay
      const retryDelay = backoff === 'exponential'
        ? delay * Math.pow(2, attempt - 1)
        : delay * attempt;

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  await globalErrorHandler.handle(lastError!);
  return { success: false, error: lastError! };
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<Result<T>> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve({
        success: false,
        error: new TimeoutError(timeoutMessage, timeoutMs),
      });
    }, timeoutMs);

    fn()
      .then((data) => {
        clearTimeout(timeoutId);
        resolve({ success: true, data });
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
  });
}

/**
 * Circuit breaker pattern
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private options: {
      failureThreshold?: number;
      recoveryTimeMs?: number;
      monitoringPeriodMs?: number;
    } = {}
  ) {
    const {
      failureThreshold = 5,
      recoveryTimeMs = 60000,
      monitoringPeriodMs = 10000,
    } = options;

    this.options = { failureThreshold, recoveryTimeMs, monitoringPeriodMs };
  }

  async execute<T>(fn: () => Promise<T>): Promise<Result<T>> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.options.recoveryTimeMs!) {
        this.state = 'half-open';
      } else {
        return {
          success: false,
          error: new Error('Circuit breaker is open'),
        };
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return { success: true, data: result };
    } catch (error) {
      this.onFailure();
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold!) {
      this.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
}