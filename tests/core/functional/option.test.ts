/**
 * Tests for Option type and related functions
 * Demonstrates null-safe functional programming
 */

import { describe, expect, it } from 'vitest';
import {
  filter,
  flatMap,
  fromNullable,
  getOrElse,
  getOrElseLazy,
  isNone,
  isSome,
  map,
  match,
  none,
  some,
  toNullable,
  toUndefined,
} from '../../../src/core/functional/option.js';

describe('Option Type', () => {
  describe('Constructors', () => {
    it('should create Some option', () => {
      const option = some(42);

      expect(option._tag).toBe('Some');
      expect(option.value).toBe(42);
      expect(isSome(option)).toBe(true);
      expect(isNone(option)).toBe(false);
    });

    it('should create None option', () => {
      const option = none;

      expect(option._tag).toBe('None');
      expect(isSome(option)).toBe(false);
      expect(isNone(option)).toBe(true);
    });

    it('should create Option from nullable', () => {
      expect(isSome(fromNullable(42))).toBe(true);
      expect(isNone(fromNullable(null))).toBe(true);
      expect(isNone(fromNullable(undefined))).toBe(true);
    });
  });

  describe('Transformations', () => {
    it('should map Some value', () => {
      const option = some(10);
      const mapped = map((n: number) => n * 2)(option);

      expect(isSome(mapped)).toBe(true);
      if (isSome(mapped)) {
        expect(mapped.value).toBe(20);
      }
    });

    it('should not map None value', () => {
      const option = none;
      const mapped = map((n: number) => n * 2)(option);

      expect(isNone(mapped)).toBe(true);
    });

    it('should flatMap Some value', () => {
      const option = some(10);
      const flatMapped = flatMap((n: number) =>
        n > 5 ? some(n * 2) : none
      )(option);

      expect(isSome(flatMapped)).toBe(true);
      if (isSome(flatMapped)) {
        expect(flatMapped.value).toBe(20);
      }
    });

    it('should flatMap to None', () => {
      const option = some(3);
      const flatMapped = flatMap((n: number) =>
        n > 5 ? some(n * 2) : none
      )(option);

      expect(isNone(flatMapped)).toBe(true);
    });

    it('should short-circuit flatMap on None', () => {
      const option = none;
      let called = false;
      const flatMapped = flatMap((n: number) => {
        called = true;
        return some(n * 2);
      })(option);

      expect(called).toBe(false);
      expect(isNone(flatMapped)).toBe(true);
    });

    it('should filter Some value', () => {
      const option = some(10);
      const filtered = filter((n: number) => n > 5)(option);

      expect(isSome(filtered)).toBe(true);
    });

    it('should filter to None', () => {
      const option = some(3);
      const filtered = filter((n: number) => n > 5)(option);

      expect(isNone(filtered)).toBe(true);
    });
  });

  describe('Extractors', () => {
    it('should get Some value with default', () => {
      const someOption = some(42);
      const noneOption = none;

      expect(getOrElse(0)(someOption)).toBe(42);
      expect(getOrElse(0)(noneOption)).toBe(0);
    });

    it('should get value with lazy default', () => {
      const someOption = some(42);
      const noneOption = none;

      let called = false;
      const getDefault = () => {
        called = true;
        return 99;
      };

      expect(getOrElseLazy(getDefault)(someOption)).toBe(42);
      expect(called).toBe(false); // Not called for Some

      expect(getOrElseLazy(getDefault)(noneOption)).toBe(99);
      expect(called).toBe(true); // Called for None
    });

    it('should convert to nullable', () => {
      expect(toNullable(some(42))).toBe(42);
      expect(toNullable(none)).toBe(null);
    });

    it('should convert to undefined', () => {
      expect(toUndefined(some(42))).toBe(42);
      expect(toUndefined(none)).toBe(undefined);
    });
  });

  describe('Pattern Matching', () => {
    it('should match on Some', () => {
      const option = some(42);
      const output = match(
        (value: number) => `Value: ${value}`,
        () => 'Nothing'
      )(option);

      expect(output).toBe('Value: 42');
    });

    it('should match on None', () => {
      const option = none;
      const output = match(
        (value: number) => `Value: ${value}`,
        () => 'Nothing'
      )(option);

      expect(output).toBe('Nothing');
    });
  });

  describe('Null Safety Examples', () => {
    it('should safely handle nullable values', () => {
      // Simulating a function that might return null
      const findUser = (id: number): number | null => {
        return id === 1 ? 42 : null;
      };

      const user1 = fromNullable(findUser(1));
      const user2 = fromNullable(findUser(999));

      expect(isSome(user1)).toBe(true);
      expect(isNone(user2)).toBe(true);
    });

    it('should chain optional operations safely', () => {
      interface User {
        name: string;
        email?: string;
      }

      const user: User = { name: 'Alice' };
      const email = fromNullable(user.email);
      const domain = map((e: string) => e.split('@')[1])(email);

      expect(isNone(domain)).toBe(true);

      const userWithEmail: User = { name: 'Bob', email: 'bob@example.com' };
      const email2 = fromNullable(userWithEmail.email);
      const domain2 = map((e: string) => e.split('@')[1])(email2);

      expect(isSome(domain2)).toBe(true);
      if (isSome(domain2)) {
        expect(domain2.value).toBe('example.com');
      }
    });
  });
});
