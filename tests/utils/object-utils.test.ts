/**
 * Object Utils Tests
 * Tests for nested object manipulation utilities
 */

import { describe, expect, it } from 'vitest';
import {
  getNestedProperty,
  setNestedProperty,
  deleteNestedProperty,
} from '../../src/utils/object-utils.js';

describe('Object Utils', () => {
  describe('getNestedProperty', () => {
    it('should get top-level property', () => {
      const obj = { name: 'John', age: 30 };
      expect(getNestedProperty(obj, 'name')).toBe('John');
      expect(getNestedProperty(obj, 'age')).toBe(30);
    });

    it('should get nested property', () => {
      const obj = { user: { name: 'John', age: 30 } };
      expect(getNestedProperty(obj, 'user.name')).toBe('John');
      expect(getNestedProperty(obj, 'user.age')).toBe(30);
    });

    it('should get deeply nested property', () => {
      const obj = { a: { b: { c: { d: 'value' } } } };
      expect(getNestedProperty(obj, 'a.b.c.d')).toBe('value');
    });

    it('should return undefined for non-existent property', () => {
      const obj = { name: 'John' };
      expect(getNestedProperty(obj, 'age')).toBeUndefined();
    });

    it('should return undefined for non-existent nested property', () => {
      const obj = { user: { name: 'John' } };
      expect(getNestedProperty(obj, 'user.age')).toBeUndefined();
    });

    it('should handle null values', () => {
      const obj = { user: null };
      expect(getNestedProperty(obj, 'user.name')).toBeUndefined();
    });

    it('should handle undefined values', () => {
      const obj = { user: undefined };
      expect(getNestedProperty(obj, 'user.name')).toBeUndefined();
    });

    it('should get array values', () => {
      const obj = { items: [1, 2, 3] };
      expect(getNestedProperty(obj, 'items')).toEqual([1, 2, 3]);
    });

    it('should get nested array values', () => {
      const obj = { data: { items: [1, 2, 3] } };
      expect(getNestedProperty(obj, 'data.items')).toEqual([1, 2, 3]);
    });

    it('should handle boolean values', () => {
      const obj = { active: true, disabled: false };
      expect(getNestedProperty(obj, 'active')).toBe(true);
      expect(getNestedProperty(obj, 'disabled')).toBe(false);
    });

    it('should handle number values', () => {
      const obj = { count: 0, total: 100 };
      expect(getNestedProperty(obj, 'count')).toBe(0);
      expect(getNestedProperty(obj, 'total')).toBe(100);
    });

    it('should return undefined for empty string path', () => {
      const obj = { name: 'John' };
      // Empty string splits to [''], which accesses obj[''] -> undefined
      expect(getNestedProperty(obj, '')).toBeUndefined();
    });

    it('should handle object with special keys', () => {
      const obj = { 'user-name': 'John', 'user_id': 123 };
      expect(getNestedProperty(obj, 'user-name')).toBe('John');
      expect(getNestedProperty(obj, 'user_id')).toBe(123);
    });
  });

  describe('setNestedProperty', () => {
    it('should set top-level property', () => {
      const obj = {};
      setNestedProperty(obj, 'name', 'John');
      expect(obj).toEqual({ name: 'John' });
    });

    it('should set nested property', () => {
      const obj = {};
      setNestedProperty(obj, 'user.name', 'John');
      expect(obj).toEqual({ user: { name: 'John' } });
    });

    it('should set deeply nested property', () => {
      const obj = {};
      setNestedProperty(obj, 'a.b.c.d', 'value');
      expect(obj).toEqual({ a: { b: { c: { d: 'value' } } } });
    });

    it('should overwrite existing property', () => {
      const obj = { name: 'John' };
      setNestedProperty(obj, 'name', 'Jane');
      expect(obj.name).toBe('Jane');
    });

    it('should overwrite existing nested property', () => {
      const obj = { user: { name: 'John' } };
      setNestedProperty(obj, 'user.name', 'Jane');
      expect(obj.user.name).toBe('Jane');
    });

    it('should create intermediate objects', () => {
      const obj = { user: {} };
      setNestedProperty(obj, 'user.profile.name', 'John');
      expect(obj).toEqual({ user: { profile: { name: 'John' } } });
    });

    it('should handle array values', () => {
      const obj = {};
      setNestedProperty(obj, 'items', [1, 2, 3]);
      expect(obj).toEqual({ items: [1, 2, 3] });
    });

    it('should handle boolean values', () => {
      const obj = {};
      setNestedProperty(obj, 'active', true);
      expect(obj).toEqual({ active: true });
    });

    it('should handle number values', () => {
      const obj = {};
      setNestedProperty(obj, 'count', 0);
      expect(obj).toEqual({ count: 0 });
    });

    it('should handle null values', () => {
      const obj = {};
      setNestedProperty(obj, 'value', null);
      expect(obj).toEqual({ value: null });
    });

    it('should handle undefined values', () => {
      const obj = {};
      setNestedProperty(obj, 'value', undefined);
      expect(obj).toEqual({ value: undefined });
    });

    it('should preserve other properties', () => {
      const obj = { name: 'John', age: 30 };
      setNestedProperty(obj, 'email', 'john@example.com');
      expect(obj).toEqual({ name: 'John', age: 30, email: 'john@example.com' });
    });

    it('should preserve other nested properties', () => {
      const obj = { user: { name: 'John', age: 30 } };
      setNestedProperty(obj, 'user.email', 'john@example.com');
      expect(obj).toEqual({ user: { name: 'John', age: 30, email: 'john@example.com' } });
    });

    it('should replace non-object with object when needed', () => {
      const obj = { user: 'string' };
      setNestedProperty(obj, 'user.name', 'John');
      expect(obj).toEqual({ user: { name: 'John' } });
    });
  });

  describe('deleteNestedProperty', () => {
    it('should delete top-level property', () => {
      const obj = { name: 'John', age: 30 };
      deleteNestedProperty(obj, 'name');
      expect(obj).toEqual({ age: 30 });
    });

    it('should delete nested property', () => {
      const obj = { user: { name: 'John', age: 30 } };
      deleteNestedProperty(obj, 'user.name');
      expect(obj).toEqual({ user: { age: 30 } });
    });

    it('should delete deeply nested property', () => {
      const obj = { a: { b: { c: { d: 'value', e: 'other' } } } };
      deleteNestedProperty(obj, 'a.b.c.d');
      expect(obj).toEqual({ a: { b: { c: { e: 'other' } } } });
    });

    it('should handle deleting non-existent property', () => {
      const obj = { name: 'John' };
      deleteNestedProperty(obj, 'age');
      expect(obj).toEqual({ name: 'John' });
    });

    it('should handle deleting non-existent nested property', () => {
      const obj = { user: { name: 'John' } };
      deleteNestedProperty(obj, 'user.age');
      expect(obj).toEqual({ user: { name: 'John' } });
    });

    it('should create intermediate objects if missing', () => {
      const obj = {};
      deleteNestedProperty(obj, 'user.profile.name');
      expect(obj).toEqual({ user: { profile: {} } });
    });

    it('should preserve other properties', () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      deleteNestedProperty(obj, 'age');
      expect(obj).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should preserve other nested properties', () => {
      const obj = { user: { name: 'John', age: 30, email: 'john@example.com' } };
      deleteNestedProperty(obj, 'user.age');
      expect(obj).toEqual({ user: { name: 'John', email: 'john@example.com' } });
    });

    it('should handle replacing non-object with object', () => {
      const obj = { user: 'string' };
      deleteNestedProperty(obj, 'user.name');
      expect(obj).toEqual({ user: {} });
    });
  });

  describe('Integration', () => {
    it('should support get-set-delete workflow', () => {
      const obj = {};

      // Set
      setNestedProperty(obj, 'user.name', 'John');
      setNestedProperty(obj, 'user.age', 30);

      // Get
      expect(getNestedProperty(obj, 'user.name')).toBe('John');
      expect(getNestedProperty(obj, 'user.age')).toBe(30);

      // Delete
      deleteNestedProperty(obj, 'user.age');
      expect(getNestedProperty(obj, 'user.age')).toBeUndefined();
      expect(getNestedProperty(obj, 'user.name')).toBe('John');
    });

    it('should handle complex nested structures', () => {
      const obj = {};

      setNestedProperty(obj, 'app.config.database.host', 'localhost');
      setNestedProperty(obj, 'app.config.database.port', 5432);
      setNestedProperty(obj, 'app.config.cache.enabled', true);

      expect(getNestedProperty(obj, 'app.config.database.host')).toBe('localhost');
      expect(getNestedProperty(obj, 'app.config.database.port')).toBe(5432);
      expect(getNestedProperty(obj, 'app.config.cache.enabled')).toBe(true);

      deleteNestedProperty(obj, 'app.config.database.port');
      expect(getNestedProperty(obj, 'app.config.database.port')).toBeUndefined();
      expect(getNestedProperty(obj, 'app.config.database.host')).toBe('localhost');
    });

    it('should handle multiple operations on same object', () => {
      const obj = { user: { name: 'John' } };

      setNestedProperty(obj, 'user.age', 30);
      expect(getNestedProperty(obj, 'user.age')).toBe(30);

      setNestedProperty(obj, 'user.email', 'john@example.com');
      expect(getNestedProperty(obj, 'user.email')).toBe('john@example.com');

      deleteNestedProperty(obj, 'user.age');
      expect(getNestedProperty(obj, 'user.age')).toBeUndefined();

      expect(obj).toEqual({ user: { name: 'John', email: 'john@example.com' } });
    });
  });
});
