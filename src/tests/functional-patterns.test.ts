/**
 * Comprehensive Functional Programming Pattern Verification Tests
 *
 * This test suite verifies:
 * 1. Functional Core Principles (purity, immutability, first-class functions)
 * 2. Result Type Implementation (map, flatMap, mapError, error handling)
 * 3. Combinator Patterns (all, allAsync, match, tap, tapError, getOrElse)
 * 4. Immutable Data Structures
 * 5. Higher-Order Functions
 */

import { describe, it, expect, beforeEach } from 'bun:test';

// Import the core functional implementations
import {
  Result,
  ok,
  err,
  isOk,
  isErr,
  map,
  flatMap,
  mapError,
  getOrElse,
  getOrElseLazy,
  match,
  unwrap,
  unwrapError,
  tryCatch,
  tryCatchAsync,
  all,
  allWithErrors,
  allAsync,
  raceAsync,
  tap,
  tapError,
  tapBoth,
  safeAsync,
  safeSync,
  type AsyncResult
} from '../core/result';

describe('Functional Core Principles', () => {
  describe('Pure Functions', () => {
    it('should have pure map function - no side effects', () => {
      const original = ok(42);
      const input = { value: 1 };

      // Pure function should not modify input
      const double = (x: number) => x * 2;
      const result = map(double)(original);

      // Input remains unchanged
      expect(original).toEqual({ success: true, data: 42 });
      expect(input).toEqual({ value: 1 });

      // Function returns new result
      expect(result).toEqual({ success: true, data: 84 });
    });

    it('should have pure flatMap function - no side effects', () => {
      const original = ok(42);

      const toString = (x: number) => ok(`number: ${x}`);
      const result = flatMap(toString)(original);

      // Original unchanged
      expect(original).toEqual({ success: true, data: 42 });
      // New result created
      expect(result).toEqual({ success: true, data: 'number: 42' });
    });

    it('should have pure transformation functions', () => {
      const pipeline = [
        (x: number) => x * 2,
        (x: number) => x + 10,
        (x: number) => x.toString()
      ];

      const result = pipeline.reduce((acc, fn) =>
        acc.success ? ok(fn(acc.data)) : acc,
        ok(5)
      );

      expect(result).toEqual({ success: true, data: '20' });
    });
  });

  describe('Immutability', () => {
    it('should not mutate Result objects', () => {
      const results = [
        ok(42),
        err(new Error('test error')),
        ok({ nested: { value: 42 } })
      ];

      // Apply transformations
      const transformed = results.map(result =>
        map((x: any) => typeof x === 'object' ? { ...x, modified: true } : x * 2)(result)
      );

      // Original results unchanged
      expect(results[0]).toEqual({ success: true, data: 42 });
      expect(results[1]).toEqual({ success: false, error: expect.any(Error) });
      expect(results[2]).toEqual({ success: true, data: { nested: { value: 42 } } });

      // Transformed results are new
      expect(transformed[0]).toEqual({ success: true, data: 84 });
      expect(transformed[2]).toEqual({
        success: true,
        data: { nested: { value: 42 }, modified: true }
      });
    });

    it('should handle arrays immutably', () => {
      const originalArray = [1, 2, 3];
      const result = ok(originalArray);

      const transformed = map((arr: number[]) => [...arr, 4, 5])(result);

      // Original array unchanged
      expect(originalArray).toEqual([1, 2, 3]);
      // New array created
      expect(transformed).toEqual({
        success: true,
        data: [1, 2, 3, 4, 5]
      });
    });
  });

  describe('First-Class Functions', () => {
    it('should treat functions as values', () => {
      const operations = new Map([
        ['double', (x: number) => x * 2],
        ['square', (x: number) => x * x],
        ['toString', (x: number) => x.toString()]
      ]);

      const result = ok(5);
      const operationName = 'square';
      const operation = operations.get(operationName)!;

      const transformed = map(operation)(result);
      expect(transformed).toEqual({ success: true, data: 25 });
    });

    it('should support function composition', () => {
      const compose = <T, U, V>(f: (x: U) => V, g: (x: T) => U) => (x: T) => f(g(x));

      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;
      const toString = (x: number) => `Result: ${x}`;

      const composed = compose(toString, compose(double, add1));

      const result = map(composed)(ok(5));
      expect(result).toEqual({ success: true, data: 'Result: 12' });
    });

    it('should support higher-order functions returning functions', () => {
      const createMultiplier = (factor: number) => (x: number) => x * factor;

      const triple = createMultiplier(3);
      const result = map(triple)(ok(7));

      expect(result).toEqual({ success: true, data: 21 });
    });
  });

  describe('Function Composition', () => {
    it('should compose map operations', () => {
      // Using pipe-style composition with map
      const pipeline = [
        (x: number) => x * 2,
        (x: number) => x + 10,
        (x: number) => x.toString()
      ].reduce((acc, fn) => acc.success ? ok(fn(acc.data)) : acc, ok(5));

      expect(pipeline).toEqual({ success: true, data: '20' });
    });

    it('should handle flatMap composition', () => {
      const parseNumber = (str: string): Result<number, Error> => {
        const num = parseInt(str);
        return isNaN(num) ? err(new Error('Invalid number')) : ok(num);
      };

      const divideBy = (divisor: number) => (num: number): Result<number, Error> => {
        return divisor === 0
          ? err(new Error('Division by zero'))
          : ok(num / divisor);
      };

      const result = [parseNumber, divideBy(4)].reduce(
        (acc, fn) => acc.success ? fn(acc.data) : acc,
        ok("20")
      );

      expect(result).toEqual({ success: true, data: 5 });
    });
  });
});

describe('Result Type Implementation', () => {
  describe('Basic Construction and Type Guards', () => {
    it('should create ok results', () => {
      const result = ok(42);
      expect(result).toEqual({ success: true, data: 42 });
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
    });

    it('should create error results', () => {
      const error = new Error('test error');
      const result = err(error);
      expect(result).toEqual({ success: false, error });
      expect(isOk(result)).toBe(false);
      expect(isErr(result)).toBe(true);
    });

    it('should support type narrowing with type guards', () => {
      const results: Result<number, string>[] = [ok(42), err('error')];

      const numbers: number[] = [];
      const errors: string[] = [];

      results.forEach(result => {
        if (isOk(result)) {
          numbers.push(result.data); // TypeScript knows this is number
        } else {
          errors.push(result.error); // TypeScript knows this is string
        }
      });

      expect(numbers).toEqual([42]);
      expect(errors).toEqual(['error']);
    });
  });

  describe('Functional Transformations', () => {
    it('should map success values', () => {
      const result = ok(5);
      const doubled = map(x => x * 2)(result);
      expect(doubled).toEqual({ success: true, data: 10 });
    });

    it('should propagate errors through map', () => {
      const result = err(new Error('original error'));
      const mapped = map(x => x * 2)(result);
      expect(mapped).toEqual({ success: false, error: result.error });
    });

    it('should flatMap with chaining', () => {
      const parseAndDouble = (str: string): Result<number, Error> => {
        const num = parseInt(str);
        return isNaN(num) ? err(new Error('Invalid number')) : ok(num * 2);
      };

      const result = ok("21");
      const processed = flatMap(parseAndDouble)(result);
      expect(processed).toEqual({ success: true, data: 42 });
    });

    it('should mapError transformations', () => {
      const result = err(new Error('original error'));
      const withMappedError = mapError(err => new Error(`Mapped: ${err.message}`))(result);
      expect(withMappedError).toEqual({
        success: false,
        error: new Error('Mapped: original error')
      });
    });

    it('should handle complex transformation chains', () => {
      const processUser = (user: any): Result<{ name: string; age: number }, Error> => {
        if (!user.name || !user.age) {
          return err(new Error('Missing required fields'));
        }
        return ok({
          name: user.name.toUpperCase(),
          age: parseInt(user.age)
        });
      };

      const validateAge = (user: { name: string; age: number }): Result<{ name: string; age: number }, Error> => {
        return user.age < 0
          ? err(new Error('Invalid age'))
          : ok(user);
      };

      const result = [processUser, validateAge].reduce(
        (acc, fn) => acc.success ? fn(acc.data) : acc,
        ok({ name: 'john', age: '25' })
      );

      expect(result).toEqual({
        success: true,
        data: { name: 'JOHN', age: 25 }
      });
    });
  });

  describe('Error Handling Without Exceptions', () => {
    it('should handle tryCatch for sync functions', () => {
      const goodFn = () => 42;
      const badFn = () => { throw new Error('Sync error'); };

      const goodResult = tryCatch(goodFn);
      const badResult = tryCatch(badFn);

      expect(goodResult).toEqual({ success: true, data: 42 });
      expect(badResult).toEqual({ success: false, error: expect.any(Error) });
    });

    it('should handle tryCatchAsync for async functions', async () => {
      const goodAsyncFn = async () => 42;
      const badAsyncFn = async () => { throw new Error('Async error'); };

      const goodResult = await tryCatchAsync(goodAsyncFn);
      const badResult = await tryCatchAsync(badAsyncFn);

      expect(goodResult).toEqual({ success: true, data: 42 });
      expect(badResult).toEqual({ success: false, error: expect.any(Error) });
    });

    it('should support custom error mapping', () => {
      const errorMapper = (error: unknown) => `Mapped: ${String(error)}`;

      const result = tryCatch(() => { throw 'string error'; }, errorMapper);
      expect(result).toEqual({ success: false, error: 'Mapped: string error' });
    });
  });
});

describe('Combinator Patterns', () => {
  describe('all() combinator', () => {
    it('should combine successful results', () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = all(results);
      expect(combined).toEqual({ success: true, data: [1, 2, 3] });
    });

    it('should short-circuit on first error', () => {
      const results = [ok(1), err(new Error('first error')), err(new Error('second error'))];
      const combined = all(results);
      expect(combined).toEqual({ success: false, error: expect.objectContaining({ message: 'first error' }) });
    });

    it('should handle empty array', () => {
      const combined = all([]);
      expect(combined).toEqual({ success: true, data: [] });
    });

    it('should preserve error type', () => {
      const results = [ok(1), err('string error')];
      const combined = all(results);
      expect(combined).toEqual({ success: false, error: 'string error' });
    });
  });

  describe('allWithErrors() combinator', () => {
    it('should collect all errors', () => {
      const results = [
        ok(1),
        err('error1'),
        ok(2),
        err('error2')
      ];
      const combined = allWithErrors(results);
      expect(combined).toEqual({ success: false, error: ['error1', 'error2'] });
    });

    it('should return all successes when no errors', () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = allWithErrors(results);
      expect(combined).toEqual({ success: true, data: [1, 2, 3] });
    });
  });

  describe('allAsync() combinator', () => {
    it('should combine async results', async () => {
      const asyncResults: AsyncResult<number, Error>[] = [
        Promise.resolve(ok(1)),
        Promise.resolve(ok(2)),
        Promise.resolve(ok(3))
      ];

      const combined = await allAsync(asyncResults);
      expect(combined).toEqual({ success: true, data: [1, 2, 3] });
    });

    it('should handle async errors', async () => {
      const asyncResults: AsyncResult<number, Error>[] = [
        Promise.resolve(ok(1)),
        Promise.resolve(err(new Error('async error'))),
        Promise.resolve(ok(3))
      ];

      const combined = await allAsync(asyncResults);
      expect(combined).toEqual({ success: false, error: expect.any(Error) });
    });
  });

  describe('raceAsync() combinator', () => {
    it('should return first successful result', async () => {
      const asyncResults: AsyncResult<number, Error>[] = [
        new Promise(resolve => setTimeout(() => resolve(ok(1)), 100)),
        new Promise(resolve => setTimeout(() => resolve(ok(2)), 50)),
        new Promise(resolve => setTimeout(() => resolve(ok(3)), 150))
      ];

      const result = await raceAsync(asyncResults);
      expect(result).toEqual({ success: true, data: 2 });
    });
  });

  describe('match() pattern matching', () => {
    it('should match on success', () => {
      const result = ok(42);
      const output = match(
        (data) => `Success: ${data}`,
        (error) => `Error: ${error.message}`
      )(result);

      expect(output).toBe('Success: 42');
    });

    it('should match on error', () => {
      const result = err(new Error('test error'));
      const output = match(
        (data) => `Success: ${data}`,
        (error) => `Error: ${error.message}`
      )(result);

      expect(output).toBe('Error: test error');
    });
  });

  describe('tap() side effects', () => {
    it('should execute side effect on success', () => {
      const result = ok(42);
      let sideEffectValue: number | undefined;

      const withSideEffect = tap((data) => { sideEffectValue = data; })(result);

      expect(withSideEffect).toEqual({ success: true, data: 42 });
      expect(sideEffectValue).toBe(42);
    });

    it('should not execute side effect on error', () => {
      const result = err(new Error('test error'));
      let sideEffectExecuted = false;

      const withSideEffect = tap(() => { sideEffectExecuted = true; })(result);

      expect(withSideEffect).toEqual({ success: false, error: result.error });
      expect(sideEffectExecuted).toBe(false);
    });
  });

  describe('tapError() side effects', () => {
    it('should execute side effect on error', () => {
      const error = new Error('test error');
      const result = err(error);
      let sideEffectError: Error | undefined;

      const withSideEffect = tapError((err) => { sideEffectError = err; })(result);

      expect(withSideEffect).toEqual({ success: false, error });
      expect(sideEffectError).toBe(error);
    });

    it('should not execute side effect on success', () => {
      const result = ok(42);
      let sideEffectExecuted = false;

      const withSideEffect = tapError(() => { sideEffectExecuted = true; })(result);

      expect(withSideEffect).toEqual({ success: true, data: 42 });
      expect(sideEffectExecuted).toBe(false);
    });
  });

  describe('getOrElse() default values', () => {
    it('should return value on success', () => {
      const result = ok(42);
      const value = getOrElse(0)(result);
      expect(value).toBe(42);
    });

    it('should return default on error', () => {
      const result = err(new Error('test error'));
      const value = getOrElse(0)(result);
      expect(value).toBe(0);
    });

    it('should support lazy defaults', () => {
      const result = err(new Error('test error'));
      let lazyEvaluated = false;

      const value = getOrElseLazy(() => {
        lazyEvaluated = true;
        return 0;
      })(result);

      expect(value).toBe(0);
      expect(lazyEvaluated).toBe(true);
    });

    it('should not evaluate lazy default on success', () => {
      const result = ok(42);
      let lazyEvaluated = false;

      const value = getOrElseLazy(() => {
        lazyEvaluated = true;
        return 0;
      })(result);

      expect(value).toBe(42);
      expect(lazyEvaluated).toBe(false);
    });
  });
});

describe('Integration Tests - Real World Scenarios', () => {
  it('should handle complex data processing pipeline', async () => {
    // Simulate processing user data from multiple sources
    const fetchUser = async (id: number): Promise<Result<{ name: string; age: string }, Error>> => {
      if (id === 1) return ok({ name: 'John', age: '25' });
      if (id === 2) return ok({ name: 'Jane', age: '30' });
      return err(new Error('User not found'));
    };

    const validateUser = (user: { name: string; age: string }): Result<{ name: string; age: number }, Error> => {
      if (!user.name || !user.age) {
        return err(new Error('Invalid user data'));
      }
      const age = parseInt(user.age);
      if (isNaN(age) || age < 0) {
        return err(new Error('Invalid age'));
      }
      return ok({ name: user.name, age });
    };

    const processUsers = async (ids: number[]): Promise<Result<string[], Error>> => {
      const userResults = await allAsync(ids.map(id =>
        fetchUser(id).then(flatMap(validateUser))
      ));

      if (!userResults.success) {
        return userResults;
      }

      const processedUsers = userResults.data.map(user =>
        `${user.name} (${user.age} years old)`
      );

      return ok(processedUsers);
    };

    const result = await processUsers([1, 2]);
    expect(result).toEqual({
      success: true,
      data: ['John (25 years old)', 'Jane (30 years old)']
    });
  });

  it('should handle API call with retries and error handling', async () => {
    let attempts = 0;
    const unreliableApi = async (): Promise<Result<string, Error>> => {
      attempts++;
      if (attempts < 3) {
        return err(new Error('Network error'));
      }
      return ok('Success after retries');
    };

    // Simple retry implementation
    const withRetry = async <T>(
      fn: () => Promise<Result<T, Error>>,
      maxAttempts = 3
    ): Promise<Result<T, Error>> => {
      for (let i = 0; i < maxAttempts; i++) {
        const result = await fn();
        if (result.success) return result;
        if (i === maxAttempts - 1) return result;
      }
      return err(new Error('All attempts failed'));
    };

    const result = await withRetry(unreliableApi);
    expect(result).toEqual({ success: true, data: 'Success after retries' });
    expect(attempts).toBe(3);
  });

  it('should handle configuration validation and transformation', () => {
    const loadConfig = (raw: Record<string, unknown>): Result<Record<string, unknown>, Error> => {
      // Validate required fields
      if (!raw.name || typeof raw.name !== 'string') {
        return err(new Error('Missing or invalid name'));
      }

      // Transform and validate
      const transformed = {
        ...raw,
        name: raw.name.toString().trim(),
        port: raw.port ? parseInt(String(raw.port)) : 3000,
        debug: raw.debug === 'true' || raw.debug === true
      };

      if (isNaN(transformed.port) || transformed.port < 1 || transformed.port > 65535) {
        return err(new Error('Invalid port number'));
      }

      return ok(transformed);
    };

    const rawConfig = {
      name: '  my-app  ',
      port: '8080',
      debug: 'true',
      extra: 'ignored'
    };

    const result = loadConfig(rawConfig);
    expect(result).toEqual({
      success: true,
      data: {
        name: 'my-app',
        port: 8080,
        debug: true,
        extra: 'ignored'
      }
    });
  });
});

