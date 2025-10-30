/**
 * Functional Programming Utilities Tests
 */

import { describe, expect, it } from 'vitest';
import {
  and,
  compose,
  constant,
  curry,
  curry3,
  drop,
  filter,
  filterAsync,
  flatMap,
  flow,
  groupBy,
  identity,
  map,
  mapAsync,
  mapResult,
  noop,
  not,
  omit,
  or,
  partial,
  partition,
  pick,
  pipe,
  prop,
  reduce,
  reduceAsync,
  reverse,
  sort,
  sortBy,
  take,
  tap,
  tapAsync,
  trace,
  tryCatch,
  tryCatchAsync,
  unique,
  uniqueBy,
  unwrapResult,
} from '../../src/utils/functional.js';

describe('Functional Programming Utilities', () => {
  describe('Function Composition', () => {
    it('pipe should compose functions left-to-right', () => {
      const result = pipe(
        5,
        (x) => x * 2, // 10
        (x) => x + 3, // 13
        (x) => x.toString() // "13"
      );
      expect(result).toBe('13');
    });

    it('compose should compose functions right-to-left', () => {
      const addThenMultiply = compose(
        (x: number) => x * 2, // Applied second
        (x: number) => x + 3 // Applied first
      );
      expect(addThenMultiply(5)).toBe(16); // (5 + 3) * 2
    });

    it('flow should create composable function', () => {
      const transform = flow(
        (x: number) => x * 2,
        (x: number) => x + 3,
        (x: number) => x.toString()
      );
      expect(transform(5)).toBe('13');
    });
  });

  describe('Currying & Partial Application', () => {
    it('curry should transform function to curried form', () => {
      const add = (a: number, b: number) => a + b;
      const curriedAdd = curry(add);
      expect(curriedAdd(5)(3)).toBe(8);
    });

    it('curry3 should curry 3-argument function', () => {
      const add3 = (a: number, b: number, c: number) => a + b + c;
      const curriedAdd3 = curry3(add3);
      expect(curriedAdd3(1)(2)(3)).toBe(6);
    });

    it('partial should partially apply arguments', () => {
      const add3 = (a: number, b: number, c: number) => a + b + c;
      const add5 = partial(add3, 5);
      expect(add5(3, 2)).toBe(10);
    });
  });

  describe('Array Transformations', () => {
    it('map should transform array elements', () => {
      const result = pipe(
        [1, 2, 3],
        map((x: number) => x * 2)
      );
      expect(result).toEqual([2, 4, 6]);
    });

    it('filter should keep matching elements', () => {
      const result = pipe(
        [1, 2, 3, 4],
        filter((x: number) => x > 2)
      );
      expect(result).toEqual([3, 4]);
    });

    it('reduce should accumulate to single value', () => {
      const result = pipe(
        [1, 2, 3, 4],
        reduce((acc: number, x: number) => acc + x, 0)
      );
      expect(result).toBe(10);
    });

    it('flatMap should map and flatten', () => {
      const result = pipe(
        [1, 2, 3],
        flatMap((x: number) => [x, x * 2])
      );
      expect(result).toEqual([1, 2, 2, 4, 3, 6]);
    });

    it('sort should sort array', () => {
      const result = pipe(
        [3, 1, 2],
        sort((a: number, b: number) => a - b)
      );
      expect(result).toEqual([1, 2, 3]);
    });

    it('sortBy should sort by property', () => {
      const result = pipe([{ age: 30 }, { age: 20 }, { age: 25 }], sortBy('age'));
      expect(result).toEqual([{ age: 20 }, { age: 25 }, { age: 30 }]);
    });

    it('reverse should reverse array', () => {
      expect(reverse([1, 2, 3])).toEqual([3, 2, 1]);
    });

    it('take should take first n elements', () => {
      const result = pipe([1, 2, 3, 4, 5], take(3));
      expect(result).toEqual([1, 2, 3]);
    });

    it('drop should drop first n elements', () => {
      const result = pipe([1, 2, 3, 4, 5], drop(2));
      expect(result).toEqual([3, 4, 5]);
    });

    it('unique should remove duplicates', () => {
      const result = pipe([1, 2, 2, 3, 3, 3], unique);
      expect(result).toEqual([1, 2, 3]);
    });

    it('uniqueBy should remove duplicates by key', () => {
      const result = pipe(
        [
          { id: 1, name: 'A' },
          { id: 2, name: 'B' },
          { id: 1, name: 'C' },
        ],
        uniqueBy('id')
      );
      expect(result).toEqual([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]);
    });

    it('partition should split array by predicate', () => {
      const result = pipe(
        [1, 2, 3, 4, 5],
        partition((x: number) => x > 3)
      );
      expect(result).toEqual([
        [4, 5],
        [1, 2, 3],
      ]);
    });

    it('groupBy should group items by key', () => {
      const result = pipe(
        [
          { type: 'a', val: 1 },
          { type: 'b', val: 2 },
          { type: 'a', val: 3 },
        ],
        groupBy('type')
      );
      expect(result).toEqual({
        a: [
          { type: 'a', val: 1 },
          { type: 'a', val: 3 },
        ],
        b: [{ type: 'b', val: 2 }],
      });
    });
  });

  describe('Async Transformations', () => {
    it('mapAsync should map with async function', async () => {
      const result = await pipe(
        [1, 2, 3],
        mapAsync(async (x) => x * 2)
      );
      expect(result).toEqual([2, 4, 6]);
    });

    it('filterAsync should filter with async predicate', async () => {
      const result = await pipe(
        [1, 2, 3, 4],
        filterAsync(async (x) => x > 2)
      );
      expect(result).toEqual([3, 4]);
    });

    it('reduceAsync should reduce with async function', async () => {
      const result = await pipe(
        [1, 2, 3],
        reduceAsync(async (acc, x) => acc + x, 0)
      );
      expect(result).toBe(6);
    });
  });

  describe('Side Effects & Debugging', () => {
    it('tap should execute side effect without changing value', () => {
      let sideEffect = 0;
      const result = pipe(
        5,
        (x) => x * 2,
        tap((x) => {
          sideEffect = x;
        }),
        (x) => x + 3
      );
      expect(result).toBe(13);
      expect(sideEffect).toBe(10);
    });

    it('tapAsync should execute async side effect', async () => {
      let sideEffect = 0;
      // Note: tapAsync must be used in async pipeline, not with regular pipe
      const result = await tapAsync(async (x) => {
        sideEffect = x;
      })(10);
      expect(result).toBe(10);
      expect(sideEffect).toBe(10);
    });

    it('trace should log value and return it', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = pipe(5, (x) => x * 2, trace('After multiply'));
      expect(result).toBe(10);
      expect(consoleLogSpy).toHaveBeenCalledWith('After multiply:', 10);
      consoleLogSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('tryCatch should return ok result on success', () => {
      const result = tryCatch(() => JSON.parse('{"foo":"bar"}'));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ foo: 'bar' });
      }
    });

    it('tryCatch should return error result on failure', () => {
      const result = tryCatch(() => JSON.parse('invalid json'));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('tryCatchAsync should handle async errors', async () => {
      const result = await tryCatchAsync(async () => {
        throw new Error('Test error');
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Test error');
      }
    });

    it('unwrapResult should extract value from ok result', () => {
      const result = { ok: true as const, value: 42 };
      expect(unwrapResult(result)).toBe(42);
    });

    it('unwrapResult should throw error from error result', () => {
      const result = { ok: false as const, error: new Error('Test') };
      expect(() => unwrapResult(result)).toThrow('Test');
    });

    it('mapResult should transform ok result', () => {
      const result = { ok: true as const, value: 5 };
      const mapped = pipe(
        result,
        mapResult((x: number) => x * 2)
      );
      expect(mapped).toEqual({ ok: true, value: 10 });
    });

    it('mapResult should pass through error result', () => {
      const result = { ok: false as const, error: new Error('Test') };
      const mapped = pipe(
        result,
        mapResult((x: number) => x * 2)
      );
      expect(mapped).toEqual(result);
    });
  });

  describe('Predicates & Logic', () => {
    it('not should negate predicate', () => {
      const isEven = (x: number) => x % 2 === 0;
      const isOdd = not(isEven);
      expect(isOdd(3)).toBe(true);
      expect(isOdd(4)).toBe(false);
    });

    it('and should combine predicates with AND', () => {
      const isPositive = (x: number) => x > 0;
      const isEven = (x: number) => x % 2 === 0;
      const isPositiveEven = and(isPositive, isEven);
      expect(isPositiveEven(4)).toBe(true);
      expect(isPositiveEven(3)).toBe(false);
      expect(isPositiveEven(-4)).toBe(false);
    });

    it('or should combine predicates with OR', () => {
      const isNegative = (x: number) => x < 0;
      const isEven = (x: number) => x % 2 === 0;
      const isNegativeOrEven = or(isNegative, isEven);
      expect(isNegativeOrEven(-3)).toBe(true);
      expect(isNegativeOrEven(4)).toBe(true);
      expect(isNegativeOrEven(3)).toBe(false);
    });
  });

  describe('Utilities', () => {
    it('identity should return value as-is', () => {
      expect(identity(5)).toBe(5);
      expect(identity('hello')).toBe('hello');
    });

    it('constant should always return same value', () => {
      const always5 = constant(5);
      expect(always5()).toBe(5);
      expect(always5()).toBe(5);
    });

    it('noop should do nothing', () => {
      expect(noop()).toBeUndefined();
    });

    it('prop should extract property value', () => {
      const result = pipe([{ name: 'Alice' }, { name: 'Bob' }], map(prop('name')));
      expect(result).toEqual(['Alice', 'Bob']);
    });

    it('pick should pick properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pipe(obj, pick(['a', 'c']));
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('omit should omit properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pipe(obj, omit(['b']));
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('Complex Pipeline Examples', () => {
    it('should handle complex data transformation pipeline', () => {
      const users = [
        { name: 'Alice', age: 30, active: true },
        { name: 'Bob', age: 25, active: false },
        { name: 'Charlie', age: 35, active: true },
        { name: 'David', age: 28, active: true },
      ];

      // Pipeline: filter active -> increment age -> sort by age -> take 2 -> extract names
      // Active users: Alice (30), Charlie (35), David (28)
      // After increment: Alice (31), Charlie (36), David (29)
      // After sort: David (29), Alice (31), Charlie (36)
      // After take(2): David (29), Alice (31)
      const result = pipe(
        users,
        filter((u) => u.active),
        map((u) => ({ ...u, age: u.age + 1 })),
        sortBy('age'),
        take(2),
        map(prop('name'))
      );

      expect(result).toEqual(['David', 'Alice']);
    });

    it('should handle error-safe pipeline', () => {
      const parseJSON = (str: string) => tryCatch(() => JSON.parse(str));
      const extractName = mapResult((obj: any) => obj.name);

      const result1 = pipe('{"name":"Alice"}', parseJSON, extractName);
      expect(result1).toEqual({ ok: true, value: 'Alice' });

      const result2 = pipe('invalid json', parseJSON, extractName);
      expect(result2.ok).toBe(false);
    });
  });
});
