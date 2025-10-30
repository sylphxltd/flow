/**
 * Specific error classes for different error types
 */

import { BaseError, ErrorCategory, ErrorSeverity } from './base-error.js';

// Validation errors
export class ValidationError extends BaseError {
  constructor(message: string, code: string = 'VALIDATION_ERROR', context?: Record<string, unknown>) {
    super(message, code, ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM, context);
  }
}

export class RequiredFieldError extends ValidationError {
  constructor(fieldName: string) {
    super(`Required field is missing: ${fieldName}`, 'REQUIRED_FIELD', { fieldName });
  }
}

export class InvalidFormatError extends ValidationError {
  constructor(fieldName: string, expectedFormat: string) {
    super(`Invalid format for ${fieldName}. Expected: ${expectedFormat}`, 'INVALID_FORMAT', {
      fieldName,
      expectedFormat,
    });
  }
}

// Configuration errors
export class ConfigurationError extends BaseError {
  constructor(message: string, code: string = 'CONFIG_ERROR', context?: Record<string, unknown>) {
    super(message, code, ErrorCategory.CONFIGURATION, ErrorSeverity.HIGH, context);
  }
}

export class MissingConfigError extends ConfigurationError {
  constructor(configKey: string) {
    super(`Missing required configuration: ${configKey}`, 'MISSING_CONFIG', { configKey });
  }
}

// Database errors
export class DatabaseError extends BaseError {
  constructor(message: string, code: string = 'DATABASE_ERROR', context?: Record<string, unknown>) {
    super(message, code, ErrorCategory.DATABASE, ErrorSeverity.HIGH, context);
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string = 'Database connection failed') {
    super(message, 'CONNECTION_ERROR');
  }
}

export class QueryError extends DatabaseError {
  constructor(query: string, cause?: Error) {
    super(`Query execution failed: ${query}`, 'QUERY_ERROR', { query }, cause);
  }
}

// Filesystem errors
export class FilesystemError extends BaseError {
  constructor(message: string, code: string = 'FILESYSTEM_ERROR', context?: Record<string, unknown>) {
    super(message, code, ErrorCategory.FILESYSTEM, ErrorSeverity.MEDIUM, context);
  }
}

export class FileNotFoundError extends FilesystemError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath });
  }
}

export class PermissionError extends FilesystemError {
  operation: string;
  resource: string;

  constructor(operation: string, resource: string) {
    super(`Permission denied: ${operation} on ${resource}`, 'PERMISSION_DENIED', {
      operation,
      resource,
    });
    this.operation = operation;
    this.resource = resource;
  }
}

// Network errors
export class NetworkError extends BaseError {
  constructor(message: string, code: string = 'NETWORK_ERROR', context?: Record<string, unknown>) {
    super(message, code, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context);
  }
}

export class TimeoutError extends NetworkError {
  constructor(operation: string, timeout: number) {
    super(`Operation timed out: ${operation} after ${timeout}ms`, 'TIMEOUT_ERROR', {
      operation,
      timeout,
    });
  }
}

// Runtime errors
export class RuntimeError extends BaseError {
  constructor(message: string, code: string = 'RUNTIME_ERROR', context?: Record<string, unknown>) {
    super(message, code, ErrorCategory.RUNTIME, ErrorSeverity.MEDIUM, context);
  }
}

export class NotImplementedError extends RuntimeError {
  constructor(feature: string) {
    super(`Feature not implemented: ${feature}`, 'NOT_IMPLEMENTED', { feature });
  }
}