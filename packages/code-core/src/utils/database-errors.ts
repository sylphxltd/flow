/**
 * Database Error Handling - Simplified System
 * Replaces complex error hierarchy with simplified database-specific errors
 */

import {
  AppError,
  createDatabaseError,
  createValidationError,
  ErrorCategory,
  ErrorHandler,
  ErrorSeverity,
  DatabaseError as SimplifiedDatabaseError,
  ValidationError as SimplifiedValidationError,
} from './simplified-errors.js';

/**
 * Simplified Database Error with additional database context
 */
export class DatabaseError extends SimplifiedDatabaseError {
  constructor(
    message: string,
    operation?: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, operation, context?.query as string);
    this.cause = cause;
    if (context) {
      this.context = { ...this.context, ...context };
    }
  }
}

/**
 * Database-specific validation error
 */
export class ValidationError extends SimplifiedValidationError {
  constructor(message: string, field: string, value?: unknown, cause?: Error) {
    super(message, field, value);
    this.cause = cause;
  }
}

/**
 * Database connection error
 */
export class ConnectionError extends AppError {
  constructor(message: string, connectionDetails?: Record<string, unknown>, cause?: Error) {
    super(
      message,
      'CONNECTION_ERROR',
      ErrorCategory.NETWORK,
      ErrorSeverity.HIGH,
      connectionDetails,
      cause
    );
    this.name = 'ConnectionError';
  }
}

/**
 * Database migration error
 */
export class MigrationError extends AppError {
  public readonly migrationName?: string;

  constructor(message: string, migrationName?: string, cause?: Error) {
    super(
      message,
      'MIGRATION_ERROR',
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      { migrationName },
      cause
    );
    this.migrationName = migrationName;
    this.name = 'MigrationError';
  }
}

/**
 * Execute database operation with comprehensive error handling
 */
export async function executeOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const result = await ErrorHandler.execute(fn, { operation, ...context });

  if (result.success) {
    return result.data;
  }

  // Convert to appropriate database error type
  if (result.error instanceof AppError) {
    throw result.error;
  }

  // Unknown error - wrap in DatabaseError
  throw createDatabaseError(result.error.message, operation, context?.query as string);
}

/**
 * Type guard functions for database errors
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isConnectionError(error: unknown): error is ConnectionError {
  return error instanceof ConnectionError;
}

export function isMigrationError(error: unknown): error is MigrationError {
  return error instanceof MigrationError;
}

/**
 * Convenience functions for creating database errors
 */
export const createMigrationError = (
  message: string,
  migrationName?: string,
  cause?: Error
): MigrationError => new MigrationError(message, migrationName, cause);

export const createConnectionError = (
  message: string,
  connectionDetails?: Record<string, unknown>,
  cause?: Error
): ConnectionError => new ConnectionError(message, connectionDetails, cause);

// Re-export for backward compatibility
export { createDatabaseError, createValidationError, ErrorHandler, AppError };
