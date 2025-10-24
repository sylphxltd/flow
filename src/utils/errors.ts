/**
 * Standardized error handling utilities for Sylphx Flow
 * Provides consistent error types, formatting, and handling patterns
 */

import { logger } from './logger';

// Error categories
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  CONFIGURATION = 'CONFIGURATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  FILESYSTEM = 'FILESYSTEM',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RUNTIME = 'RUNTIME',
  EXTERNAL = 'EXTERNAL',
  INTERNAL = 'INTERNAL',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Base error class
export abstract class BaseError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly id: string;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { cause });

    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.id = this.generateId();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  private generateId(): string {
    return `${this.code}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert error to a JSON-serializable format
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Get a user-friendly message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Check if this error should be logged
   */
  shouldLog(): boolean {
    return this.severity !== ErrorSeverity.LOW;
  }

  /**
   * Check if this error should terminate the process
   */
  shouldTerminate(): boolean {
    return this.severity === ErrorSeverity.CRITICAL;
  }
}

// Specific error types
export class ValidationError extends BaseError {
  constructor(
    message: string,
    code = 'VALIDATION_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.VALIDATION, ErrorSeverity.LOW, context, cause);
  }

  getUserMessage(): string {
    return `Validation error: ${this.message}`;
  }
}

export class ConfigurationError extends BaseError {
  constructor(
    message: string,
    code = 'CONFIG_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.CONFIGURATION, ErrorSeverity.HIGH, context, cause);
  }

  getUserMessage(): string {
    return `Configuration error: ${this.message}`;
  }
}

export class NetworkError extends BaseError {
  constructor(
    message: string,
    code = 'NETWORK_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context, cause);
  }

  getUserMessage(): string {
    return `Network error: ${this.message}`;
  }
}

export class DatabaseError extends BaseError {
  constructor(
    message: string,
    code = 'DATABASE_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.DATABASE, ErrorSeverity.HIGH, context, cause);
  }

  getUserMessage(): string {
    return `Database error: ${this.message}`;
  }
}

export class FilesystemError extends BaseError {
  constructor(
    message: string,
    code = 'FILESYSTEM_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.FILESYSTEM, ErrorSeverity.MEDIUM, context, cause);
  }

  getUserMessage(): string {
    return `File system error: ${this.message}`;
  }
}

export class AuthenticationError extends BaseError {
  constructor(
    message: string,
    code = 'AUTH_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, context, cause);
  }

  getUserMessage(): string {
    return `Authentication error: ${this.message}`;
  }
}

export class AuthorizationError extends BaseError {
  constructor(
    message: string,
    code = 'AUTHZ_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH, context, cause);
  }

  getUserMessage(): string {
    return `Authorization error: ${this.message}`;
  }
}

export class ExternalServiceError extends BaseError {
  constructor(
    message: string,
    code = 'EXTERNAL_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.EXTERNAL, ErrorSeverity.MEDIUM, context, cause);
  }

  getUserMessage(): string {
    return `External service error: ${this.message}`;
  }
}

export class InternalError extends BaseError {
  constructor(
    message: string,
    code = 'INTERNAL_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.INTERNAL, ErrorSeverity.CRITICAL, context, cause);
  }

  getUserMessage(): string {
    return 'An internal error occurred. Please try again or contact support.';
  }
}

// Legacy CLIError for backward compatibility
export class CLIError extends BaseError {
  constructor(
    message: string,
    public code?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(
      message,
      code || 'CLI_ERROR',
      ErrorCategory.RUNTIME,
      ErrorSeverity.MEDIUM,
      context,
      cause
    );
  }
}

// Error factory functions
export const createError = {
  validation: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error) =>
    new ValidationError(message, code, context, cause),

  configuration: (
    message: string,
    code?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) => new ConfigurationError(message, code, context, cause),

  network: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error) =>
    new NetworkError(message, code, context, cause),

  database: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error) =>
    new DatabaseError(message, code, context, cause),

  filesystem: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error) =>
    new FilesystemError(message, code, context, cause),

  authentication: (
    message: string,
    code?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) => new AuthenticationError(message, code, context, cause),

  authorization: (
    message: string,
    code?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) => new AuthorizationError(message, code, context, cause),

  external: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error) =>
    new ExternalServiceError(message, code, context, cause),

  internal: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error) =>
    new InternalError(message, code, context, cause),

  cli: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error) =>
    new CLIError(message, code, context, cause),
};

// Error handling utilities
export class ErrorHandler {
  private static logger = logger.module('ErrorHandler');

  /**
   * Handle an error with logging and appropriate actions
   */
  static handle(error: unknown, context?: Record<string, unknown>): BaseError {
    const standardError = this.standardizeError(error);

    if (standardError.shouldLog()) {
      this.logger.error(
        `${standardError.category}: ${standardError.message}`,
        standardError instanceof Error ? standardError : undefined,
        {
          ...context,
          errorCode: standardError.code,
          errorId: standardError.id,
          severity: standardError.severity,
        }
      );
    }

    return standardError;
  }

  /**
   * Handle an error and exit process if necessary
   */
  static handleAndExit(error: unknown, context?: Record<string, unknown>, exitCode = 1): never {
    const standardError = this.handle(error, context);

    if (standardError.shouldTerminate() || process.env.NODE_ENV === 'production') {
      this.logger.error('Terminating process due to critical error', undefined, {
        errorId: standardError.id,
        exitCode,
      });
      process.exit(exitCode);
    }

    process.exit(exitCode);
  }

  /**
   * Convert any error to a standardized error
   */
  static standardizeError(error: unknown): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to categorize based on error name or message
      if (error.name === 'ValidationError' || error.message.includes('validation')) {
        return new ValidationError(
          error.message,
          'VALIDATION_ERROR',
          { originalError: error.name },
          error
        );
      }

      if (error.name === 'TypeError' || error.name === 'ReferenceError') {
        return new InternalError(
          error.message,
          'INTERNAL_TYPE_ERROR',
          { originalError: error.name },
          error
        );
      }

      if (error.message.includes('ENOENT') || error.message.includes('EACCES')) {
        return new FilesystemError(
          error.message,
          'FILE_ERROR',
          { originalError: error.name },
          error
        );
      }

      if (error.message.includes('ECONN') || error.message.includes('fetch')) {
        return new NetworkError(
          error.message,
          'CONNECTION_ERROR',
          { originalError: error.name },
          error
        );
      }

      // Default to CLI error for backward compatibility
      return new CLIError(error.message, 'UNKNOWN_ERROR', { originalError: error.name }, error);
    }

    if (typeof error === 'string') {
      return new CLIError(error, 'STRING_ERROR');
    }

    return new InternalError(`Unknown error: ${String(error)}`, 'UNKNOWN_ERROR_TYPE', {
      originalType: typeof error,
      originalValue: error,
    });
  }

  /**
   * Create an async error handler wrapper
   */
  static asyncHandler<T extends Record<string, unknown>>(
    handler: (options: T) => Promise<void>,
    context?: Record<string, unknown>
  ) {
    return async (options: T): Promise<void> => {
      try {
        await handler(options);
      } catch (error) {
        this.handleAndExit(error, { ...context, ...options });
      }
    };
  }

  /**
   * Create a sync error handler wrapper
   */
  static syncHandler<T extends Record<string, unknown>>(
    handler: (options: T) => void,
    context?: Record<string, unknown>
  ) {
    return (options: T): void => {
      try {
        handler(options);
      } catch (error) {
        this.handleAndExit(error, { ...context, ...options });
      }
    };
  }

  /**
   * Wrap a function to catch and convert errors
   */
  static wrap<T extends any[], R>(
    fn: (...args: T) => R,
    errorConverter?: (error: unknown) => BaseError
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        throw errorConverter ? errorConverter(error) : this.standardizeError(error);
      }
    };
  }

  /**
   * Wrap an async function to catch and convert errors
   */
  static async wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorConverter?: (error: unknown) => BaseError
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        throw errorConverter ? errorConverter(error) : this.standardizeError(error);
      }
    };
  }
}

// Backward compatibility exports
export const handleError = ErrorHandler.handleAndExit.bind(ErrorHandler);
export const createAsyncHandler = ErrorHandler.asyncHandler.bind(ErrorHandler);

// Error context builder
export class ErrorContext {
  private data: Record<string, unknown> = {};

  static create(): ErrorContext {
    return new ErrorContext();
  }

  add(key: string, value: any): this {
    this.data[key] = value;
    return this;
  }

  addMultiple(data: Record<string, unknown>): this {
    this.data = { ...this.data, ...data };
    return this;
  }

  build(): Record<string, unknown> {
    return { ...this.data };
  }
}

// Result type for error handling without exceptions
export type Result<T, E = BaseError> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: E;
    };

export const Result = {
  ok: <T>(data: T): Result<T> => ({ success: true, data }),
  error: <E extends BaseError>(error: E): Result<never, E> => ({ success: false, error }),

  fromAsync: async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
    try {
      const data = await fn();
      return Result.ok(data);
    } catch (error) {
      return Result.error(ErrorHandler.standardizeError(error));
    }
  },

  fromSync: <T>(fn: () => T): Result<T> => {
    try {
      const data = fn();
      return Result.ok(data);
    } catch (error) {
      return Result.error(ErrorHandler.standardizeError(error));
    }
  },

  map: <T, U, E extends BaseError>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> => {
    if (result.success) {
      return Result.ok(fn(result.data));
    }
    return result;
  },

  flatMap: <T, U, E extends BaseError>(
    result: Result<T, E>,
    fn: (data: T) => Result<U, E>
  ): Result<U, E> => {
    if (result.success) {
      return fn(result.data);
    }
    return result;
  },
};

export default ErrorHandler;
