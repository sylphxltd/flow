/**
 * Error handling module exports
 */

// Base error types
export { BaseError, ErrorCategory, ErrorSeverity } from './base-error.js';

// Specific error classes
export {
  ValidationError,
  RequiredFieldError,
  InvalidFormatError,
  ConfigurationError,
  MissingConfigError,
  DatabaseError,
  ConnectionError,
  QueryError,
  FilesystemError,
  FileNotFoundError,
  PermissionError,
  NetworkError,
  TimeoutError,
  RuntimeError,
  NotImplementedError,
} from './specific-errors.js';

// Error handling utilities
export { ErrorHandler, setupGlobalErrorHandlers } from './error-handlers.js';