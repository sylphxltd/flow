/**
 * Standard error types for the application
 * Typed errors enable better error handling and recovery
 *
 * DESIGN RATIONALE:
 * - Discriminated union for all error types
 * - Each error type has specific context
 * - Enables type-safe error handling
 * - Clear error categories for recovery strategies
 */

/**
 * Base error type with common fields
 */
export interface BaseError {
  readonly kind: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly cause?: Error;
}

/**
 * Configuration error - invalid configuration or missing required config
 */
export interface ConfigError extends BaseError {
  readonly kind: 'ConfigError';
  readonly configKey?: string;
  readonly configPath?: string;
}

/**
 * File system error - file not found, permission denied, etc.
 */
export interface FileSystemError extends BaseError {
  readonly kind: 'FileSystemError';
  readonly path: string;
  readonly operation: 'read' | 'write' | 'delete' | 'create' | 'stat';
}

/**
 * Database error - query failure, connection error, etc.
 */
export interface DatabaseError extends BaseError {
  readonly kind: 'DatabaseError';
  readonly operation: string;
  readonly table?: string;
}

/**
 * Validation error - input validation failure
 */
export interface ValidationError extends BaseError {
  readonly kind: 'ValidationError';
  readonly field?: string;
  readonly errors: string[];
}

/**
 * Network error - HTTP error, timeout, connection refused, etc.
 */
export interface NetworkError extends BaseError {
  readonly kind: 'NetworkError';
  readonly url?: string;
  readonly statusCode?: number;
}

/**
 * CLI error - command line interface specific errors
 */
export interface CLIError extends BaseError {
  readonly kind: 'CLIError';
  readonly command?: string;
  readonly exitCode?: number;
}

/**
 * Not found error - resource not found
 */
export interface NotFoundError extends BaseError {
  readonly kind: 'NotFoundError';
  readonly resourceType: string;
  readonly resourceId: string;
}

/**
 * Permission error - insufficient permissions
 */
export interface PermissionError extends BaseError {
  readonly kind: 'PermissionError';
  readonly resource: string;
  readonly requiredPermission: string;
}

/**
 * Unknown error - catch-all for unexpected errors
 */
export interface UnknownError extends BaseError {
  readonly kind: 'UnknownError';
}

/**
 * Union of all error types
 */
export type AppError =
  | ConfigError
  | FileSystemError
  | DatabaseError
  | ValidationError
  | NetworkError
  | CLIError
  | NotFoundError
  | PermissionError
  | UnknownError;

/**
 * Error constructors
 */

export const configError = (
  message: string,
  options?: {
    configKey?: string;
    configPath?: string;
    context?: Record<string, unknown>;
    cause?: Error;
  }
): ConfigError => ({
  kind: 'ConfigError',
  message,
  configKey: options?.configKey,
  configPath: options?.configPath,
  context: options?.context,
  cause: options?.cause,
});

export const fileSystemError = (
  message: string,
  path: string,
  operation: 'read' | 'write' | 'delete' | 'create' | 'stat',
  options?: { context?: Record<string, unknown>; cause?: Error }
): FileSystemError => ({
  kind: 'FileSystemError',
  message,
  path,
  operation,
  context: options?.context,
  cause: options?.cause,
});

export const databaseError = (
  message: string,
  operation: string,
  options?: { table?: string; context?: Record<string, unknown>; cause?: Error }
): DatabaseError => ({
  kind: 'DatabaseError',
  message,
  operation,
  table: options?.table,
  context: options?.context,
  cause: options?.cause,
});

export const validationError = (
  message: string,
  errors: string[],
  options?: { field?: string; context?: Record<string, unknown> }
): ValidationError => ({
  kind: 'ValidationError',
  message,
  field: options?.field,
  errors,
  context: options?.context,
});

export const networkError = (
  message: string,
  options?: { url?: string; statusCode?: number; context?: Record<string, unknown>; cause?: Error }
): NetworkError => ({
  kind: 'NetworkError',
  message,
  url: options?.url,
  statusCode: options?.statusCode,
  context: options?.context,
  cause: options?.cause,
});

export const cliError = (
  message: string,
  options?: {
    command?: string;
    exitCode?: number;
    context?: Record<string, unknown>;
    cause?: Error;
  }
): CLIError => ({
  kind: 'CLIError',
  message,
  command: options?.command,
  exitCode: options?.exitCode,
  context: options?.context,
  cause: options?.cause,
});

export const notFoundError = (
  message: string,
  resourceType: string,
  resourceId: string,
  options?: { context?: Record<string, unknown>; cause?: Error }
): NotFoundError => ({
  kind: 'NotFoundError',
  message,
  resourceType,
  resourceId,
  context: options?.context,
  cause: options?.cause,
});

export const permissionError = (
  message: string,
  resource: string,
  requiredPermission: string,
  options?: { context?: Record<string, unknown>; cause?: Error }
): PermissionError => ({
  kind: 'PermissionError',
  message,
  resource,
  requiredPermission,
  context: options?.context,
  cause: options?.cause,
});

export const unknownError = (
  message: string,
  options?: { context?: Record<string, unknown>; cause?: Error }
): UnknownError => ({
  kind: 'UnknownError',
  message,
  context: options?.context,
  cause: options?.cause,
});

/**
 * Convert unknown error to AppError
 */
export const toAppError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return unknownError(error.message, { cause: error });
  }

  return unknownError(String(error));
};

/**
 * Type guard for AppError
 */
export const isAppError = (error: unknown): error is AppError => {
  return typeof error === 'object' && error !== null && 'kind' in error && 'message' in error;
};

/**
 * Format error for display
 */
export const formatError = (error: AppError): string => {
  let formatted = `[${error.kind}] ${error.message}`;

  if (error.kind === 'ConfigError' && error.configKey) {
    formatted += `\n  Config key: ${error.configKey}`;
  }

  if (error.kind === 'FileSystemError') {
    formatted += `\n  Path: ${error.path}`;
    formatted += `\n  Operation: ${error.operation}`;
  }

  if (error.kind === 'DatabaseError') {
    formatted += `\n  Operation: ${error.operation}`;
    if (error.table) {
      formatted += `\n  Table: ${error.table}`;
    }
  }

  if (error.kind === 'ValidationError') {
    formatted += `\n  Errors:`;
    for (const err of error.errors) {
      formatted += `\n    - ${err}`;
    }
  }

  if (error.kind === 'NetworkError') {
    if (error.url) {
      formatted += `\n  URL: ${error.url}`;
    }
    if (error.statusCode) {
      formatted += `\n  Status: ${error.statusCode}`;
    }
  }

  if (error.context) {
    formatted += `\n  Context: ${JSON.stringify(error.context, null, 2)}`;
  }

  if (error.cause) {
    formatted += `\n  Caused by: ${error.cause.message}`;
  }

  return formatted;
};
