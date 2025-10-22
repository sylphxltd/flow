import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryService } from '../../src/services/service-types.js';

// Create a shared memory store for tests
const sharedMemoryStore = new Map<string, any>();

// Create test layer with shared store
const TestMemoryServiceLive = Layer.effect(
  MemoryService,
  Effect.gen(function* () {
    const set = (key: string, value: string, namespace = 'default') =>
      Effect.sync(() => {
        const now = new Date();
        const id = `${namespace}:${key}`;
        const existing = sharedMemoryStore.get(id);

        if (existing) {
          // Update existing entry, preserve createdAt
          const entry = {
            ...existing,
            value,
            updatedAt: now,
          };
          sharedMemoryStore.set(id, entry);
        } else {
          // Create new entry
          const entry = {
            id: crypto.randomUUID(),
            key,
            value,
            namespace,
            createdAt: now,
            updatedAt: now,
          };
          sharedMemoryStore.set(id, entry);
        }
      });

    const get = (key: string, namespace = 'default') =>
      Effect.sync(() => {
        const id = `${namespace}:${key}`;
        return sharedMemoryStore.get(id) || null;
      });

    const list = (namespace?: string, limit?: number) =>
      Effect.sync(() => {
        const entries = Array.from(sharedMemoryStore.values()).filter(
          (entry) => !namespace || namespace === 'all' || entry.namespace === namespace
        );

        entries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        return limit ? entries.slice(0, limit) : entries;
      });

    const deleteEntry = (key: string, namespace = 'default') =>
      Effect.sync(() => {
        const id = `${namespace}:${key}`;
        return sharedMemoryStore.delete(id);
      });

    const clear = (namespace?: string) =>
      Effect.sync(() => {
        if (namespace && namespace !== 'all') {
          for (const [id] of sharedMemoryStore) {
            if (id.startsWith(`${namespace}:`)) {
              sharedMemoryStore.delete(id);
            }
          }
        } else {
          sharedMemoryStore.clear();
        }
      });

    const search = (pattern: string, namespace?: string) =>
      Effect.sync(() => {
        const searchPattern = pattern.replace(/\*/g, '.*');
        const regex = new RegExp(searchPattern, 'i');

        return Array.from(sharedMemoryStore.values()).filter((entry) => {
          const matchesNamespace =
            !namespace || namespace === 'all' || entry.namespace === namespace;
          const matchesPattern = regex.test(entry.key) || regex.test(entry.value);
          return matchesNamespace && matchesPattern;
        });
      });

    return {
      set,
      get,
      list,
      delete: deleteEntry,
      clear,
      search,
    };
  })
);

describe('MemoryService', () => {
  beforeEach(() => {
    // Clear shared memory before each test
    sharedMemoryStore.clear();
  });

  const runTest = (testEffect: Effect.Effect<any, any, any>) => {
    return Effect.runSync(Effect.provide(testEffect, TestMemoryServiceLive)) as any;
  };

  describe('set operation', () => {
    it('should store a value with default namespace', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('test-key', 'test-value');
          const result = yield* memory.get('test-key');

          expect(result).not.toBeNull();
          expect(result?.key).toBe('test-key');
          expect(result?.value).toBe('test-value');
          expect(result?.namespace).toBe('default');
        })
      ));

    it('should store a value with custom namespace', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('test-key', 'test-value', 'custom-namespace');
          const result = yield* memory.get('test-key', 'custom-namespace');

          expect(result).not.toBeNull();
          expect(result?.key).toBe('test-key');
          expect(result?.value).toBe('test-value');
          expect(result?.namespace).toBe('custom-namespace');
        })
      ));

    it('should update existing value', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('test-key', 'original-value');
          const originalResult = yield* memory.get('test-key');

          // Add a small delay to ensure different timestamp
          const start = Date.now();
          while (Date.now() - start < 10) {
            // Wait at least 10ms
          }

          yield* memory.set('test-key', 'updated-value');
          const result = yield* memory.get('test-key');

          expect(result).not.toBeNull();
          expect(result?.value).toBe('updated-value');
          expect(result?.updatedAt.getTime()).toBeGreaterThan(originalResult!.updatedAt.getTime());
        })
      ));

    it('should store complex objects', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const complexValue = { nested: { data: [1, 2, 3] } };
          yield* memory.set('complex-key', JSON.stringify(complexValue));
          const result = yield* memory.get('complex-key');

          expect(result).not.toBeNull();
          expect(JSON.parse(result!.value)).toEqual(complexValue);
        })
      ));
  });

  describe('get operation', () => {
    it('should return null for non-existent key', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const result = yield* memory.get('non-existent-key');

          expect(result).toBeNull();
        })
      ));

    it('should return null for non-existent namespace', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('test-key', 'test-value', 'namespace1');
          const result = yield* memory.get('test-key', 'namespace2');

          expect(result).toBeNull();
        })
      ));
  });

  describe('list operation', () => {
    beforeEach(() => {
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('key1', 'value1', 'ns1');
          yield* memory.set('key2', 'value2', 'ns1');
          yield* memory.set('key3', 'value3', 'ns2');
          yield* memory.set('key4', 'value4', 'default');
        })
      );
    });

    it('should list all entries without namespace filter', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const result = yield* memory.list();

          expect(result).toHaveLength(4);
          expect(result.map((entry) => entry.key)).toEqual(
            expect.arrayContaining(['key1', 'key2', 'key3', 'key4'])
          );
        })
      ));

    it('should list entries filtered by namespace', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const result = yield* memory.list('ns1');

          expect(result).toHaveLength(2);
          expect(result.map((entry) => entry.key)).toEqual(
            expect.arrayContaining(['key1', 'key2'])
          );
          expect(result.every((entry) => entry.namespace === 'ns1')).toBe(true);
        })
      ));

    it('should list entries with limit', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const result = yield* memory.list(undefined, 2);

          expect(result).toHaveLength(2);
        })
      ));

    it('should return entries sorted by updated_at desc', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          // Update entries to create different timestamps
          yield* memory.set('key1', 'updated-value1', 'ns1');
          const start = Date.now();
          while (Date.now() - start < 1) {
            // Wait at least 1ms
          }
          yield* memory.set('key2', 'updated-value2', 'ns1');

          const result = yield* memory.list('ns1');

          expect(result).toHaveLength(2);
          expect(result[0].updatedAt.getTime()).toBeGreaterThanOrEqual(
            result[1].updatedAt.getTime()
          );
        })
      ));
  });

  describe('delete operation', () => {
    it('should delete existing entry', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('test-key', 'test-value');
          const deleteResult = yield* memory.delete('test-key');
          const getResult = yield* memory.get('test-key');

          expect(deleteResult).toBe(true);
          expect(getResult).toBeNull();
        })
      ));

    it('should return false for non-existent entry', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const deleteResult = yield* memory.delete('non-existent-key');

          expect(deleteResult).toBe(false);
        })
      ));

    it('should delete from specific namespace', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('same-key', 'value1', 'ns1');
          yield* memory.set('same-key', 'value2', 'ns2');

          const deleteResult = yield* memory.delete('same-key', 'ns1');
          const result1 = yield* memory.get('same-key', 'ns1');
          const result2 = yield* memory.get('same-key', 'ns2');

          expect(deleteResult).toBe(true);
          expect(result1).toBeNull();
          expect(result2).not.toBeNull();
          expect(result2?.value).toBe('value2');
        })
      ));
  });

  describe('clear operation', () => {
    beforeEach(() => {
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('key1', 'value1', 'ns1');
          yield* memory.set('key2', 'value2', 'ns1');
          yield* memory.set('key3', 'value3', 'ns2');
          yield* memory.set('key4', 'value4', 'default');
        })
      );
    });

    it('should clear specific namespace', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.clear('ns1');

          const ns1Entries = yield* memory.list('ns1');
          const allEntries = yield* memory.list();

          expect(ns1Entries).toHaveLength(0);
          expect(allEntries).toHaveLength(2); // ns2 and default should remain
        })
      ));

    it('should clear all entries', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.clear();

          const allEntries = yield* memory.list();

          expect(allEntries).toHaveLength(0);
        })
      ));
  });

  describe('search operation', () => {
    beforeEach(() => {
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('user:123', 'John Doe', 'users');
          yield* memory.set('user:456', 'Jane Smith', 'users');
          yield* memory.set('config:app', '{"name": "MyApp"}', 'config');
          yield* memory.set('temp:cache', 'cached data', 'temp');
        })
      );
    });

    it('should search by key pattern', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const result = yield* memory.search('user:*');

          expect(result).toHaveLength(2);
          expect(result.map((entry) => entry.key)).toEqual(
            expect.arrayContaining(['user:123', 'user:456'])
          );
        })
      ));

    it('should search by value pattern', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const result = yield* memory.search('*John*');

          expect(result).toHaveLength(1);
          expect(result[0].key).toBe('user:123');
          expect(result[0].value).toBe('John Doe');
        })
      ));

    it('should search within specific namespace', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const result = yield* memory.search('*', 'users');

          expect(result).toHaveLength(2);
          expect(result.every((entry) => entry.namespace === 'users')).toBe(true);
        })
      ));

    it('should be case insensitive', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const result = yield* memory.search('*JOHN*');

          expect(result).toHaveLength(1);
          expect(result[0].key).toBe('user:123');
        })
      ));
  });

  describe('data integrity', () => {
    it('should handle JSON serialization/deserialization', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const originalData = {
            users: ['alice', 'bob'],
            settings: { theme: 'dark', notifications: true },
            metadata: { version: 1, created: new Date().toISOString() },
          };

          yield* memory.set('complex-data', JSON.stringify(originalData));
          const result = yield* memory.get('complex-data');

          expect(result).not.toBeNull();
          expect(JSON.parse(result!.value)).toEqual(originalData);
        })
      ));

    it('should handle invalid JSON gracefully', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('invalid-json', 'not a json string');
          const result = yield* memory.get('invalid-json');

          expect(result).not.toBeNull();
          expect(result!.value).toBe('not a json string');
        })
      ));
  });

  describe('timestamps', () => {
    it('should set created_at and updated_at on creation', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          const beforeSet = new Date();
          yield* memory.set('timestamp-test', 'test-value');
          const afterSet = new Date();

          const result = yield* memory.get('timestamp-test');

          expect(result).not.toBeNull();
          expect(result!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSet.getTime());
          expect(result!.createdAt.getTime()).toBeLessThanOrEqual(afterSet.getTime());
          expect(result!.updatedAt.getTime()).toBe(result!.createdAt.getTime());
        })
      ));

    it('should update updated_at on modification', () =>
      runTest(
        Effect.gen(function* () {
          const memory = yield* MemoryService;

          yield* memory.set('timestamp-test', 'original-value');
          const originalResult = yield* memory.get('timestamp-test');

          // Wait a bit to ensure different timestamp
          const start = Date.now();
          while (Date.now() - start < 10) {
            // Wait at least 10ms
          }

          yield* memory.set('timestamp-test', 'updated-value');
          const updatedResult = yield* memory.get('timestamp-test');

          expect(originalResult).not.toBeNull();
          expect(updatedResult).not.toBeNull();
          expect(updatedResult!.createdAt.getTime()).toBe(originalResult!.createdAt.getTime());
          expect(updatedResult!.updatedAt.getTime()).toBeGreaterThan(
            originalResult!.updatedAt.getTime()
          );
        })
      ));
  });
});
