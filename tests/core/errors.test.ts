import { Effect } from 'effect';
import { pipe } from 'effect/Function';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppError,
  ConfigError,
  ErrorService,
  ErrorServiceLive,
  McpError,
  MemoryError,
  NetworkError,
  PermissionError,
  TerminalError,
  ValidationError,
  createError,
  getErrorTag,
  isErrorType,
  matchError,
  retryStrategy,
  shouldRetry,
  wrapError,
} from '../../src/core/errors.js';

describe('Error Handling Foundation', () => {
  beforeEach(() => {
    // Clear console methods to avoid test output pollution
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  describe('AppError Base Class', () => {
    it('should create base error with required properties', () => {
      class TestError extends AppError {
        readonly _tag = 'TestError';
      }

      const error = new TestError('Test message', new Error('cause'), { key: 'value' });

      expect(error._tag).toBe('TestError');
      expect(error.message).toBe('Test message');
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.name).toBe('TestError');
    });

    it('should serialize to JSON correctly', () => {
      const error = new MemoryError('Test error', undefined, 'set', 'test-key', 'test-ns');
      const json = error.toJSON();

      expect(json._tag).toBe('MemoryError');
      expect(json.message).toBe('Test error');
      expect(json.context).toEqual({
        operation: 'set',
        key: 'test-key',
        namespace: 'test-ns',
      });
    });

    it('should maintain stack trace', () => {
      const error = new MemoryError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('MemoryError');
    });
  });

  describe('Domain-Specific Errors', () => {
    describe('MemoryError', () => {
      it('should create memory error with context', () => {
        const error = new MemoryError('Memory failed', new Error('cause'), 'get', 'test-key', 'ns');

        expect(error._tag).toBe('MemoryError');
        expect(error.operation).toBe('get');
        expect(error.key).toBe('test-key');
        expect(error.namespace).toBe('ns');
      });

      it('should provide user-friendly messages', () => {
        const getError = new MemoryError('Not found', undefined, 'get', 'missing-key');
        const setError = new MemoryError('Storage failed', undefined, 'set', 'test-key');
        const genericError = new MemoryError('Generic error');

        expect(getError.getUserMessage()).toBe("Memory entry 'missing-key' not found");
        expect(setError.getUserMessage()).toBe("Failed to store memory entry 'test-key'");
        expect(genericError.getUserMessage()).toBe('Generic error');
      });

      it('should determine recoverability', () => {
        const getError = new MemoryError('Not found', undefined, 'get');
        const setError = new MemoryError('Storage failed', undefined, 'set');

        expect(getError.isRecoverable()).toBe(true);
        expect(setError.isRecoverable()).toBe(false);
      });
    });

    describe('ConfigError', () => {
      it('should create config error with context', () => {
        const error = new ConfigError(
          'Invalid config',
          new Error('cause'),
          '/path/to/config',
          'field1'
        );

        expect(error._tag).toBe('ConfigError');
        expect(error.path).toBe('/path/to/config');
        expect(error.field).toBe('field1');
      });

      it('should provide user-friendly messages', () => {
        const fieldError = new ConfigError('Invalid value', undefined, undefined, 'timeout');
        const pathError = new ConfigError('Load failed', undefined, '/config.json');
        const genericError = new ConfigError('Generic error');

        expect(fieldError.getUserMessage()).toBe("Invalid configuration for field 'timeout'");
        expect(pathError.getUserMessage()).toBe("Failed to load configuration from '/config.json'");
        expect(genericError.getUserMessage()).toBe('Configuration error occurred');
      });
    });

    describe('McpError', () => {
      it('should create MCP error with context', () => {
        const error = new McpError('Server failed', new Error('cause'), 'server-1', 'start');

        expect(error._tag).toBe('McpError');
        expect(error.serverId).toBe('server-1');
        expect(error.operation).toBe('start');
      });

      it('should provide user-friendly messages', () => {
        const serverError = new McpError('Failed', undefined, 'server-1', 'start');
        const genericError = new McpError('Generic error');

        expect(serverError.getUserMessage()).toBe("Failed to start MCP server 'server-1'");
        expect(genericError.getUserMessage()).toBe('MCP service error occurred');
      });
    });
  });

  describe('Error Utilities', () => {
    it('should create errors with factory function', () => {
      const error = createError(MemoryError, 'Test message', undefined, 'set', 'key', 'ns');

      expect(error).toBeInstanceOf(MemoryError);
      expect(error.message).toBe('Test message');
      expect(error.operation).toBe('set');
      expect(error.key).toBe('key');
      expect(error.namespace).toBe('ns');
    });

    it('should wrap errors correctly', () => {
      const originalError = new Error('Original');
      const wrappedError = wrapError(MemoryError, originalError, 'Wrapped message', 'get', 'key');

      expect(wrappedError).toBeInstanceOf(MemoryError);
      expect(wrappedError.message).toBe('Wrapped message');
      expect(wrappedError.cause).toBe(originalError);
    });

    it('should not wrap already tagged errors', () => {
      const memoryError = new MemoryError('Original');
      const wrappedError = wrapError(MemoryError, memoryError, 'Should not wrap');

      expect(wrappedError).toBe(memoryError);
    });

    it('should check error types', () => {
      const memoryError = new MemoryError('Test');
      const configError = new ConfigError('Test');
      const genericError = new Error('Test');

      expect(isErrorType(memoryError, MemoryError)).toBe(true);
      expect(isErrorType(configError, MemoryError)).toBe(false);
      expect(isErrorType(genericError, MemoryError)).toBe(false);
    });

    it('should get error tags', () => {
      const memoryError = new MemoryError('Test');
      const genericError = new Error('Test');
      const unknown = 'not an error';

      expect(getErrorTag(memoryError)).toBe('MemoryError');
      expect(getErrorTag(genericError)).toBe('Error');
      expect(getErrorTag(unknown)).toBe('UnknownError');
    });

    it('should match on error types', () => {
      const memoryError = new MemoryError('Test');
      const configError = new ConfigError('Test');

      const result1 = matchError(
        memoryError,
        {
          MemoryError: (e) => 'memory',
          ConfigError: (e) => 'config',
        },
        'default'
      );

      const result2 = matchError(
        configError,
        {
          MemoryError: (e) => 'memory',
          ConfigError: (e) => 'config',
        },
        'default'
      );

      const result3 = matchError(
        new Error('Test'),
        {
          MemoryError: (e) => 'memory',
          ConfigError: (e) => 'config',
        },
        'default'
      );

      expect(result1).toBe('memory');
      expect(result2).toBe('config');
      expect(result3).toBe('default');
    });
  });

  describe('Error Recovery', () => {
    it('should determine retry eligibility', () => {
      const recoverableError = new MemoryError('Not found', undefined, 'get');
      const nonRecoverableError = new MemoryError('Storage failed', undefined, 'set');
      const networkError = new Error('ECONNRESET');
      const genericError = new Error('Generic');

      expect(shouldRetry(recoverableError)).toBe(true);
      expect(shouldRetry(nonRecoverableError)).toBe(false);
      expect(shouldRetry(networkError)).toBe(true);
      expect(shouldRetry(genericError)).toBe(false);
    });

    it('should provide retry strategies', () => {
      expect(retryStrategy.default.times).toBe(3);
      expect(retryStrategy.default.delay).toBe(1000);
      expect(retryStrategy.default.backoff).toBe('exponential');

      expect(retryStrategy.aggressive.times).toBe(5);
      expect(retryStrategy.aggressive.delay).toBe(500);

      expect(retryStrategy.conservative.times).toBe(2);
      expect(retryStrategy.conservative.delay).toBe(2000);
      expect(retryStrategy.conservative.backoff).toBe('linear');
    });
  });

  describe('ErrorService', () => {
    it('should create error service layer', async () => {
      const errorService = await Effect.runPromise(
        pipe(ErrorService, Effect.provide(ErrorServiceLive))
      );

      expect(errorService).toBeDefined();
      expect(typeof errorService.handle).toBe('function');
      expect(typeof errorService.log).toBe('function');
      expect(typeof errorService.report).toBe('function');
      expect(typeof errorService.recover).toBe('function');
    });

    it('should handle errors correctly', async () => {
      const errorService = await Effect.runPromise(
        pipe(ErrorService, Effect.provide(ErrorServiceLive))
      );

      const error = new MemoryError('Test error', undefined, 'get', 'test-key');

      await Effect.runPromise(errorService.handle(error));

      // Verify console.error was called
      expect(console.error).toHaveBeenCalled();
    });

    it('should log errors at different levels', async () => {
      const errorService = await Effect.runPromise(
        pipe(ErrorService, Effect.provide(ErrorServiceLive))
      );

      const error = new MemoryError('Test error');

      await Effect.runPromise(errorService.log(error, 'warn'));

      expect(console.warn).toHaveBeenCalled();
    });

    it('should determine recoverability', async () => {
      const errorService = await Effect.runPromise(
        pipe(ErrorService, Effect.provide(ErrorServiceLive))
      );

      const recoverableError = new MemoryError('Not found', undefined, 'get');
      const nonRecoverableError = new MemoryError('Storage failed', undefined, 'set');

      const recoverable = await Effect.runPromise(errorService.recover(recoverableError));
      const notRecoverable = await Effect.runPromise(errorService.recover(nonRecoverableError));

      expect(recoverable).toBe(true);
      expect(notRecoverable).toBe(false);
    });
  });
});
