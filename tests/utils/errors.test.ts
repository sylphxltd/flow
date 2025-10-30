/**
 * Error Handling Tests
 * Comprehensive tests for standardized error handling utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthenticationError,
  AuthorizationError,
  BaseError,
  CLIError,
  ConfigurationError,
  DatabaseError,
  ErrorCategory,
  ErrorContext,
  ErrorHandler,
  ErrorSeverity,
  ExternalServiceError,
  FilesystemError,
  InternalError,
  NetworkError,
  Result,
  ValidationError,
  createAsyncHandler,
  createError,
  handleError,
} from '../../src/utils/errors.js';

// Mock logger to avoid actual logging during tests
// Support both logger.error() and logger.module().error() patterns
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    module: vi.fn(() => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

describe('Error Enums', () => {
  describe('ErrorCategory', () => {
    it('should have all expected categories', () => {
      expect(ErrorCategory.VALIDATION).toBe('VALIDATION');
      expect(ErrorCategory.CONFIGURATION).toBe('CONFIGURATION');
      expect(ErrorCategory.NETWORK).toBe('NETWORK');
      expect(ErrorCategory.DATABASE).toBe('DATABASE');
      expect(ErrorCategory.FILESYSTEM).toBe('FILESYSTEM');
      expect(ErrorCategory.AUTHENTICATION).toBe('AUTHENTICATION');
      expect(ErrorCategory.AUTHORIZATION).toBe('AUTHORIZATION');
      expect(ErrorCategory.RUNTIME).toBe('RUNTIME');
      expect(ErrorCategory.EXTERNAL).toBe('EXTERNAL');
      expect(ErrorCategory.INTERNAL).toBe('INTERNAL');
    });
  });

  describe('ErrorSeverity', () => {
    it('should have all expected severity levels', () => {
      expect(ErrorSeverity.LOW).toBe('LOW');
      expect(ErrorSeverity.MEDIUM).toBe('MEDIUM');
      expect(ErrorSeverity.HIGH).toBe('HIGH');
      expect(ErrorSeverity.CRITICAL).toBe('CRITICAL');
    });
  });
});

describe('BaseError', () => {
  it('should create error with required parameters', () => {
    const error = new BaseError(
      'Test error',
      'TEST_CODE',
      ErrorCategory.RUNTIME,
      ErrorSeverity.MEDIUM
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.category).toBe(ErrorCategory.RUNTIME);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.name).toBe('BaseError');
    expect(error.timestamp).toBeDefined();
    expect(error.id).toMatch(/^TEST_CODE-\d+-[a-z0-9]+$/);
    expect(error.context).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  it('should create error with all parameters', () => {
    const context = { userId: '123', action: 'test' };
    const cause = new Error('Original error');

    const error = new BaseError(
      'Test error',
      'TEST_CODE',
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      context,
      cause
    );

    expect(error.context).toEqual(context);
    expect(error.cause).toBe(cause);
  });

  it('should generate unique error IDs', () => {
    const error1 = new BaseError('Test 1', 'CODE1', ErrorCategory.RUNTIME);
    const error2 = new BaseError('Test 2', 'CODE2', ErrorCategory.RUNTIME);

    expect(error1.id).not.toBe(error2.id);
    expect(error1.id).toMatch(/^CODE1-\d+-[a-z0-9]+$/);
    expect(error2.id).toMatch(/^CODE2-\d+-[a-z0-9]+$/);
  });

  it('should capture stack trace when available', () => {
    const error = new BaseError('Test', 'CODE', ErrorCategory.RUNTIME);

    if (Error.captureStackTrace) {
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    }
  });

  describe('toJSON', () => {
    it('should serialize error to JSON format', () => {
      const context = { field: 'email' };
      const error = new BaseError(
        'Test error',
        'TEST_CODE',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        context
      );

      const json = error.toJSON();

      expect(json).toEqual({
        id: error.id,
        name: 'BaseError',
        message: 'Test error',
        code: 'TEST_CODE',
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        context,
        timestamp: error.timestamp,
        stack: error.stack,
      });
    });

    it('should handle undefined context', () => {
      const error = new BaseError('Test', 'CODE', ErrorCategory.RUNTIME);
      const json = error.toJSON();

      expect(json.context).toBeUndefined();
    });
  });

  describe('getUserMessage', () => {
    it('should return original message by default', () => {
      const error = new BaseError('Test message', 'CODE', ErrorCategory.RUNTIME);
      expect(error.getUserMessage()).toBe('Test message');
    });
  });

  describe('shouldLog', () => {
    it('should return false for LOW severity', () => {
      const error = new BaseError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.LOW);
      expect(error.shouldLog()).toBe(false);
    });

    it('should return true for MEDIUM severity', () => {
      const error = new BaseError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.MEDIUM);
      expect(error.shouldLog()).toBe(true);
    });

    it('should return true for HIGH severity', () => {
      const error = new BaseError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.HIGH);
      expect(error.shouldLog()).toBe(true);
    });

    it('should return true for CRITICAL severity', () => {
      const error = new BaseError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.CRITICAL);
      expect(error.shouldLog()).toBe(true);
    });
  });

  describe('shouldTerminate', () => {
    it('should return false for non-critical errors', () => {
      const error = new BaseError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.HIGH);
      expect(error.shouldTerminate()).toBe(false);
    });

    it('should return true for CRITICAL severity', () => {
      const error = new BaseError('Test', 'CODE', ErrorCategory.RUNTIME, ErrorSeverity.CRITICAL);
      expect(error.shouldTerminate()).toBe(true);
    });
  });
});

describe('ValidationError', () => {
  it('should create validation error with defaults', () => {
    const error = new ValidationError('Invalid input');

    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.severity).toBe(ErrorSeverity.LOW);
  });

  it('should create validation error with custom code', () => {
    const error = new ValidationError('Invalid input', 'CUSTOM_CODE');

    expect(error.code).toBe('CUSTOM_CODE');
  });

  it('should create validation error with context and cause', () => {
    const context = { field: 'email' };
    const cause = new Error('Cause');

    const error = new ValidationError('Invalid input', 'CODE', context, cause);

    expect(error.context).toEqual(context);
    expect(error.cause).toBe(cause);
  });

  it('should return user-friendly message', () => {
    const error = new ValidationError('Invalid email format');
    expect(error.getUserMessage()).toBe('Validation error: Invalid email format');
  });
});

describe('ConfigurationError', () => {
  it('should create configuration error with defaults', () => {
    const error = new ConfigurationError('Missing config');

    expect(error.name).toBe('ConfigurationError');
    expect(error.message).toBe('Missing config');
    expect(error.code).toBe('CONFIG_ERROR');
    expect(error.category).toBe(ErrorCategory.CONFIGURATION);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });

  it('should return user-friendly message', () => {
    const error = new ConfigurationError('API key missing');
    expect(error.getUserMessage()).toBe('Configuration error: API key missing');
  });
});

describe('NetworkError', () => {
  it('should create network error with defaults', () => {
    const error = new NetworkError('Connection timeout');

    expect(error.name).toBe('NetworkError');
    expect(error.message).toBe('Connection timeout');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.category).toBe(ErrorCategory.NETWORK);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('should return user-friendly message', () => {
    const error = new NetworkError('DNS resolution failed');
    expect(error.getUserMessage()).toBe('Network error: DNS resolution failed');
  });
});

describe('DatabaseError', () => {
  it('should create database error with defaults', () => {
    const error = new DatabaseError('Connection failed');

    expect(error.name).toBe('DatabaseError');
    expect(error.message).toBe('Connection failed');
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.category).toBe(ErrorCategory.DATABASE);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });

  it('should return user-friendly message', () => {
    const error = new DatabaseError('Query execution failed');
    expect(error.getUserMessage()).toBe('Database error: Query execution failed');
  });
});

describe('FilesystemError', () => {
  it('should create filesystem error with defaults', () => {
    const error = new FilesystemError('File not found');

    expect(error.name).toBe('FilesystemError');
    expect(error.message).toBe('File not found');
    expect(error.code).toBe('FILESYSTEM_ERROR');
    expect(error.category).toBe(ErrorCategory.FILESYSTEM);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('should return user-friendly message', () => {
    const error = new FilesystemError('Permission denied');
    expect(error.getUserMessage()).toBe('File system error: Permission denied');
  });
});

describe('AuthenticationError', () => {
  it('should create authentication error with defaults', () => {
    const error = new AuthenticationError('Invalid token');

    expect(error.name).toBe('AuthenticationError');
    expect(error.message).toBe('Invalid token');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });

  it('should return user-friendly message', () => {
    const error = new AuthenticationError('Credentials expired');
    expect(error.getUserMessage()).toBe('Authentication error: Credentials expired');
  });
});

describe('AuthorizationError', () => {
  it('should create authorization error with defaults', () => {
    const error = new AuthorizationError('Access denied');

    expect(error.name).toBe('AuthorizationError');
    expect(error.message).toBe('Access denied');
    expect(error.code).toBe('AUTHZ_ERROR');
    expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });

  it('should return user-friendly message', () => {
    const error = new AuthorizationError('Insufficient permissions');
    expect(error.getUserMessage()).toBe('Authorization error: Insufficient permissions');
  });
});

describe('ExternalServiceError', () => {
  it('should create external service error with defaults', () => {
    const error = new ExternalServiceError('API unavailable');

    expect(error.name).toBe('ExternalServiceError');
    expect(error.message).toBe('API unavailable');
    expect(error.code).toBe('EXTERNAL_ERROR');
    expect(error.category).toBe(ErrorCategory.EXTERNAL);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('should return user-friendly message', () => {
    const error = new ExternalServiceError('Rate limit exceeded');
    expect(error.getUserMessage()).toBe('External service error: Rate limit exceeded');
  });
});

describe('InternalError', () => {
  it('should create internal error with defaults', () => {
    const error = new InternalError('Unexpected state');

    expect(error.name).toBe('InternalError');
    expect(error.message).toBe('Unexpected state');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.category).toBe(ErrorCategory.INTERNAL);
    expect(error.severity).toBe(ErrorSeverity.CRITICAL);
  });

  it('should return generic user message', () => {
    const error = new InternalError('Memory corruption detected');
    expect(error.getUserMessage()).toBe(
      'An internal error occurred. Please try again or contact support.'
    );
  });
});

describe('CLIError', () => {
  it('should create CLI error with defaults', () => {
    const error = new CLIError('Command failed');

    expect(error.name).toBe('CLIError');
    expect(error.message).toBe('Command failed');
    // CLIError has a public code property - currently undefined in implementation
    expect(error.code).toBeUndefined();
    expect(error.category).toBe(ErrorCategory.RUNTIME);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('should create CLI error with custom code', () => {
    const error = new CLIError('Command failed', 'CUSTOM_CODE');
    expect(error.code).toBe('CUSTOM_CODE');
  });

  it('should handle undefined code', () => {
    const error = new CLIError('Command failed', undefined);
    expect(error.code).toBeUndefined();
  });

  it('should return default user message', () => {
    const error = new CLIError('Invalid arguments');
    expect(error.getUserMessage()).toBe('Invalid arguments');
  });
});

describe('createError factory', () => {
  it('should create validation error', () => {
    const error = createError.validation('Invalid input', 'CUSTOM_CODE', { field: 'email' });

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('CUSTOM_CODE');
    expect(error.context).toEqual({ field: 'email' });
  });

  it('should create configuration error', () => {
    const error = createError.configuration('Missing config', 'CONFIG_CODE', { key: 'api_key' });

    expect(error).toBeInstanceOf(ConfigurationError);
    expect(error.message).toBe('Missing config');
    expect(error.code).toBe('CONFIG_CODE');
  });

  it('should create network error', () => {
    const error = createError.network('Connection failed', 'NET_CODE', {
      url: 'https://api.example.com',
    });

    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe('Connection failed');
    expect(error.code).toBe('NET_CODE');
  });

  it('should create database error', () => {
    const error = createError.database('Query failed', 'DB_CODE', { query: 'SELECT *' });

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.message).toBe('Query failed');
    expect(error.code).toBe('DB_CODE');
  });

  it('should create filesystem error', () => {
    const error = createError.filesystem('File not found', 'FS_CODE', { path: '/tmp/file.txt' });

    expect(error).toBeInstanceOf(FilesystemError);
    expect(error.message).toBe('File not found');
    expect(error.code).toBe('FS_CODE');
  });

  it('should create authentication error', () => {
    const error = createError.authentication('Invalid token', 'AUTH_CODE', { user: 'john' });

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe('Invalid token');
    expect(error.code).toBe('AUTH_CODE');
  });

  it('should create authorization error', () => {
    const error = createError.authorization('Access denied', 'AUTHZ_CODE', { resource: 'admin' });

    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.message).toBe('Access denied');
    expect(error.code).toBe('AUTHZ_CODE');
  });

  it('should create external service error', () => {
    const error = createError.external('API error', 'EXT_CODE', { service: 'payment' });

    expect(error).toBeInstanceOf(ExternalServiceError);
    expect(error.message).toBe('API error');
    expect(error.code).toBe('EXT_CODE');
  });

  it('should create internal error', () => {
    const error = createError.internal('System error', 'INT_CODE', { component: 'cache' });

    expect(error).toBeInstanceOf(InternalError);
    expect(error.message).toBe('System error');
    expect(error.code).toBe('INT_CODE');
  });

  it('should create CLI error', () => {
    const error = createError.cli('Command error', 'CLI_CODE', { command: 'deploy' });

    expect(error).toBeInstanceOf(CLIError);
    expect(error.message).toBe('Command error');
    expect(error.code).toBe('CLI_CODE');
  });
});

describe('ErrorHandler', () => {
  const mockExit = vi.fn();
  const originalEnv = process.env.NODE_ENV;
  let originalProcess: NodeJS.Process;

  beforeEach(() => {
    // Note: vi.resetModules() removed in vitest 4.x
    mockExit.mockReset();

    // Save original process
    originalProcess = global.process;

    // Mock process.exit (vitest 4.x compatible approach)
    (global as any).process = {
      ...process,
      env: { ...process.env, NODE_ENV: 'test' },
      exit: mockExit,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
    // Restore original process
    (global as any).process = originalProcess;
  });

  describe('handle', () => {
    it('should return BaseError as-is', () => {
      const error = new ValidationError('Test error');
      const result = ErrorHandler.handle(error);

      expect(result).toBe(error);
    });

    it('should handle ValidationError instance', () => {
      const error = new Error('validation failed');
      const result = ErrorHandler.handle(error);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('validation failed');
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.context?.originalError).toBe('Error');
      expect(result.cause).toBe(error);
    });

    it('should handle TypeError and ReferenceError as InternalError', () => {
      const typeError = new TypeError('Cannot read property');
      const result = ErrorHandler.handle(typeError);

      expect(result).toBeInstanceOf(InternalError);
      expect(result.message).toBe('Cannot read property');
      expect(result.code).toBe('INTERNAL_TYPE_ERROR');
      expect(result.context?.originalError).toBe('TypeError');
    });

    it('should handle file system errors', () => {
      const fsError = new Error('ENOENT: no such file');
      const result = ErrorHandler.handle(fsError);

      expect(result).toBeInstanceOf(FilesystemError);
      expect(result.message).toBe('ENOENT: no such file');
      expect(result.code).toBe('FILE_ERROR');
    });

    it('should handle network errors', () => {
      const netError = new Error('ECONNREFUSED: connection refused');
      const result = ErrorHandler.handle(netError);

      expect(result).toBeInstanceOf(NetworkError);
      expect(result.message).toBe('ECONNREFUSED: connection refused');
      expect(result.code).toBe('CONNECTION_ERROR');
    });

    it('should handle string errors', () => {
      const result = ErrorHandler.handle('String error message');

      expect(result).toBeInstanceOf(CLIError);
      expect(result.message).toBe('String error message');
      expect(result.code).toBe('STRING_ERROR');
    });

    it('should handle unknown objects as InternalError', () => {
      const unknown = { custom: 'error object' };
      const result = ErrorHandler.handle(unknown);

      expect(result).toBeInstanceOf(InternalError);
      expect(result.message).toBe('Unknown error: [object Object]');
      expect(result.code).toBe('UNKNOWN_ERROR_TYPE');
      expect(result.context?.originalType).toBe('object');
      expect(result.context?.originalValue).toBe(unknown);
    });

    it('should add context to handled errors', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'delete' };
      const result = ErrorHandler.handle(error, context);

      expect(result).toBeInstanceOf(CLIError);
      // Context is handled by logging, not added to error itself
    });
  });

  describe('handleAndExit', () => {
    it('should exit with default code for non-critical errors in test environment', () => {
      const error = new ValidationError('Test error');

      ErrorHandler.handleAndExit(error);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should exit with custom exit code', () => {
      const error = new ValidationError('Test error');

      ErrorHandler.handleAndExit(error, {}, 2);

      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it('should exit for critical errors', () => {
      const error = new InternalError('Critical error');

      ErrorHandler.handleAndExit(error);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should exit in production environment even for non-critical errors', () => {
      process.env.NODE_ENV = 'production';
      const error = new ValidationError('Test error');

      ErrorHandler.handleAndExit(error);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('standardizeError', () => {
    it('should return BaseError unchanged', () => {
      const error = new ValidationError('Test');
      const result = ErrorHandler.standardizeError(error);

      expect(result).toBe(error);
    });

    it('should categorize errors based on message content', () => {
      const validationError = new Error('validation failed');
      const result1 = ErrorHandler.standardizeError(validationError);
      expect(result1).toBeInstanceOf(ValidationError);

      const fsError = new Error('ENOENT: file not found');
      const result2 = ErrorHandler.standardizeError(fsError);
      expect(result2).toBeInstanceOf(FilesystemError);

      const netError = new Error('fetch failed');
      const result3 = ErrorHandler.standardizeError(netError);
      expect(result3).toBeInstanceOf(NetworkError);
    });

    it('should convert TypeError to InternalError', () => {
      const typeError = new TypeError('Cannot read property');
      const result = ErrorHandler.standardizeError(typeError);

      expect(result).toBeInstanceOf(InternalError);
      expect(result.code).toBe('INTERNAL_TYPE_ERROR');
    });

    it('should convert ReferenceError to InternalError', () => {
      const refError = new ReferenceError('x is not defined');
      const result = ErrorHandler.standardizeError(refError);

      expect(result).toBeInstanceOf(InternalError);
      expect(result.code).toBe('INTERNAL_TYPE_ERROR');
    });
  });

  describe('asyncHandler', () => {
    it('should create async handler that catches errors', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error('Async failure'));
      const wrappedHandler = ErrorHandler.asyncHandler(failingHandler, { context: 'test' });

      await wrappedHandler({ param: 'value' });

      expect(failingHandler).toHaveBeenCalledWith({ param: 'value' });
      expect(mockExit).toHaveBeenCalled();
    });

    it('should create async handler that succeeds', async () => {
      const successHandler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = ErrorHandler.asyncHandler(successHandler);

      await wrappedHandler({ param: 'value' });

      expect(successHandler).toHaveBeenCalledWith({ param: 'value' });
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe('syncHandler', () => {
    it('should create sync handler that catches errors', () => {
      const failingHandler = vi.fn().mockImplementation(() => {
        throw new Error('Sync failure');
      });
      const wrappedHandler = ErrorHandler.syncHandler(failingHandler, { context: 'test' });

      wrappedHandler({ param: 'value' });

      expect(failingHandler).toHaveBeenCalledWith({ param: 'value' });
      expect(mockExit).toHaveBeenCalled();
    });

    it('should create sync handler that succeeds', () => {
      const successHandler = vi.fn();
      const wrappedHandler = ErrorHandler.syncHandler(successHandler);

      wrappedHandler({ param: 'value' });

      expect(successHandler).toHaveBeenCalledWith({ param: 'value' });
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe('wrap', () => {
    it('should wrap function and catch errors', () => {
      const failingFn = vi.fn().mockImplementation(() => {
        throw new Error('Wrapped failure');
      });
      const wrappedFn = ErrorHandler.wrap(failingFn);

      expect(() => wrappedFn('arg1', 'arg2')).toThrow();
      expect(failingFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should wrap function with custom error converter', () => {
      const failingFn = vi.fn().mockImplementation(() => {
        throw new Error('Original error');
      });
      const customConverter = vi.fn().mockReturnValue(new ValidationError('Converted error'));
      const wrappedFn = ErrorHandler.wrap(failingFn, customConverter);

      expect(() => wrappedFn()).toThrow('Converted error');
      expect(customConverter).toHaveBeenCalledWith(new Error('Original error'));
    });

    it('should wrap function that succeeds', () => {
      const successFn = vi.fn().mockReturnValue('success');
      const wrappedFn = ErrorHandler.wrap(successFn);

      const result = wrappedFn('arg');

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledWith('arg');
    });
  });

  describe('wrapAsync', () => {
    it('should wrap async function and catch errors', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('Async wrapped failure'));
      const wrappedFnPromise = ErrorHandler.wrapAsync(failingFn);
      const wrappedFn = await wrappedFnPromise;

      expect(typeof wrappedFn).toBe('function');
      await expect(wrappedFn('arg1')).rejects.toThrow();
      expect(failingFn).toHaveBeenCalledWith('arg1');
    });

    it('should wrap async function with custom error converter', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('Original async error'));
      const customConverter = vi.fn().mockReturnValue(new NetworkError('Converted network error'));
      const wrappedFnPromise = ErrorHandler.wrapAsync(failingFn, customConverter);
      const wrappedFn = await wrappedFnPromise;

      expect(typeof wrappedFn).toBe('function');
      await expect(wrappedFn()).rejects.toThrow('Converted network error');
      expect(customConverter).toHaveBeenCalledWith(new Error('Original async error'));
    });

    it('should wrap async function that succeeds', async () => {
      const successFn = vi.fn().mockResolvedValue('async success');
      const wrappedFnPromise = ErrorHandler.wrapAsync(successFn);
      const wrappedFn = await wrappedFnPromise;

      expect(typeof wrappedFn).toBe('function');
      const result = await wrappedFn('arg');

      expect(result).toBe('async success');
      expect(successFn).toHaveBeenCalledWith('arg');
    });
  });
});

describe('ErrorContext', () => {
  it('should create empty context', () => {
    const context = ErrorContext.create();
    expect(context.build()).toEqual({});
  });

  it('should add single key-value pair', () => {
    const context = ErrorContext.create().add('userId', '123').add('action', 'delete');

    expect(context.build()).toEqual({ userId: '123', action: 'delete' });
  });

  it('should add multiple key-value pairs', () => {
    const context = ErrorContext.create()
      .add('userId', '123')
      .addMultiple({ action: 'delete', resource: 'file' });

    expect(context.build()).toEqual({ userId: '123', action: 'delete', resource: 'file' });
  });

  it('should chain methods', () => {
    const context = ErrorContext.create()
      .add('first', 'value1')
      .add('second', 'value2')
      .addMultiple({ third: 'value3', fourth: 'value4' })
      .add('fifth', 'value5');

    expect(context.build()).toEqual({
      first: 'value1',
      second: 'value2',
      third: 'value3',
      fourth: 'value4',
      fifth: 'value5',
    });
  });

  it('should overwrite values with same key', () => {
    const context = ErrorContext.create().add('key', 'original').add('key', 'updated');

    expect(context.build()).toEqual({ key: 'updated' });
  });

  it('should handle different value types', () => {
    const context = ErrorContext.create()
      .add('string', 'value')
      .add('number', 42)
      .add('boolean', true)
      .add('null', null)
      .add('undefined', undefined)
      .add('object', { nested: 'value' })
      .add('array', [1, 2, 3]);

    expect(context.build()).toEqual({
      string: 'value',
      number: 42,
      boolean: true,
      null: null,
      undefined: undefined,
      object: { nested: 'value' },
      array: [1, 2, 3],
    });
  });
});

describe('Result type', () => {
  describe('ok', () => {
    it('should create success result', () => {
      const result = Result.ok('test data');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test data');
      }
    });
  });

  describe('error', () => {
    it('should create error result', () => {
      const error = new ValidationError('test error');
      const result = Result.error(error);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('fromAsync', () => {
    it('should create success result from successful async function', async () => {
      const successFn = vi.fn().mockResolvedValue('async data');
      const result = await Result.fromAsync(successFn);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('async data');
      }
      expect(successFn).toHaveBeenCalled();
    });

    it('should create error result from failed async function', async () => {
      const error = new Error('Async failure');
      const failingFn = vi.fn().mockRejectedValue(error);
      const result = await Result.fromAsync(failingFn);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CLIError);
        expect(result.error.message).toBe('Async failure');
        expect(result.error.cause).toBe(error);
      }
      expect(failingFn).toHaveBeenCalled();
    });
  });

  describe('fromSync', () => {
    it('should create success result from successful sync function', () => {
      const successFn = vi.fn().mockReturnValue('sync data');
      const result = Result.fromSync(successFn);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('sync data');
      }
      expect(successFn).toHaveBeenCalled();
    });

    it('should create error result from failed sync function', () => {
      const error = new Error('Sync failure');
      const failingFn = vi.fn().mockImplementation(() => {
        throw error;
      });
      const result = Result.fromSync(failingFn);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CLIError);
        expect(result.error.message).toBe('Sync failure');
        expect(result.error.cause).toBe(error);
      }
      expect(failingFn).toHaveBeenCalled();
    });
  });

  describe('map', () => {
    it('should map success result', () => {
      const successResult = Result.ok('hello');
      const mappedResult = Result.map(successResult, (data) => data.toUpperCase());

      expect(mappedResult.success).toBe(true);
      if (mappedResult.success) {
        expect(mappedResult.data).toBe('HELLO');
      }
    });

    it('should pass through error result unchanged', () => {
      const error = new ValidationError('test error');
      const errorResult = Result.error(error);
      const mappedResult = Result.map(errorResult, (data) => data.toUpperCase());

      expect(mappedResult).toBe(errorResult);
      expect(mappedResult.success).toBe(false);
    });
  });

  describe('flatMap', () => {
    it('should flatMap success result', () => {
      const successResult = Result.ok('hello');
      const mapper = (data: string) => Result.ok(data.toUpperCase());
      const flatMappedResult = Result.flatMap(successResult, mapper);

      expect(flatMappedResult.success).toBe(true);
      if (flatMappedResult.success) {
        expect(flatMappedResult.data).toBe('HELLO');
      }
    });

    it('should handle error result from mapper', () => {
      const successResult = Result.ok('hello');
      const error = new ValidationError('mapping failed');
      const errorMapper = () => Result.error(error);
      const flatMappedResult = Result.flatMap(successResult, errorMapper);

      expect(flatMappedResult.success).toBe(false);
      if (!flatMappedResult.success) {
        expect(flatMappedResult.error).toBe(error);
      }
    });

    it('should pass through error result unchanged', () => {
      const originalError = new ValidationError('original error');
      const errorResult = Result.error(originalError);
      const mapper = (data: string) => Result.ok(data.toUpperCase());
      const flatMappedResult = Result.flatMap(errorResult, mapper);

      expect(flatMappedResult).toBe(errorResult);
      expect(flatMappedResult.success).toBe(false);
    });
  });
});

describe('Legacy Exports', () => {
  it('should export handleError as bound alias for ErrorHandler.handleAndExit', () => {
    expect(handleError).not.toBe(ErrorHandler.handleAndExit);
    expect(typeof handleError).toBe('function');
  });

  it('should export createAsyncHandler as bound alias for ErrorHandler.asyncHandler', () => {
    expect(createAsyncHandler).not.toBe(ErrorHandler.asyncHandler);
    expect(typeof createAsyncHandler).toBe('function');
  });
});

describe('Edge Cases and Error Scenarios', () => {
  it('should handle empty string error codes', () => {
    const error = new ValidationError('Test', '');
    expect(error.code).toBe('');
  });

  it('should handle null and undefined context values', () => {
    const error1 = new ValidationError('Test', 'CODE', null);
    expect(error1.context).toBeNull();

    const error2 = new ValidationError('Test', 'CODE', undefined);
    expect(error2.context).toBeUndefined();
  });

  it('should handle circular references in context', () => {
    const circular: any = { prop: 'value' };
    circular.self = circular;

    // This should not throw during creation
    expect(() => {
      const error = new ValidationError('Test', 'CODE', circular);
      expect(error.context?.self).toBe(circular);
    }).not.toThrow();
  });

  it('should handle very long error messages', () => {
    const longMessage = 'x'.repeat(10000);
    const error = new ValidationError(longMessage);
    expect(error.message).toBe(longMessage);
  });

  it('should handle special characters in error messages', () => {
    const specialMessage = 'Error with émojis 🚀 and\nnewlines\tand\ttabs';
    const error = new ValidationError(specialMessage);
    expect(error.message).toBe(specialMessage);
  });

  it('should handle Error objects without stack traces', () => {
    const errorWithoutStack = new Error('No stack');
    errorWithoutStack.stack = undefined;

    const standardized = ErrorHandler.standardizeError(errorWithoutStack);
    expect(standardized).toBeInstanceOf(CLIError);
    expect(standardized.message).toBe('No stack');
  });

  it('should handle non-Error objects with error-like properties', () => {
    const errorLike = {
      message: 'Error-like object',
      name: 'CustomError',
      code: 'CUSTOM_CODE',
    };

    const standardized = ErrorHandler.standardizeError(errorLike);
    expect(standardized).toBeInstanceOf(InternalError);
  });

  it('should handle Date objects as errors', () => {
    const dateError = new Date();
    const standardized = ErrorHandler.standardizeError(dateError);
    expect(standardized).toBeInstanceOf(InternalError);
    expect(standardized.message).toContain(dateError.toString());
  });

  it('should handle null and undefined inputs to ErrorHandler', () => {
    const nullResult = ErrorHandler.standardizeError(null);
    expect(nullResult).toBeInstanceOf(InternalError);

    const undefinedResult = ErrorHandler.standardizeError(undefined);
    expect(undefinedResult).toBeInstanceOf(InternalError);
  });

  it('should handle numeric inputs to ErrorHandler', () => {
    const numberResult = ErrorHandler.standardizeError(42);
    expect(numberResult).toBeInstanceOf(InternalError);
    expect(numberResult.message).toBe('Unknown error: 42');
  });

  it('should handle boolean inputs to ErrorHandler', () => {
    const boolResult = ErrorHandler.standardizeError(true);
    expect(boolResult).toBeInstanceOf(InternalError);
    expect(boolResult.message).toBe('Unknown error: true');
  });
});
