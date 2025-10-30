/**
 * Comprehensive Error Handling System
 * Provides standardized error types, handlers, and utilities
 *
 * DESIGN PRINCIPLES:
 * - Explicit error types for better error handling
 * - Severity-based classification
 * - Context capture for debugging
 * - User-friendly messages
 * - Functional error handling with Result type
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Error categories for classification
 */
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

/**
 * Base error class with common functionality
 */
export class BaseError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
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
    this.name = 'BaseError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.id = this.generateErrorId();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  private generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${this.code}-${timestamp}-${random}`;
  }

  /**
   * Convert to JSON for serialization
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
   * Get user-friendly message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Check if error should be logged
   */
  shouldLog(): boolean {
    return this.severity !== ErrorSeverity.LOW;
  }

  /**
   * Check if error should terminate the process
   */
  shouldTerminate(): boolean {
    return this.severity === ErrorSeverity.CRITICAL;
  }
}

/**
 * Validation Error - For input validation failures
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    code: string = 'VALIDATION_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.VALIDATION, ErrorSeverity.LOW, context, cause);
    this.name = 'ValidationError';
  }

  getUserMessage(): string {
    return `Validation error: ${this.message}`;
  }
}

/**
 * Configuration Error - For configuration issues
 */
export class ConfigurationError extends BaseError {
  constructor(
    message: string,
    code: string = 'CONFIG_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.CONFIGURATION, ErrorSeverity.HIGH, context, cause);
    this.name = 'ConfigurationError';
  }

  getUserMessage(): string {
    return `Configuration error: ${this.message}`;
  }
}

/**
 * Network Error - For network-related failures
 */
export class NetworkError extends BaseError {
  constructor(
    message: string,
    code: string = 'NETWORK_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context, cause);
    this.name = 'NetworkError';
  }

  getUserMessage(): string {
    return `Network error: ${this.message}`;
  }
}

/**
 * Database Error - For database operation failures
 */
export class DatabaseError extends BaseError {
  constructor(
    message: string,
    code: string = 'DATABASE_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.DATABASE, ErrorSeverity.HIGH, context, cause);
    this.name = 'DatabaseError';
  }

  getUserMessage(): string {
    return `Database error: ${this.message}`;
  }
}

/**
 * Filesystem Error - For file system operations
 */
export class FilesystemError extends BaseError {
  constructor(
    message: string,
    code: string = 'FILESYSTEM_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.FILESYSTEM, ErrorSeverity.MEDIUM, context, cause);
    this.name = 'FilesystemError';
  }

  getUserMessage(): string {
    return `File system error: ${this.message}`;
  }
}

/**
 * Authentication Error - For auth failures
 */
export class AuthenticationError extends BaseError {
  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, context, cause);
    this.name = 'AuthenticationError';
  }

  getUserMessage(): string {
    return `Authentication error: ${this.message}`;
  }
}

/**
 * Authorization Error - For permission failures
 */
export class AuthorizationError extends BaseError {
  constructor(
    message: string,
    code: string = 'AUTHZ_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH, context, cause);
    this.name = 'AuthorizationError';
  }

  getUserMessage(): string {
    return `Authorization error: ${this.message}`;
  }
}

/**
 * External Service Error - For third-party service failures
 */
export class ExternalServiceError extends BaseError {
  constructor(
    message: string,
    code: string = 'EXTERNAL_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.EXTERNAL, ErrorSeverity.MEDIUM, context, cause);
    this.name = 'ExternalServiceError';
  }

  getUserMessage(): string {
    return `External service error: ${this.message}`;
  }
}

/**
 * Internal Error - For internal system errors
 */
export class InternalError extends BaseError {
  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.INTERNAL, ErrorSeverity.CRITICAL, context, cause);
    this.name = 'InternalError';
  }

  getUserMessage(): string {
    return 'An internal error occurred. Please try again or contact support.';
  }
}

/**
 * CLI Error - For command line interface specific errors
 */
export class CLIError extends BaseError {
  public readonly code: string | undefined;

  constructor(
    message: string,
    code?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code || 'CLI_ERROR', ErrorCategory.RUNTIME, ErrorSeverity.MEDIUM, context, cause);
    this.name = 'CLIError';
    this.code = code;
  }

  getUserMessage(): string {
    return this.message;
  }
}

/**
 * Error factory for convenient error creation
 */
export const createError = {
  validation: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error): ValidationError => {
    return new ValidationError(message, code, context, cause);
  },

  configuration: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error): ConfigurationError => {
    return new ConfigurationError(message, code, context, cause);
  },

  network: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error): NetworkError => {
    return new NetworkError(message, code, context, cause);
  },

  database: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error): DatabaseError => {
    return new DatabaseError(message, code, context, cause);
  },

  filesystem: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error): FilesystemError => {
    return new FilesystemError(message, code, context, cause);
  },

  authentication: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error): AuthenticationError => {
    return new AuthenticationError(message, code, context, cause);
  },

  authorization: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error): AuthorizationError => {
    return new AuthorizationError(message, code, context, cause);
  },

  external: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error): ExternalServiceError => {
    return new ExternalServiceError(message, code, context, cause);
  },

  internal: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error): InternalError => {
    return new InternalError(message, code, context, cause);
  },

  cli: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error): CLIError => {
    return new CLIError(message, code, context, cause);
  },
};

/**
 * Error Context builder for composing error context
 */
export class ErrorContext {
  private context: Record<string, unknown> = {};

  private constructor() {}

  static create(): ErrorContext {
    return new ErrorContext();
  }

  add(key: string, value: unknown): ErrorContext {
    this.context[key] = value;
    return this;
  }

  addMultiple(context: Record<string, unknown>): ErrorContext {
    this.context = { ...this.context, ...context };
    return this;
  }

  build(): Record<string, unknown> {
    return this.context;
  }
}

/**
 * Error Handler utility class
 */
export class ErrorHandler {
  /**
   * Handle error and convert to standardized error
   */
  static handle(error: unknown, context?: Record<string, unknown>): BaseError {
    const standardized = this.standardizeError(error);
    return standardized;
  }

  /**
   * Handle error and exit process
   */
  static handleAndExit(error: unknown, context?: Record<string, unknown>, exitCode: number = 1): never {
    const standardized = this.handle(error, context);
    process.exit(exitCode);
  }

  /**
   * Standardize any error to BaseError
   */
  static standardizeError(error: unknown): BaseError {
    // Already a BaseError
    if (error instanceof BaseError) {
      return error;
    }

    // Standard Error object
    if (error instanceof Error) {
      const message = error.message;

      // TypeError or ReferenceError -> InternalError
      if (error instanceof TypeError || error instanceof ReferenceError) {
        return new InternalError(message, 'INTERNAL_TYPE_ERROR', { originalError: error.name }, error);
      }

      // Check message patterns for categorization
      const lowerMessage = message.toLowerCase();

      // Validation errors
      if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
        return new ValidationError(message, 'VALIDATION_ERROR', { originalError: error.name }, error);
      }

      // Filesystem errors
      if (lowerMessage.includes('enoent') || lowerMessage.includes('eacces') ||
          lowerMessage.includes('file') || lowerMessage.includes('directory')) {
        return new FilesystemError(message, 'FILE_ERROR', { originalError: error.name }, error);
      }

      // Network errors
      if (lowerMessage.includes('econnrefused') || lowerMessage.includes('etimedout') ||
          lowerMessage.includes('fetch') || lowerMessage.includes('network') ||
          lowerMessage.includes('connection')) {
        return new NetworkError(message, 'CONNECTION_ERROR', { originalError: error.name }, error);
      }

      // Database errors
      if (lowerMessage.includes('database') || lowerMessage.includes('query') ||
          lowerMessage.includes('sql')) {
        return new DatabaseError(message, 'DATABASE_ERROR', { originalError: error.name }, error);
      }

      // Default to CLIError for generic errors
      return new CLIError(message, undefined, { originalError: error.name }, error);
    }

    // String errors
    if (typeof error === 'string') {
      return new CLIError(error, 'STRING_ERROR');
    }

    // Unknown error types
    return new InternalError(
      `Unknown error: ${String(error)}`,
      'UNKNOWN_ERROR_TYPE',
      { originalType: typeof error, originalValue: error }
    );
  }

  /**
   * Create async handler that catches errors
   */
  static asyncHandler<T extends any[]>(
    handler: (...args: T) => Promise<void>,
    context?: Record<string, unknown>
  ): (...args: T) => Promise<void> {
    return async (...args: T): Promise<void> => {
      try {
        await handler(...args);
      } catch (error) {
        this.handleAndExit(error, context);
      }
    };
  }

  /**
   * Create sync handler that catches errors
   */
  static syncHandler<T extends any[]>(
    handler: (...args: T) => void,
    context?: Record<string, unknown>
  ): (...args: T) => void {
    return (...args: T): void => {
      try {
        handler(...args);
      } catch (error) {
        this.handleAndExit(error, context);
      }
    };
  }

  /**
   * Wrap function and convert errors
   */
  static wrap<T extends any[], R>(
    fn: (...args: T) => R,
    errorConverter?: (error: unknown) => BaseError
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        const convertedError = errorConverter
          ? errorConverter(error)
          : this.standardizeError(error);
        throw convertedError;
      }
    };
  }

  /**
   * Wrap async function and convert errors
   */
  static async wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorConverter?: (error: unknown) => BaseError
  ): Promise<(...args: T) => Promise<R>> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        const convertedError = errorConverter
          ? errorConverter(error)
          : this.standardizeError(error);
        throw convertedError;
      }
    };
  }
}

/**
 * Result type for functional error handling
 */
export type Result<T, E extends BaseError = BaseError> =
  | { success: true; data: T }
  | { success: false; error: E };

export const Result = {
  /**
   * Create success result
   */
  ok<T>(data: T): Result<T, never> {
    return { success: true, data };
  },

  /**
   * Create error result
   */
  error<E extends BaseError>(error: E): Result<never, E> {
    return { success: false, error };
  },

  /**
   * Create result from async function
   */
  async fromAsync<T>(fn: () => Promise<T>): Promise<Result<T, BaseError>> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      const standardized = ErrorHandler.standardizeError(error);
      return { success: false, error: standardized };
    }
  },

  /**
   * Create result from sync function
   */
  fromSync<T>(fn: () => T): Result<T, BaseError> {
    try {
      const data = fn();
      return { success: true, data };
    } catch (error) {
      const standardized = ErrorHandler.standardizeError(error);
      return { success: false, error: standardized };
    }
  },

  /**
   * Map result data
   */
  map<T, U, E extends BaseError>(
    result: Result<T, E>,
    fn: (data: T) => U
  ): Result<U, E> {
    if (result.success) {
      return { success: true, data: fn(result.data) };
    }
    return result;
  },

  /**
   * FlatMap result data
   */
  flatMap<T, U, E extends BaseError>(
    result: Result<T, E>,
    fn: (data: T) => Result<U, E>
  ): Result<U, E> {
    if (result.success) {
      return fn(result.data);
    }
    return result;
  },
};

/**
 * Legacy exports for backward compatibility
 */
export const handleError = ErrorHandler.handleAndExit.bind(ErrorHandler);
export const createAsyncHandler = ErrorHandler.asyncHandler.bind(ErrorHandler);
