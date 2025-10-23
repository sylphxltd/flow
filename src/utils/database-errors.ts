/**
 * Custom error classes for database operations
 * Provides better error handling and debugging capabilities
 */

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DatabaseError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      operation: this.operation,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

export class MigrationError extends DatabaseError {
  constructor(
    message: string,
    public readonly migrationName?: string,
    cause?: Error
  ) {
    super(message, 'migration', cause, { migrationName });
    this.name = 'MigrationError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: any,
    cause?: Error
  ) {
    super(message, 'validation', cause, { field, value });
    this.name = 'ValidationError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(
    message: string,
    public readonly connectionDetails?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 'connection', cause, connectionDetails);
    this.name = 'ConnectionError';
  }
}

/**
 * Utility function to wrap database operations with consistent error handling
 */
export async function executeOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DatabaseError) {
      // Re-throw existing database errors
      throw error;
    }

    // Wrap other errors in DatabaseError
    throw new DatabaseError(
      `Database operation failed: ${operation}`,
      operation,
      error as Error,
      context
    );
  }
}

/**
 * Type guard to check if an error is a specific database error type
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

export function isMigrationError(error: unknown): error is MigrationError {
  return error instanceof MigrationError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isConnectionError(error: unknown): error is ConnectionError {
  return error instanceof ConnectionError;
}
