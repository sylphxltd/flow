/**
 * Error Handler Tests
 * Tests for CLI error handling utilities
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CLIError, handleError, createAsyncHandler } from '../../src/utils/error-handler.js';

describe('Error Handler', () => {
  // Save original console.error and process.exit
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;

  beforeEach(() => {
    console.error = vi.fn();
    // Mock process.exit to prevent test termination
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });

  describe('CLIError', () => {
    it('should create error with message', () => {
      const error = new CLIError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
    });

    it('should have name CLIError', () => {
      const error = new CLIError('Test error');
      expect(error.name).toBe('CLIError');
    });

    it('should create error with code', () => {
      const error = new CLIError('Test error', 'TEST_CODE');
      expect(error.code).toBe('TEST_CODE');
    });

    it('should create error without code', () => {
      const error = new CLIError('Test error');
      expect(error.code).toBeUndefined();
    });

    it('should be throwable', () => {
      expect(() => {
        throw new CLIError('Test error');
      }).toThrow('Test error');
    });

    it('should be catchable as Error', () => {
      try {
        throw new CLIError('Test error', 'TEST_CODE');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(CLIError);
      }
    });

    it('should preserve stack trace', () => {
      const error = new CLIError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CLIError');
    });

    it('should support different error codes', () => {
      const error1 = new CLIError('Error 1', 'CODE_1');
      const error2 = new CLIError('Error 2', 'CODE_2');
      expect(error1.code).toBe('CODE_1');
      expect(error2.code).toBe('CODE_2');
    });
  });

  describe('handleError', () => {
    it('should log error message', () => {
      const error = new Error('Test error');
      handleError(error);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });

    it('should exit process', () => {
      const error = new Error('Test error');
      handleError(error);

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should log context when provided', () => {
      const error = new Error('Test error');
      handleError(error, 'test context');

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('test context'));
    });

    it('should log error code for CLIError', () => {
      const error = new CLIError('Test error', 'TEST_CODE');
      handleError(error);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('TEST_CODE'));
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      handleError(error);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('String error'));
    });

    it('should handle null error', () => {
      handleError(null);

      expect(console.error).toHaveBeenCalled();
    });

    it('should handle undefined error', () => {
      handleError(undefined);

      expect(console.error).toHaveBeenCalled();
    });

    it('should log error symbol', () => {
      const error = new Error('Test');
      handleError(error);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('✗'));
    });

    it('should not log code for regular Error', () => {
      const error = new Error('Test error');
      handleError(error);

      const calls = (console.error as any).mock.calls;
      const hasCodeLine = calls.some((call: any[]) =>
        call.some((arg) => typeof arg === 'string' && arg.includes('Code:'))
      );
      expect(hasCodeLine).toBe(false);
    });
  });

  describe('createAsyncHandler', () => {
    it('should return async function', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = createAsyncHandler(handler);

      expect(typeof wrappedHandler).toBe('function');
      expect(wrappedHandler.constructor.name).toBe('AsyncFunction');
    });

    it('should execute handler', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = createAsyncHandler(handler);

      await wrappedHandler({ test: 'value' });

      expect(handler).toHaveBeenCalledWith({ test: 'value' });
    });

    it('should pass options to handler', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = createAsyncHandler(handler);

      const options = { foo: 'bar', baz: 123 };
      await wrappedHandler(options);

      expect(handler).toHaveBeenCalledWith(options);
    });

    it('should catch errors from handler', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const wrappedHandler = createAsyncHandler(handler);

      await wrappedHandler({ test: 'value' });

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Handler error'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should call handleError on failure', async () => {
      const error = new Error('Handler error');
      const handler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = createAsyncHandler(handler, 'test context');

      await wrappedHandler({ test: 'value' });

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Handler error'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('test context'));
    });

    it('should include context in error handling', async () => {
      const error = new Error('Test');
      const handler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = createAsyncHandler(handler, 'custom context');

      await wrappedHandler({});

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('custom context'));
    });

    it('should work without context', async () => {
      const error = new Error('Test');
      const handler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = createAsyncHandler(handler);

      await wrappedHandler({});

      expect(console.error).toHaveBeenCalledWith(expect.not.stringContaining('('));
    });

    it('should handle CLIError', async () => {
      const error = new CLIError('CLI error', 'CLI_CODE');
      const handler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = createAsyncHandler(handler);

      await wrappedHandler({});

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('CLI_CODE'));
    });

    it('should preserve handler return value', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = createAsyncHandler(handler);

      const result = await wrappedHandler({ test: 'value' });

      expect(result).toBeUndefined();
    });
  });

  describe('Integration', () => {
    it('should work with async/await', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = createAsyncHandler(handler);

      await wrappedHandler({ test: 'value' });

      expect(handler).toHaveBeenCalled();
    });

    it('should be chainable with async operations', async () => {
      let executed = false;
      const handler = vi.fn().mockImplementation(async () => {
        executed = true;
      });
      const wrappedHandler = createAsyncHandler(handler);

      await wrappedHandler({});

      expect(executed).toBe(true);
    });

    it('should handle multiple calls', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = createAsyncHandler(handler);

      await wrappedHandler({ call: 1 });
      await wrappedHandler({ call: 2 });

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
