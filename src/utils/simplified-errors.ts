/**
 * Simplified Error Handling System
 * Reduces complexity from 11+ error types to 3 core types
 */

import { logger } from './logger.js';

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
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  FILESYSTEM = 'FILESYSTEM',
  AUTHENTICATION = 'AUTHENTICATION',
  RUNTIME = 'RUNTIME',
  EXTERNAL = 'EXTERNAL',
  INTERNAL = 'INTERNAL',
}

/**
 * Core error interface
 */
export interface ErrorInfo {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  cause?: Error;
  timestamp: string;
  id: string;
}

/**
 * Simplified Error Class - The main error type for most use cases
 */
export class AppError extends Error implements ErrorInfo {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly id: string;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory = ErrorCategory.RUNTIME,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { cause });
    this.name = 'AppError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.id = this.generateErrorId();

    // Log the error
    this.logError();
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(): void {
    const logLevel = this.getLogLevel();
    logger[logLevel]('AppError occurred', {
      id: this.id,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      stack: this.stack,
    });
  }

  private getLogLevel(): 'error' | 'warn' | 'info' | 'debug' {
    switch (this.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'debug';
    }
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): ErrorInfo {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      cause: this.cause?.message,
      timestamp: this.timestamp,
      id: this.id,
    };
  }

  /**
   * Get user-friendly message
   */
  getUserMessage(): string {
    // For validation errors, be more specific
    if (this.category === ErrorCategory.VALIDATION) {
      return `Validation failed: ${this.message}`;
    }

    // For configuration errors, provide actionable guidance
    if (this.category === ErrorCategory.CONFIGURATION) {
      return `Configuration error: ${this.message}. Please check your settings.`;
    }

    // For database errors, be more generic
    if (this.category === ErrorCategory.DATABASE) {
      return 'Database operation failed. Please try again later.';
    }

    // For network/external errors
    if (this.category === ErrorCategory.NETWORK || this.category === ErrorCategory.EXTERNAL) {
      return 'External service unavailable. Please try again later.';
    }

    // Default message
    return this.message;
  }
}

/**
 * Validation Error - For input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: unknown) {
    const context = field ? { field, value } : undefined;
    super(message, 'VALIDATION_ERROR', ErrorCategory.VALIDATION, ErrorSeverity.LOW, context);
    this.name = 'ValidationError';
  }
}

/**
 * Configuration Error - For configuration issues
 */
export class ConfigurationError extends AppError {
  constructor(message: string, configKey?: string) {
    const context = configKey ? { configKey } : undefined;
    super(message, 'CONFIG_ERROR', ErrorCategory.CONFIGURATION, ErrorSeverity.HIGH, context);
    this.name = 'ConfigurationError';
  }
}

/**
 * Database Error - For database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, query?: string) {
    const context = operation ? { operation, query } : undefined;
    super(message, 'DATABASE_ERROR', ErrorCategory.DATABASE, ErrorSeverity.HIGH, context);
    this.name = 'DatabaseError';
  }
}

/**
 * Network Error - For network-related failures
 */
export class NetworkError extends AppError {
  constructor(message: string, url?: string, statusCode?: number) {
    const context = url ? { url, statusCode } : undefined;
    super(message, 'NETWORK_ERROR', ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context);
    this.name = 'NetworkError';
  }
}

/**
 * Filesystem Error - For file system operations
 */
export class FilesystemError extends AppError {
  constructor(message: string, path?: string, operation?: string) {
    const context = path ? { path, operation } : undefined;
    super(message, 'FILESYSTEM_ERROR', ErrorCategory.FILESYSTEM, ErrorSeverity.MEDIUM, context);
    this.name = 'FilesystemError';
  }
}

/**
 * Authentication Error - For auth failures
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR', ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error factory for convenient error creation
 */
export class ErrorFactory {
  /**
   * Create validation error
   */
  static validation(message: string, field?: string, value?: unknown): ValidationError {
    return new ValidationError(message, field, value);
  }

  /**
   * Create configuration error
   */
  static configuration(message: string, configKey?: string): ConfigurationError {
    return new ConfigurationError(message, configKey);
  }

  /**
   * Create database error
   */
  static database(message: string, operation?: string, query?: string): DatabaseError {
    return new DatabaseError(message, operation, query);
  }

  /**
   * Create network error
   */
  static network(message: string, url?: string, statusCode?: number): NetworkError {
    return new NetworkError(message, url, statusCode);
  }

  /**
   * Create filesystem error
   */
  static filesystem(message: string, path?: string, operation?: string): FilesystemError {
    return new FilesystemError(message, path, operation);
  }

  /**
   * Create authentication error
   */
  static authentication(message?: string): AuthenticationError {
    return new AuthenticationError(message);
  }

  /**
   * Create generic app error
   */
  static app(
    message: string,
    code: string,
    category: ErrorCategory = ErrorCategory.RUNTIME,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>
  ): AppError {
    return new AppError(message, code, category, severity, context);
  }

  /**
   * Create error from unknown error type
   */
  static fromUnknown(error: unknown, defaultMessage = 'Unknown error occurred'): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        'UNKNOWN_ERROR',
        ErrorCategory.INTERNAL,
        ErrorSeverity.MEDIUM,
        { originalError: error.name },
        error
      );
    }

    if (typeof error === 'string') {
      return new AppError(error, 'STRING_ERROR', ErrorCategory.INTERNAL, ErrorSeverity.LOW);
    }

    return new AppError(
      defaultMessage,
      'UNKNOWN_ERROR',
      ErrorCategory.INTERNAL,
      ErrorSeverity.MEDIUM,
      { originalError: error }
    );
  }
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
  /**
   * Handle error and convert to user-friendly response
   */
  static handle(error: unknown): { message: string; code: string; severity: ErrorSeverity } {
    const appError = ErrorFactory.fromUnknown(error);

    return {
      message: appError.getUserMessage(),
      code: appError.code,
      severity: appError.severity,
    };
  }

  /**
   * Execute operation with error handling
   */
  static async execute<T>(
    operation: () => Promise<T>,
    errorContext?: Record<string, unknown>
  ): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      const appError = ErrorFactory.fromUnknown(error);

      // Add context if provided
      if (errorContext) {
        appError.context = { ...appError.context, ...errorContext };
      }

      return { success: false, error: appError };
    }
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: Error): boolean {
    if (error instanceof AppError) {
      return error.severity !== ErrorSeverity.CRITICAL;
    }
    return true; // Assume unknown errors are recoverable
  }

  /**
   * Get retry delay for error
   */
  static getRetryDelay(error: Error, attempt: number): number {
    if (error instanceof AppError) {
      switch (error.category) {
        case ErrorCategory.NETWORK:
        case ErrorCategory.EXTERNAL:
          return Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff
        case ErrorCategory.DATABASE:
          return Math.min(500 * Math.pow(2, attempt), 5000);
        default:
          return 1000;
      }
    }
    return 1000;
  }
}

/**
 * Convenience functions
 */
export const createValidationError = (message: string, field?: string, value?: unknown) =>
  ErrorFactory.validation(message, field, value);

export const createConfigurationError = (message: string, configKey?: string) =>
  ErrorFactory.configuration(message, configKey);

export const createDatabaseError = (message: string, operation?: string, query?: string) =>
  ErrorFactory.database(message, operation, query);

export const createNetworkError = (message: string, url?: string, statusCode?: number) =>
  ErrorFactory.network(message, url, statusCode);

export const createFilesystemError = (message: string, path?: string, operation?: string) =>
  ErrorFactory.filesystem(message, path, operation);

export const createAuthenticationError = (message?: string) => ErrorFactory.authentication(message);

export const createError = (
  message: string,
  code: string,
  category: ErrorCategory = ErrorCategory.RUNTIME,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: Record<string, unknown>
) => ErrorFactory.app(message, code, category, severity, context);

// Legacy exports for backward compatibility
export { AppError as BaseError };
export type { ErrorInfo };
