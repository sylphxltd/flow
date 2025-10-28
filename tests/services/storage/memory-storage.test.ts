/**
 * Memory Storage Tests
 * Tests for the MemoryStorage class
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryStorage } from '../../../src/services/storage/memory-storage.js';

describe('Memory Storage', () => {
  let storage: MemoryStorage;
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create temp directory
    testDir = join(tmpdir(), `memory-storage-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Change to test directory
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Create fresh storage instance
    storage = new MemoryStorage();
    await storage.initialize();
  });

  afterEach(async () => {
    // Clean up
    try {
      await storage.clear('default');
      await storage.clear('test-namespace');
    } catch {
      // Ignore cleanup errors
    }

    // Restore original directory
    process.chdir(originalCwd);

    // Remove test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should initialize storage', async () => {
      const newStorage = new MemoryStorage();
      await expect(newStorage.initialize()).resolves.not.toThrow();
    });
  });

  describe('set and get', () => {
    it('should store and retrieve string value', async () => {
      await storage.set('test-key', 'test-value');
      const entry = await storage.get('test-key');

      expect(entry).toBeDefined();
      expect(entry?.key).toBe('test-key');
      expect(entry?.value).toBe('test-value');
      expect(entry?.namespace).toBe('default');
    });

    it('should store and retrieve number value', async () => {
      await storage.set('number-key', 42);
      const entry = await storage.get('number-key');

      expect(entry?.value).toBe(42);
    });

    it('should store and retrieve boolean value', async () => {
      await storage.set('bool-key', true);
      const entry = await storage.get('bool-key');

      expect(entry?.value).toBe(true);
    });

    it('should store and retrieve object value', async () => {
      const obj = { name: 'test', nested: { value: 123 } };
      await storage.set('obj-key', obj);
      const entry = await storage.get('obj-key');

      expect(entry?.value).toEqual(obj);
    });

    it('should store and retrieve array value', async () => {
      const arr = [1, 2, 3, 'four', { five: 5 }];
      await storage.set('arr-key', arr);
      const entry = await storage.get('arr-key');

      expect(entry?.value).toEqual(arr);
    });

    it('should store with custom namespace', async () => {
      await storage.set('key1', 'value1', 'custom-ns');
      const entry = await storage.get('key1', 'custom-ns');

      expect(entry).toBeDefined();
      expect(entry?.namespace).toBe('custom-ns');
      expect(entry?.value).toBe('value1');
    });

    it('should return null for non-existent key', async () => {
      const entry = await storage.get('non-existent');
      expect(entry).toBeNull();
    });

    it('should update existing entry', async () => {
      await storage.set('update-key', 'original');
      await storage.set('update-key', 'updated');

      const entry = await storage.get('update-key');
      expect(entry?.value).toBe('updated');
    });

    it('should have timestamp in entry', async () => {
      await storage.set('time-key', 'value');
      const entry = await storage.get('time-key');

      expect(entry?.timestamp).toBeGreaterThan(0);
      expect(entry?.created_at).toBeDefined();
      expect(entry?.updated_at).toBeDefined();
    });

    it('should isolate namespaces', async () => {
      await storage.set('shared-key', 'ns1-value', 'namespace1');
      await storage.set('shared-key', 'ns2-value', 'namespace2');

      const entry1 = await storage.get('shared-key', 'namespace1');
      const entry2 = await storage.get('shared-key', 'namespace2');

      expect(entry1?.value).toBe('ns1-value');
      expect(entry2?.value).toBe('ns2-value');
    });
  });

  describe('getAll', () => {
    beforeEach(async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      await storage.set('key3', 'value3', 'other-ns');
    });

    it('should get all entries in default namespace', async () => {
      const entries = await storage.getAll('default');

      expect(entries.length).toBeGreaterThanOrEqual(2);
      const keys = entries.map((e) => e.key);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should filter by namespace', async () => {
      const entries = await storage.getAll('other-ns');

      expect(entries.length).toBe(1);
      expect(entries[0].key).toBe('key3');
    });

    it('should get all entries across namespaces', async () => {
      const entries = await storage.getAll('all');

      expect(entries.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array for non-existent namespace', async () => {
      const entries = await storage.getAll('non-existent-ns');

      expect(entries).toEqual([]);
    });

    it('should order by timestamp descending', async () => {
      // Clear first
      await storage.clear('default');

      await storage.set('first', 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await storage.set('second', 2);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await storage.set('third', 3);

      const entries = await storage.getAll('default');

      // Most recent should be first
      expect(entries[0].key).toBe('third');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await storage.set('user:1', { name: 'Alice', role: 'admin' });
      await storage.set('user:2', { name: 'Bob', role: 'user' });
      await storage.set('config:theme', 'dark');
      await storage.set('config:language', 'en');
    });

    it('should search by key pattern', async () => {
      const results = await storage.search('user:');

      expect(results.length).toBe(2);
      expect(results.map((r) => r.key)).toContain('user:1');
      expect(results.map((r) => r.key)).toContain('user:2');
    });

    it('should search by value pattern', async () => {
      const results = await storage.search('admin');

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.key === 'user:1')).toBe(true);
    });

    it('should search in specific namespace', async () => {
      await storage.set('test-key', 'test-value', 'search-ns');

      const results = await storage.search('test', 'search-ns');

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every((r) => r.namespace === 'search-ns')).toBe(true);
    });

    it('should return empty array when no matches', async () => {
      const results = await storage.search('xyz-nonexistent-pattern');

      expect(results).toEqual([]);
    });

    it('should search across all namespaces', async () => {
      await storage.set('key1', 'search-me', 'ns1');
      await storage.set('key2', 'search-me', 'ns2');

      const results = await storage.search('search-me', 'all');

      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('delete', () => {
    it('should delete existing entry', async () => {
      await storage.set('delete-key', 'value');
      const deleted = await storage.delete('delete-key');

      expect(deleted).toBe(true);

      const entry = await storage.get('delete-key');
      expect(entry).toBeNull();
    });

    it('should handle delete from specific namespace', async () => {
      await storage.set('key', 'value', 'delete-ns');
      const deleted = await storage.delete('key', 'delete-ns');

      expect(deleted).toBe(true);

      const entry = await storage.get('key', 'delete-ns');
      expect(entry).toBeNull();
    });

    it('should not delete from different namespace', async () => {
      await storage.set('shared-key', 'value1', 'ns1');
      await storage.set('shared-key', 'value2', 'ns2');

      await storage.delete('shared-key', 'ns1');

      const entry1 = await storage.get('shared-key', 'ns1');
      const entry2 = await storage.get('shared-key', 'ns2');

      expect(entry1).toBeNull();
      expect(entry2).toBeDefined();
      expect(entry2?.value).toBe('value2');
    });

    it('should handle non-existent key gracefully', async () => {
      const deleted = await storage.delete('non-existent');
      expect(typeof deleted).toBe('boolean');
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await storage.set('key1', 'value1', 'clear-ns');
      await storage.set('key2', 'value2', 'clear-ns');
      await storage.set('key3', 'value3', 'other-ns');
    });

    it('should clear all entries in namespace', async () => {
      await storage.clear('clear-ns');

      const entries = await storage.getAll('clear-ns');
      expect(entries.length).toBe(0);
    });

    it('should not affect other namespaces', async () => {
      await storage.clear('clear-ns');

      const otherEntries = await storage.getAll('other-ns');
      expect(otherEntries.length).toBe(1);
    });

    it('should clear default namespace', async () => {
      await storage.set('default-key', 'value');
      await storage.clear('default');

      const entries = await storage.getAll('default');
      const hasDefaultKey = entries.some((e) => e.key === 'default-key');
      expect(hasDefaultKey).toBe(false);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await storage.clear('default');
      await storage.clear('ns1');
      await storage.clear('ns2');
    });

    it('should return statistics for all namespaces', async () => {
      await storage.set('key1', 'value1', 'ns1');
      await storage.set('key2', 'value2', 'ns1');
      await storage.set('key3', 'value3', 'ns2');

      const stats = await storage.getStats();

      expect(stats.totalEntries).toBeGreaterThanOrEqual(3);
      expect(stats.namespaces).toContain('ns1');
      expect(stats.namespaces).toContain('ns2');
    });

    it('should return statistics for specific namespace', async () => {
      await storage.set('key1', 'value1', 'specific-ns');
      await storage.set('key2', 'value2', 'specific-ns');

      const stats = await storage.getStats('specific-ns');

      expect(stats.totalEntries).toBe(2);
    });

    it('should return zero entries for empty namespace', async () => {
      const stats = await storage.getStats('empty-ns');

      expect(stats.totalEntries).toBe(0);
    });

    it('should include all unique namespaces', async () => {
      await storage.set('k1', 'v1', 'ns1');
      await storage.set('k2', 'v2', 'ns2');
      await storage.set('k3', 'v3', 'ns3');

      const stats = await storage.getStats();

      expect(stats.namespaces.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle serialization errors gracefully', async () => {
      const circular: any = {};
      circular.self = circular;

      await expect(storage.set('circular', circular)).rejects.toThrow(
        /Failed to set memory entry|Failed to serialize/
      );
    });

    it('should handle complex nested objects', async () => {
      const complex = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
                array: [1, 2, { nested: true }],
              },
            },
          },
        },
      };

      await storage.set('complex', complex);
      const entry = await storage.get('complex');

      expect(entry?.value).toEqual(complex);
    });

    it('should handle null values', async () => {
      await storage.set('null-key', null);
      const entry = await storage.get('null-key');

      expect(entry?.value).toBeNull();
    });

    it('should handle undefined value', async () => {
      // undefined values should be handled gracefully
      try {
        await storage.set('undefined-key', undefined);
        const entry = await storage.get('undefined-key');
        // If it succeeds, value should be null or undefined
        expect([null, undefined]).toContain(entry?.value);
      } catch (error: any) {
        // Some databases may not accept null/undefined values
        expect(error.message).toContain('Failed');
      }
    });

    it('should handle empty string', async () => {
      await storage.set('empty-string', '');
      const entry = await storage.get('empty-string');

      expect(entry?.value).toBe('');
    });

    it('should handle large objects', async () => {
      const large = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `value-${i}`,
        })),
      };

      await storage.set('large', large);
      const entry = await storage.get('large');

      expect(entry?.value).toEqual(large);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow', async () => {
      // Create
      await storage.set('workflow-key', { status: 'pending' });

      // Read
      let entry = await storage.get('workflow-key');
      expect(entry?.value).toEqual({ status: 'pending' });

      // Update
      await storage.set('workflow-key', { status: 'complete' });
      entry = await storage.get('workflow-key');
      expect(entry?.value).toEqual({ status: 'complete' });

      // Search
      const results = await storage.search('workflow');
      expect(results.length).toBeGreaterThanOrEqual(1);

      // Delete
      await storage.delete('workflow-key');
      entry = await storage.get('workflow-key');
      expect(entry).toBeNull();
    });

    it('should handle multiple namespaces simultaneously', async () => {
      // Write to multiple namespaces
      await storage.set('key', 'value1', 'ns1');
      await storage.set('key', 'value2', 'ns2');
      await storage.set('key', 'value3', 'ns3');

      // Read from each
      const e1 = await storage.get('key', 'ns1');
      const e2 = await storage.get('key', 'ns2');
      const e3 = await storage.get('key', 'ns3');

      expect(e1?.value).toBe('value1');
      expect(e2?.value).toBe('value2');
      expect(e3?.value).toBe('value3');

      // Clear one namespace
      await storage.clear('ns2');

      // Verify others unaffected
      expect(await storage.get('key', 'ns1')).toBeDefined();
      expect(await storage.get('key', 'ns2')).toBeNull();
      expect(await storage.get('key', 'ns3')).toBeDefined();
    });

    it('should maintain data consistency across operations', async () => {
      // Rapid writes
      for (let i = 0; i < 10; i++) {
        await storage.set(`rapid-${i}`, i);
      }

      // Verify all written
      for (let i = 0; i < 10; i++) {
        const entry = await storage.get(`rapid-${i}`);
        expect(entry?.value).toBe(i);
      }

      // Bulk delete
      for (let i = 0; i < 10; i++) {
        await storage.delete(`rapid-${i}`);
      }

      // Verify all deleted
      const remaining = await storage.getAll('default');
      const rapidKeys = remaining.filter((e) => e.key.startsWith('rapid-'));
      expect(rapidKeys.length).toBe(0);
    });
  });
});
