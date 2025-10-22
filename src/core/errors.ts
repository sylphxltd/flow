import { Effect, Layer, Context } from 'effect';

// ============================================================================
// BASE ERROR CLASSES
// ============================================================================

/**
 * Base error class for all application errors
 */
export abstract class AppError extends Error {
  abstract readonly _tag: string;

  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      _tag: this._tag,
      name: this.name,
      message: this.message,
      cause: this.cause?.message,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Check if this is a recoverable error
   */
  isRecoverable(): boolean {
    return false;
  }
}

// ============================================================================
// DOMAIN-SPECIFIC ERRORS
// ============================================================================

/**
 * Memory service errors
 */
export class MemoryError extends AppError {
  readonly _tag = 'MemoryError';

  constructor(
    message: string,
    cause?: Error,
    public readonly operation?: string,
    public readonly key?: string,
    public readonly namespace?: string
  ) {
    super(message, cause, { operation, key, namespace });
  }

  getUserMessage(): string {
    if (this.operation === 'get' && this.key) {
      return `Memory entry '${this.key}' not found`;
    }
    if (this.operation === 'set' && this.key) {
      return `Failed to store memory entry '${this.key}'`;
    }
    return super.getUserMessage();
  }

  isRecoverable(): boolean {
    return this.operation === 'get' || this.operation === 'list';
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends AppError {
  readonly _tag = 'ConfigError';

  constructor(
    message: string,
    cause?: Error,
    public readonly path?: string,
    public readonly field?: string
  ) {
    super(message, cause, { path, field });
  }

  getUserMessage(): string {
    if (this.field) {
      return `Invalid configuration for field '${this.field}'`;
    }
    if (this.path) {
      return `Failed to load configuration from '${this.path}'`;
    }
    return 'Configuration error occurred';
  }

  isRecoverable(): boolean {
    return false;
  }
}

/**
 * MCP service errors
 */
export class McpError extends AppError {
  readonly _tag = 'McpError';

  constructor(
    message: string,
    cause?: Error,
    public readonly serverId?: string,
    public readonly operation?: string
  ) {
    super(message, cause, { serverId, operation });
  }

  getUserMessage(): string {
    if (this.serverId && this.operation) {
      return `Failed to ${this.operation} MCP server '${this.serverId}'`;
    }
    if (this.serverId) {
      return `MCP server '${this.serverId}' error`;
    }
    return 'MCP service error occurred';
  }

  isRecoverable(): boolean {
    return this.operation === 'start' || this.operation === 'restart';
  }
}

/**
 * Terminal/UI errors
 */
export class TerminalError extends AppError {
  readonly _tag = 'TerminalError';

  constructor(
    message: string,
    cause?: Error,
    public readonly operation?: string
  ) {
    super(message, cause, { operation });
  }

  getUserMessage(): string {
    return `Display error: ${this.message}`;
  }

  isRecoverable(): boolean {
    return true;
  }
}

/**
 * Network/IO errors
 */
export class NetworkError extends AppError {
  readonly _tag = 'NetworkError';

  constructor(
    message: string,
    cause?: Error,
    public readonly url?: string,
    public readonly method?: string
  ) {
    super(message, cause, { url, method });
  }

  getUserMessage(): string {
    if (this.url) {
      return `Network error accessing '${this.url}'`;
    }
    return 'Network connection error';
  }

  isRecoverable(): boolean {
    return true;
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  readonly _tag = 'ValidationError';

  constructor(
    message: string,
    cause?: Error,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message, cause, { field, value });
  }

  getUserMessage(): string {
    if (this.field) {
      return `Invalid value for '${this.field}': ${this.message}`;
    }
    return `Validation error: ${this.message}`;
  }

  isRecoverable(): boolean {
    return true;
  }
}

/**
 * Permission errors
 */
export class PermissionError extends AppError {
  readonly _tag = 'PermissionError';

  constructor(
    message: string,
    cause?: Error,
    public readonly resource?: string,
    public readonly action?: string
  ) {
    super(message, cause, { resource, action });
  }

  getUserMessage(): string {
    if (this.resource && this.action) {
      return `Permission denied: Cannot ${this.action} '${this.resource}'`;
    }
    return 'Permission denied';
  }

  isRecoverable(): boolean {
    return false;
  }
}

// ============================================================================
// ERROR HANDLING SERVICES
// ============================================================================

/**
 * Error handling service interface
 */
export interface ErrorService {
  readonly handle: (error: AppError) => Effect.Effect<void, never, never>;
  readonly log: (error: AppError, level: LogLevel) => Effect.Effect<void, never, never>;
  readonly report: (error: AppError) => Effect.Effect<void, never, never>;
  readonly recover: (error: AppError) => Effect.Effect<boolean, never, never>;
}

/**
 * Error service tag
 */
export const ErrorService = Context.GenericTag<ErrorService>('ErrorService');

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Create a tagged error with context
 */
export const createError = <T extends AppError>(
  ErrorClass: new (message: string, cause?: Error, ...args: any[]) => T,
  message: string,
  cause?: Error,
  ...args: any[]
): T => {
  return new ErrorClass(message, cause, ...args);
};

/**
 * Wrap errors in a specific error type
 */
export const wrapError = <T extends AppError>(
  ErrorClass: new (message: string, cause?: Error, ...args: any[]) => T,
  error: unknown,
  message?: string,
  ...args: any[]
): T => {
  if (error instanceof AppError) {
    return error as T;
  }

  if (error instanceof Error) {
    return new ErrorClass(message || error.message, error, ...args);
  }

  return new ErrorClass(message || String(error), undefined, ...args);
};

/**
 * Check if error is of specific type
 */
export const isErrorType = <T extends AppError>(
  error: unknown,
  ErrorClass: new (...args: any[]) => T
): error is T => {
  return error instanceof ErrorClass;
};

/**
 * Get error tag for pattern matching
 */
export const getErrorTag = (error: unknown): string => {
  if (error instanceof AppError) {
    return error._tag;
  }
  if (error instanceof Error) {
    return error.constructor.name;
  }
  return 'UnknownError';
};

/**
 * Match on error types
 */
export const matchError = <A>(
  error: unknown,
  cases: Partial<Record<string, (error: AppError) => A>>,
  defaultValue: A
): A => {
  const tag = getErrorTag(error);

  if (error instanceof AppError && cases[tag]) {
    return cases[tag]!(error);
  }

  return defaultValue;
};

// ============================================================================
// ERROR RECOVERY STRATEGIES
// ============================================================================

/**
 * Retry strategy for recoverable errors
 */
export const retryStrategy = {
  /**
   * Default retry configuration
   */
  default: {
    times: 3,
    delay: 1000,
    backoff: 'exponential' as const,
  },

  /**
   * Aggressive retry for network errors
   */
  aggressive: {
    times: 5,
    delay: 500,
    backoff: 'exponential' as const,
  },

  /**
   * Conservative retry for critical operations
   */
  conservative: {
    times: 2,
    delay: 2000,
    backoff: 'linear' as const,
  },
};

/**
 * Check if error should be retried
 */
export const shouldRetry = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return error.isRecoverable();
  }

  // Retry network errors by default
  if (error instanceof Error) {
    return (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT')
    );
  }

  return false;
};

// ============================================================================
// ERROR LAYER
// ============================================================================

/**
 * Live error service implementation
 */
export const ErrorServiceLive = Layer.effect(
  ErrorService,
  Effect.succeed(
    ErrorService.of({
      handle: (error) =>
        Effect.gen(function* () {
          // Log the error
          yield* Effect.sync(() => {
            const logData = error.toJSON();
            const logMessage = `[ERROR] ${error._tag}: ${error.message}`;
            console.error(logMessage, logData);
          });

          // Report if critical
          if (!error.isRecoverable()) {
            yield* Effect.sync(() => {
              console.error('CRITICAL ERROR REPORT:', error.toJSON());
            });
          }
        }),

      log: (error, level) =>
        Effect.sync(() => {
          const logData = error.toJSON();
          const logMessage = `[${level.toUpperCase()}] ${error._tag}: ${error.message}`;

          switch (level) {
            case 'debug':
              console.debug(logMessage, logData);
              break;
            case 'info':
              console.info(logMessage, logData);
              break;
            case 'warn':
              console.warn(logMessage, logData);
              break;
            case 'error':
              console.error(logMessage, logData);
              break;
          }
        }),

      report: (error) =>
        Effect.sync(() => {
          // TODO: Implement error reporting (e.g., to external service)
          console.error('CRITICAL ERROR REPORT:', error.toJSON());
        }),

      recover: (error) =>
        Effect.sync(() => {
          return shouldRetry(error);
        }),
    })
  )
);
