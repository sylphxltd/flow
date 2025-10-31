import { describe, expect, it } from 'vitest';
import * as R from '../../../src/core/functional/result.js';

describe('Result', () => {
  describe('constructors', () => {
    it('should create success', () => {
      const result = R.success(42);
      expect(result._tag).toBe('Success');
      expect(R.isSuccess(result)).toBe(true);
      expect(R.isFailure(result)).toBe(false);
      if (R.isSuccess(result)) {
        expect(result.value).toBe(42);
      }
    });

    it('should create failure', () => {
      const result = R.failure(new Error('oops'));
      expect(result._tag).toBe('Failure');
      expect(R.isFailure(result)).toBe(true);
      expect(R.isSuccess(result)).toBe(false);
      if (R.isFailure(result)) {
        expect(result.error.message).toBe('oops');
      }
    });
  });

  describe('map', () => {
    it('should transform success value', () => {
      const result = R.pipe(R.success(5))(R.map((x: number) => x * 2));
      expect(R.isSuccess(result)).toBe(true);
      if (R.isSuccess(result)) {
        expect(result.value).toBe(10);
      }
    });

    it('should propagate failure', () => {
      const result = R.pipe(R.failure(new Error('error')))(R.map((x: number) => x * 2));
      expect(R.isFailure(result)).toBe(true);
    });
  });

  describe('flatMap', () => {
    it('should chain successful operations', () => {
      const divide =
        (x: number) =>
        (y: number): R.Result<number, string> =>
          y === 0 ? R.failure('division by zero') : R.success(x / y);

      const result = R.pipe(R.success(10))(R.flatMap(divide(20)));

      expect(R.isSuccess(result)).toBe(true);
      if (R.isSuccess(result)) {
        expect(result.value).toBe(2);
      }
    });

    it('should short-circuit on failure', () => {
      const divide =
        (x: number) =>
        (y: number): R.Result<number, string> =>
          y === 0 ? R.failure('division by zero') : R.success(x / y);

      const result = R.pipe(R.success(0))(R.flatMap(divide(5)));

      expect(R.isFailure(result)).toBe(true);
      if (R.isFailure(result)) {
        expect(result.error).toBe('division by zero');
      }
    });

    it('should propagate initial failure', () => {
      const divide =
        (x: number) =>
        (y: number): R.Result<number, string> =>
          y === 0 ? R.failure('division by zero') : R.success(x / y);

      const result = R.pipe(R.failure<number, string>('initial error'))(R.flatMap(divide(5)));

      expect(R.isFailure(result)).toBe(true);
      if (R.isFailure(result)) {
        expect(result.error).toBe('initial error');
      }
    });
  });

  describe('getOrElse', () => {
    it('should return value from success', () => {
      const result = R.success(42);
      expect(R.getOrElse(0)(result)).toBe(42);
    });

    it('should return default from failure', () => {
      const result = R.failure(new Error('error'));
      expect(R.getOrElse(0)(result)).toBe(0);
    });
  });

  describe('match', () => {
    it('should handle success case', () => {
      const result = R.success(42);
      const output = R.match(
        (value: number) => `success: ${value}`,
        (error: Error) => `error: ${error.message}`
      )(result);
      expect(output).toBe('success: 42');
    });

    it('should handle failure case', () => {
      const result = R.failure(new Error('oops'));
      const output = R.match(
        (value: number) => `success: ${value}`,
        (error: Error) => `error: ${error.message}`
      )(result);
      expect(output).toBe('error: oops');
    });
  });

  describe('tryCatch', () => {
    it('should catch exception and return failure', () => {
      const result = R.tryCatch(() => {
        throw new Error('boom');
      });
      expect(R.isFailure(result)).toBe(true);
      if (R.isFailure(result)) {
        expect(result.error.message).toBe('boom');
      }
    });

    it('should return success if no exception', () => {
      const result = R.tryCatch(() => 42);
      expect(R.isSuccess(result)).toBe(true);
      if (R.isSuccess(result)) {
        expect(result.value).toBe(42);
      }
    });
  });

  describe('tryCatchAsync', () => {
    it('should catch async exception and return failure', async () => {
      const result = await R.tryCatchAsync(async () => {
        throw new Error('boom');
      });
      expect(R.isFailure(result)).toBe(true);
      if (R.isFailure(result)) {
        expect(result.error.message).toBe('boom');
      }
    });

    it('should return success if promise resolves', async () => {
      const result = await R.tryCatchAsync(async () => 42);
      expect(R.isSuccess(result)).toBe(true);
      if (R.isSuccess(result)) {
        expect(result.value).toBe(42);
      }
    });
  });

  describe('all', () => {
    it('should combine successful results', () => {
      const results = [R.success(1), R.success(2), R.success(3)];
      const combined = R.all(results);
      expect(R.isSuccess(combined)).toBe(true);
      if (R.isSuccess(combined)) {
        expect(combined.value).toEqual([1, 2, 3]);
      }
    });

    it('should fail if any result fails', () => {
      const results = [R.success(1), R.failure(new Error('error')), R.success(3)];
      const combined = R.all(results);
      expect(R.isFailure(combined)).toBe(true);
    });
  });
});
