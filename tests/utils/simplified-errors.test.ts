/**
 * Simplified Errors Tests
 * Comprehensive tests for error handling system
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  ValidationError,
  ConfigurationError,
  DatabaseError,
  NetworkError,
  FilesystemError,
  AuthenticationError,
  ErrorFactory,
  ErrorHandler,
  ErrorSeverity,
  ErrorCategory,
  createValidationError,
  createConfigurationError,
  createDatabaseError,
  createNetworkError,
  createFilesystemError,
  createAuthenticationError,
  createError,
  BaseError,
} from '../../src/utils/simplified-errors.js';

describe('Simplified Errors', () => {
  describe('AppError', () => {
    it('should create basic error with defaults', () => {
      const error = new AppError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.category).toBe(ErrorCategory.RUNTIME);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.name).toBe('AppError');
      expect(error.id).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(error.timestamp).toBeDefined();
    });

    it('should create error with all parameters', () => {
      const context = { userId: '123' };
      const cause = new Error('Original error');

      const error = new AppError(
        'Test error',
        'TEST_CODE',
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH,
        context,
        cause
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.category).toBe(ErrorCategory.DATABASE);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.context).toEqual(context);
      expect(error.cause).toBe(cause);
    });

    it('should generate unique error IDs', () => {
      const error1 = new AppError('Test 1', 'CODE1');
      const error2 = new AppError('Test 2', 'CODE2');

      expect(error1.id).not.toBe(error2.id);
    });

    it('should serialize to JSON correctly', () => {
      const context = { field: 'email' };
      const cause = new Error('Cause message');
      const error = new AppError(
        'Test error',
        'TEST_CODE',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        context,
        cause
      );

      const json = error.toJSON();

      expect(json.code).toBe('TEST_CODE');
      expect(json.message).toBe('Test error');
      expect(json.category).toBe(ErrorCategory.VALIDATION);
      expect(json.severity).toBe(ErrorSeverity.LOW);
      expect(json.context).toEqual(context);
      expect(json.cause).toBe('Cause message');
      expect(json.timestamp).toBeDefined();
      expect(json.id).toBe(error.id);
    });

    it('should handle toJSON without cause', () => {
      const error = new AppError('Test error', 'TEST_CODE');
      const json = error.toJSON();

      expect(json.cause).toBeUndefined();
    });

    describe('getUserMessage', () => {
      it('should return validation-specific message', () => {
        const error = new AppError(
          'Invalid email format',
          'VAL_ERROR',
          ErrorCategory.VALIDATION
        );

        expect(error.getUserMessage()).toBe('Validation failed: Invalid email format');
      });

      it('should return configuration-specific message', () => {
        const error = new AppError(
          'Missing API key',
          'CONFIG_ERROR',
          ErrorCategory.CONFIGURATION
        );

        expect(error.getUserMessage()).toBe('Configuration error: Missing API key. Please check your settings.');
      });

      it('should return database-specific message', () => {
        const error = new AppError(
          'Connection failed',
          'DB_ERROR',
          ErrorCategory.DATABASE
        );

        expect(error.getUserMessage()).toBe('Database operation failed. Please try again later.');
      });

      it('should return network-specific message', () => {
        const error = new AppError(
          'Connection timeout',
          'NET_ERROR',
          ErrorCategory.NETWORK
        );

        expect(error.getUserMessage()).toBe('External service unavailable. Please try again later.');
      });

      it('should return external-specific message', () => {
        const error = new AppError(
          'API error',
          'EXT_ERROR',
          ErrorCategory.EXTERNAL
        );

        expect(error.getUserMessage()).toBe('External service unavailable. Please try again later.');
      });

      it('should return default message for other categories', () => {
        const error = new AppError(
          'Runtime error',
          'RUN_ERROR',
          ErrorCategory.RUNTIME
        );

        expect(error.getUserMessage()).toBe('Runtime error');
      });
    });
  });

  describe('ValidationError', () => {
    it('should create validation error without field', () => {
      const error = new ValidationError('Invalid input');

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.context).toBeUndefined();
    });

    it('should create validation error with field', () => {
      const error = new ValidationError('Invalid email', 'email');

      expect(error.context).toEqual({ field: 'email', value: undefined });
    });

    it('should create validation error with field and value', () => {
      const error = new ValidationError('Invalid email', 'email', 'test@');

      expect(error.context).toEqual({ field: 'email', value: 'test@' });
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error without config key', () => {
      const error = new ConfigurationError('Missing config');

      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Missing config');
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.category).toBe(ErrorCategory.CONFIGURATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.context).toBeUndefined();
    });

    it('should create configuration error with config key', () => {
      const error = new ConfigurationError('Invalid API key', 'API_KEY');

      expect(error.context).toEqual({ configKey: 'API_KEY' });
    });
  });

  describe('DatabaseError', () => {
    it('should create database error without details', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.name).toBe('DatabaseError');
      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.category).toBe(ErrorCategory.DATABASE);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.context).toBeUndefined();
    });

    it('should create database error with operation', () => {
      const error = new DatabaseError('Query failed', 'SELECT');

      expect(error.context).toEqual({ operation: 'SELECT', query: undefined });
    });

    it('should create database error with operation and query', () => {
      const error = new DatabaseError('Query failed', 'SELECT', 'SELECT * FROM users');

      expect(error.context).toEqual({
        operation: 'SELECT',
        query: 'SELECT * FROM users'
      });
    });
  });

  describe('NetworkError', () => {
    it('should create network error without details', () => {
      const error = new NetworkError('Connection timeout');

      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Connection timeout');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.context).toBeUndefined();
    });

    it('should create network error with URL', () => {
      const error = new NetworkError('Timeout', 'https://api.example.com');

      expect(error.context).toEqual({
        url: 'https://api.example.com',
        statusCode: undefined
      });
    });

    it('should create network error with URL and status code', () => {
      const error = new NetworkError('Not found', 'https://api.example.com', 404);

      expect(error.context).toEqual({
        url: 'https://api.example.com',
        statusCode: 404
      });
    });
  });

  describe('FilesystemError', () => {
    it('should create filesystem error without details', () => {
      const error = new FilesystemError('File not found');

      expect(error.name).toBe('FilesystemError');
      expect(error.message).toBe('File not found');
      expect(error.code).toBe('FILESYSTEM_ERROR');
      expect(error.category).toBe(ErrorCategory.FILESYSTEM);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.context).toBeUndefined();
    });

    it('should create filesystem error with path', () => {
      const error = new FilesystemError('Access denied', '/tmp/file.txt');

      expect(error.context).toEqual({
        path: '/tmp/file.txt',
        operation: undefined
      });
    });

    it('should create filesystem error with path and operation', () => {
      const error = new FilesystemError('Failed', '/tmp/file.txt', 'READ');

      expect(error.context).toEqual({
        path: '/tmp/file.txt',
        operation: 'READ'
      });
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with default message', () => {
      const error = new AuthenticationError();

      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Authentication failed');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should create authentication error with custom message', () => {
      const error = new AuthenticationError('Invalid token');

      expect(error.message).toBe('Invalid token');
    });
  });

  describe('ErrorFactory', () => {
    it('should create validation error', () => {
      const error = ErrorFactory.validation('Invalid', 'field', 'value');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid');
    });

    it('should create configuration error', () => {
      const error = ErrorFactory.configuration('Missing config', 'KEY');

      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe('Missing config');
    });

    it('should create database error', () => {
      const error = ErrorFactory.database('Query failed', 'SELECT', 'SELECT *');

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Query failed');
    });

    it('should create network error', () => {
      const error = ErrorFactory.network('Timeout', 'https://api.com', 500);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Timeout');
    });

    it('should create filesystem error', () => {
      const error = ErrorFactory.filesystem('Not found', '/path', 'READ');

      expect(error).toBeInstanceOf(FilesystemError);
      expect(error.message).toBe('Not found');
    });

    it('should create authentication error', () => {
      const error = ErrorFactory.authentication('Invalid token');

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Invalid token');
    });

    it('should create generic app error', () => {
      const error = ErrorFactory.app(
        'Test error',
        'TEST_CODE',
        ErrorCategory.RUNTIME,
        ErrorSeverity.HIGH,
        { key: 'value' }
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
    });

    describe('fromUnknown', () => {
      it('should return AppError as-is', () => {
        const original = new AppError('Test', 'CODE');
        const result = ErrorFactory.fromUnknown(original);

        expect(result).toBe(original);
      });

      it('should convert standard Error to AppError', () => {
        const original = new Error('Test error');
        const result = ErrorFactory.fromUnknown(original);

        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe('Test error');
        expect(result.code).toBe('UNKNOWN_ERROR');
        expect(result.category).toBe(ErrorCategory.INTERNAL);
        expect(result.severity).toBe(ErrorSeverity.MEDIUM);
        expect(result.context).toEqual({ originalError: 'Error' });
        expect(result.cause).toBe(original);
      });

      it('should convert string to AppError', () => {
        const result = ErrorFactory.fromUnknown('String error');

        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe('String error');
        expect(result.code).toBe('STRING_ERROR');
        expect(result.category).toBe(ErrorCategory.INTERNAL);
        expect(result.severity).toBe(ErrorSeverity.LOW);
      });

      it('should convert unknown type to AppError with default message', () => {
        const result = ErrorFactory.fromUnknown({ custom: 'object' });

        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe('Unknown error occurred');
        expect(result.code).toBe('UNKNOWN_ERROR');
        expect(result.category).toBe(ErrorCategory.INTERNAL);
        expect(result.severity).toBe(ErrorSeverity.MEDIUM);
        expect(result.context).toEqual({ originalError: { custom: 'object' } });
      });

      it('should use custom default message', () => {
        const result = ErrorFactory.fromUnknown(null, 'Custom default');

        expect(result.message).toBe('Custom default');
      });
    });
  });

  describe('ErrorHandler', () => {
    describe('handle', () => {
      it('should handle AppError', () => {
        const error = new AppError('Test', 'CODE', ErrorCategory.VALIDATION, ErrorSeverity.LOW);
        const result = ErrorHandler.handle(error);

        expect(result.message).toBe('Validation failed: Test');
        expect(result.code).toBe('CODE');
        expect(result.severity).toBe(ErrorSeverity.LOW);
      });

      it('should handle standard Error', () => {
        const error = new Error('Test error');
        const result = ErrorHandler.handle(error);

        expect(result.message).toBe('Test error');
        expect(result.code).toBe('UNKNOWN_ERROR');
        expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      });

      it('should handle string error', () => {
        const result = ErrorHandler.handle('String error');

        expect(result.message).toBe('String error');
        expect(result.code).toBe('STRING_ERROR');
      });

      it('should handle unknown error', () => {
        const result = ErrorHandler.handle({ custom: 'error' });

        expect(result.message).toBe('Unknown error occurred');
        expect(result.code).toBe('UNKNOWN_ERROR');
      });
    });

    describe('execute', () => {
      it('should return success for successful operation', async () => {
        const operation = async () => 'success';
        const result = await ErrorHandler.execute(operation);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('success');
        }
      });

      it('should return error for failed operation', async () => {
        const operation = async () => {
          throw new Error('Operation failed');
        };
        const result = await ErrorHandler.execute(operation);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(AppError);
          expect(result.error.message).toBe('Operation failed');
        }
      });

      it('should add error context', async () => {
        const operation = async () => {
          throw new Error('Failed');
        };
        const context = { userId: '123', action: 'test' };
        const result = await ErrorHandler.execute(operation, context);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.context).toMatchObject(context);
        }
      });

      it('should preserve AppError context', async () => {
        const operation = async () => {
          throw new AppError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.MEDIUM, { original: 'context' });
        };
        const additionalContext = { added: 'context' };
        const result = await ErrorHandler.execute(operation, additionalContext);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.context).toMatchObject({
            original: 'context',
            added: 'context'
          });
        }
      });
    });

    describe('isRecoverable', () => {
      it('should return false for CRITICAL severity', () => {
        const error = new AppError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.CRITICAL);

        expect(ErrorHandler.isRecoverable(error)).toBe(false);
      });

      it('should return true for HIGH severity', () => {
        const error = new AppError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.HIGH);

        expect(ErrorHandler.isRecoverable(error)).toBe(true);
      });

      it('should return true for MEDIUM severity', () => {
        const error = new AppError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.MEDIUM);

        expect(ErrorHandler.isRecoverable(error)).toBe(true);
      });

      it('should return true for LOW severity', () => {
        const error = new AppError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.LOW);

        expect(ErrorHandler.isRecoverable(error)).toBe(true);
      });

      it('should return true for non-AppError', () => {
        const error = new Error('Standard error');

        expect(ErrorHandler.isRecoverable(error)).toBe(true);
      });
    });

    describe('getRetryDelay', () => {
      it('should return exponential backoff for NETWORK errors', () => {
        const error = new AppError('Test', 'CODE', ErrorCategory.NETWORK);

        expect(ErrorHandler.getRetryDelay(error, 0)).toBe(1000);
        expect(ErrorHandler.getRetryDelay(error, 1)).toBe(2000);
        expect(ErrorHandler.getRetryDelay(error, 2)).toBe(4000);
        expect(ErrorHandler.getRetryDelay(error, 3)).toBe(8000);
        expect(ErrorHandler.getRetryDelay(error, 10)).toBe(30000); // Capped at 30s
      });

      it('should return exponential backoff for EXTERNAL errors', () => {
        const error = new AppError('Test', 'CODE', ErrorCategory.EXTERNAL);

        expect(ErrorHandler.getRetryDelay(error, 0)).toBe(1000);
        expect(ErrorHandler.getRetryDelay(error, 1)).toBe(2000);
      });

      it('should return faster backoff for DATABASE errors', () => {
        const error = new AppError('Test', 'CODE', ErrorCategory.DATABASE);

        expect(ErrorHandler.getRetryDelay(error, 0)).toBe(500);
        expect(ErrorHandler.getRetryDelay(error, 1)).toBe(1000);
        expect(ErrorHandler.getRetryDelay(error, 2)).toBe(2000);
        expect(ErrorHandler.getRetryDelay(error, 10)).toBe(5000); // Capped at 5s
      });

      it('should return default delay for other categories', () => {
        const error = new AppError('Test', 'CODE', ErrorCategory.RUNTIME);

        expect(ErrorHandler.getRetryDelay(error, 0)).toBe(1000);
        expect(ErrorHandler.getRetryDelay(error, 5)).toBe(1000);
      });

      it('should return default delay for non-AppError', () => {
        const error = new Error('Standard error');

        expect(ErrorHandler.getRetryDelay(error, 0)).toBe(1000);
      });
    });
  });

  describe('Convenience Functions', () => {
    it('should create validation error', () => {
      const error = createValidationError('Invalid', 'field', 'value');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid');
    });

    it('should create configuration error', () => {
      const error = createConfigurationError('Missing', 'KEY');

      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe('Missing');
    });

    it('should create database error', () => {
      const error = createDatabaseError('Failed', 'SELECT', 'query');

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Failed');
    });

    it('should create network error', () => {
      const error = createNetworkError('Timeout', 'url', 500);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Timeout');
    });

    it('should create filesystem error', () => {
      const error = createFilesystemError('Not found', 'path', 'READ');

      expect(error).toBeInstanceOf(FilesystemError);
      expect(error.message).toBe('Not found');
    });

    it('should create authentication error', () => {
      const error = createAuthenticationError('Invalid');

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Invalid');
    });

    it('should create generic error', () => {
      const error = createError(
        'Test',
        'CODE',
        ErrorCategory.RUNTIME,
        ErrorSeverity.HIGH,
        { key: 'value' }
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test');
    });
  });

  describe('Legacy Exports', () => {
    it('should export BaseError as alias for AppError', () => {
      expect(BaseError).toBe(AppError);
    });
  });

  describe('Error Enums', () => {
    it('should have all ErrorSeverity values', () => {
      expect(ErrorSeverity.LOW).toBe('LOW');
      expect(ErrorSeverity.MEDIUM).toBe('MEDIUM');
      expect(ErrorSeverity.HIGH).toBe('HIGH');
      expect(ErrorSeverity.CRITICAL).toBe('CRITICAL');
    });

    it('should have all ErrorCategory values', () => {
      expect(ErrorCategory.VALIDATION).toBe('VALIDATION');
      expect(ErrorCategory.CONFIGURATION).toBe('CONFIGURATION');
      expect(ErrorCategory.DATABASE).toBe('DATABASE');
      expect(ErrorCategory.NETWORK).toBe('NETWORK');
      expect(ErrorCategory.FILESYSTEM).toBe('FILESYSTEM');
      expect(ErrorCategory.AUTHENTICATION).toBe('AUTHENTICATION');
      expect(ErrorCategory.RUNTIME).toBe('RUNTIME');
      expect(ErrorCategory.EXTERNAL).toBe('EXTERNAL');
      expect(ErrorCategory.INTERNAL).toBe('INTERNAL');
    });
  });
});
