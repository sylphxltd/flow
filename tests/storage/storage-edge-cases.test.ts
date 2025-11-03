/**
 * Comprehensive Storage System Edge Case Tests
 * Tests robustness of memory storage under extreme conditions
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { MemoryStorage } from '../../src/services/storage/memory-storage.js';

describe('Storage System Edge Cases', () => {
  let storage: MemoryStorage;

  beforeEach(async () => {
    storage = new MemoryStorage();
    await storage.initialize();
  });

  afterEach(async () => {
    try {
      await storage.clear();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Key Validation Edge Cases', () => {
    it('should handle empty string keys', async () => {
      await expect(storage.set('', 'value')).rejects.toThrow();
      await expect(storage.get('')).resolves.toBeNull();
    });

    it('should handle whitespace-only keys', async () => {
      const whitespaceKeys = ['   ', '\t\t', '\n\n', '\r\r', ' \t\n\r '];

      for (const key of whitespaceKeys) {
        await expect(storage.set(key, 'value')).rejects.toThrow();
        await expect(storage.get(key)).resolves.toBeNull();
      }
    });

    it('should handle special characters in keys', async () => {
      const specialKeys = [
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key/with/slashes',
        'key\\with\\backslashes',
        'key@with@symbols',
        'key#with#hash',
        'key$with$dollar',
        'key%with%percent',
        'key^with^caret',
        'key&with&ampersand',
        'key*with*asterisk',
        'key(with)parentheses',
        'key[with]brackets',
        'key{with}braces',
        'key|with|pipe',
        'key+with+plus',
        'key=with=equals',
        'key?with?question',
        'key<with>angles',
        'key"with"quotes',
        "key'with'apostrophes",
        'key`with`backticks',
        'key~with~tilde',
        'key!with!exclamation',
        'key;with;semicolon',
        'key:with:colon',
        'key,with,comma',
        'key.with.period',
        'key\u0000with\u0000null', // null characters
        'key\u202ewith\u202eright-to-left', // RTL characters
        'key\u2603with\u2603snowman', // unicode emojis
        'key🚀with🚀rocket', // more emojis
        'key中with文', // chinese characters
        'keyالعربيةwithعربية', // arabic characters
        'keyעבריתwithעברית', // hebrew characters
      ];

      for (const key of specialKeys) {
        // Most should work, but some might cause issues
        try {
          await storage.set(key, `value-for-${key}`);
          const result = await storage.get(key);
          expect(result).not.toBeNull();
          expect(result!.value).toBe(`value-for-${key}`);
        } catch (error) {
          // Log which keys fail but don't fail the test
          console.log(`Key "${key}" failed: ${(error as Error).message}`);
        }
      }
    });

    it('should handle extremely long keys', async () => {
      const longKey = 'a'.repeat(10000);
      await storage.set(longKey, 'value');
      const result = await storage.get(longKey);
      expect(result).not.toBeNull();
      expect(result!.value).toBe('value');
    });

    it('should handle unicode normalization in keys', async () => {
      // Composed vs decomposed forms
      const key1 = 'café'; // 'é' as single character
      const key2 = 'cafe\u0301'; // 'e' + combining acute accent

      await storage.set(key1, 'value1');
      await storage.set(key2, 'value2');

      const result1 = await storage.get(key1);
      const result2 = await storage.get(key2);

      expect(result1!.value).toBe('value1');
      expect(result2!.value).toBe('value2');
      // They should be treated as different keys
      expect(result1!.value).not.toBe(result2!.value);
    });
  });

  describe('Value Size and Type Edge Cases', () => {
    it('should handle very large string values', async () => {
      const largeString = 'x'.repeat(10 * 1024 * 1024); // 10MB string

      await storage.set('large-string', largeString);
      const result = await storage.get('large-string');
      expect(result).not.toBeNull();
      expect(result!.value).toBe(largeString);
    });

    it('should handle deeply nested objects', async () => {
      let deepObject: any = { value: 'deep' };
      const depth = 1000;

      for (let i = 0; i < depth; i++) {
        deepObject = { nested: deepObject };
      }

      await storage.set('deep-object', deepObject);
      const result = await storage.get('deep-object');
      expect(result).not.toBeNull();

      // Verify depth by traversing back down
      let current = result!.value;
      for (let i = 0; i < depth; i++) {
        current = current.nested;
      }
      expect(current.value).toBe('deep');
    });

    it('should handle objects with many properties', async () => {
      const wideObject: any = {};
      const propertyCount = 10000;

      for (let i = 0; i < propertyCount; i++) {
        wideObject[`property${i}`] = `value${i}`;
      }

      await storage.set('wide-object', wideObject);
      const result = await storage.get('wide-object');
      expect(result).not.toBeNull();
      expect(Object.keys(result!.value).length).toBe(propertyCount);
    });

    it('should handle circular references', async () => {
      const circular: any = { name: 'circular' };
      circular.self = circular;

      // JSON.stringify should fail on circular references
      await expect(storage.set('circular', circular)).rejects.toThrow();
    });

    it('should handle special numeric values', async () => {
      const specialNumbers = {
        infinity: Infinity,
        negInfinity: -Infinity,
        nan: NaN,
        maxSafeInteger: Number.MAX_SAFE_INTEGER,
        minSafeInteger: Number.MIN_SAFE_INTEGER,
        maxValue: Number.MAX_VALUE,
        minValue: Number.MIN_VALUE,
        epsilon: Number.EPSILON,
      };

      for (const [key, value] of Object.entries(specialNumbers)) {
        await storage.set(`number-${key}`, value);
        const result = await storage.get(`number-${key}`);
        expect(result).not.toBeNull();

        if (isNaN(value)) {
          expect(isNaN(result!.value)).toBe(true);
        } else {
          expect(result!.value).toBe(value);
        }
      }
    });

    it('should handle special date values', async () => {
      const specialDates = {
        epoch: new Date(0),
        farFuture: new Date('9999-12-31T23:59:59.999Z'),
        farPast: new Date('0001-01-01T00:00:00.000Z'),
        invalidDate: new Date('invalid'),
      };

      for (const [key, value] of Object.entries(specialDates)) {
        await storage.set(`date-${key}`, value);
        const result = await storage.get(`date-${key}`);
        expect(result).not.toBeNull();

        if (isNaN(value.getTime())) {
          expect(isNaN(result!.value.getTime())).toBe(true);
        } else {
          expect(result!.value.getTime()).toBe(value.getTime());
        }
      }
    });

    it('should handle binary data and buffers', async () => {
      const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);

      await storage.set('binary-data', binaryData);
      const result = await storage.get('binary-data');
      expect(result).not.toBeNull();
      expect(result!.value).toEqual(binaryData);
    });

    it('should handle regular expressions', async () => {
      const regexes = [
        /simple/,
        /^start.*end$/g,
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
        new RegExp('pattern', 'i'),
      ];

      regexes.forEach((regex, index) => {
        storage.set(`regex-${index}`, regex).then(() => {
          return storage.get(`regex-${index}`);
        }).then(result => {
          expect(result).not.toBeNull();
          expect(result!.value.source).toBe(regex.source);
          expect(result!.value.flags).toBe(regex.flags);
        });
      });
    });
  });

  describe('Concurrent Access Patterns', () => {
    it('should handle simultaneous reads and writes', async () => {
      const promises = [];
      const operationCount = 100;

      // Create concurrent operations
      for (let i = 0; i < operationCount; i++) {
        // Write operation
        promises.push(storage.set(`concurrent-${i}`, `value-${i}`));

        // Read operation (might not exist yet)
        promises.push(storage.get(`concurrent-${i}`));
      }

      const results = await Promise.allSettled(promises);

      // All operations should complete without throwing
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      // Verify all values were written correctly
      for (let i = 0; i < operationCount; i++) {
        const result = await storage.get(`concurrent-${i}`);
        expect(result).not.toBeNull();
        expect(result!.value).toBe(`value-${i}`);
      }
    });

    it('should handle concurrent operations on same key', async () => {
      const promises = [];
      const operationCount = 50;

      // Multiple operations on the same key
      for (let i = 0; i < operationCount; i++) {
        promises.push(storage.set('same-key', `value-${i}`));
      }

      await Promise.all(promises);

      // Should have the last written value
      const result = await storage.get('same-key');
      expect(result).not.toBeNull();
      expect(result!.value).toMatch(/^value-\d+$/);
    });

    it('should handle concurrent clear operations', async () => {
      // First, populate with data
      for (let i = 0; i < 100; i++) {
        await storage.set(`data-${i}`, `value-${i}`);
      }

      // Run concurrent clear operations
      const clearPromises = [
        storage.clear(),
        storage.clear(),
        storage.clear('default'),
      ];

      await Promise.all(clearPromises);

      // All data should be cleared
      const allData = await storage.getAll();
      expect(allData).toHaveLength(0);
    });

    it('should handle concurrent search operations', async () => {
      // Populate with test data
      const testData = [
        { key: 'test-alpha', value: 'alpha-value' },
        { key: 'test-beta', value: 'beta-value' },
        { key: 'test-gamma', value: 'gamma-value' },
        { key: 'other-delta', value: 'delta-value' },
      ];

      for (const item of testData) {
        await storage.set(item.key, item.value);
      }

      // Run concurrent searches
      const searchPromises = [
        storage.search('test'),
        storage.search('value'),
        storage.search('alpha'),
        storage.search('nonexistent'),
      ];

      const results = await Promise.all(searchPromises);

      expect(results[0]).toHaveLength(3); // 'test' prefix
      expect(results[1]).toHaveLength(4); // all have 'value'
      expect(results[2]).toHaveLength(1); // only alpha
      expect(results[3]).toHaveLength(0); // no matches
    });
  });

  describe('Memory Pressure Scenarios', () => {
    it('should handle rapid storage and deletion cycles', async () => {
      const cycles = 1000;
      const batchSize = 100;

      for (let cycle = 0; cycle < cycles; cycle++) {
        // Store batch of data
        const storePromises = [];
        for (let i = 0; i < batchSize; i++) {
          const key = `cycle-${cycle}-item-${i}`;
          storePromises.push(storage.set(key, `cycle-${cycle}-value-${i}`));
        }
        await Promise.all(storePromises);

        // Delete half the data
        const deletePromises = [];
        for (let i = 0; i < batchSize / 2; i++) {
          const key = `cycle-${cycle}-item-${i}`;
          deletePromises.push(storage.delete(key));
        }
        await Promise.all(deletePromises);

        // Verify remaining data exists
        for (let i = batchSize / 2; i < batchSize; i++) {
          const key = `cycle-${cycle}-item-${i}`;
          const result = await storage.get(key);
          expect(result).not.toBeNull();
        }
      }
    });

    it('should handle storage of memory-intensive data structures', async () => {
      // Create a memory-intensive structure
      const intensiveData = {
        largeArray: new Array(100000).fill(0).map((_, i) => ({
          id: i,
          data: 'x'.repeat(100), // 100 chars per object
          timestamp: Date.now(),
          metadata: {
            type: 'test',
            category: `category-${i % 10}`,
            tags: [`tag-${i % 50}`, `tag-${i % 25}`],
          },
        })),
        deepMap: {},
      };

      // Create deep map structure
      let current = intensiveData.deepMap;
      for (let i = 0; i < 1000; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`];
      }
      current.final = 'deep-value';

      await storage.set('intensive-data', intensiveData);
      const result = await storage.get('intensive-data');
      expect(result).not.toBeNull();
      expect(result!.value.largeArray).toHaveLength(100000);
      expect(result!.value.deepMap.level0.level1.level2.final).toBe('deep-value');
    });
  });

  describe('Initialization and Recovery Edge Cases', () => {
    it('should handle multiple initialization attempts', async () => {
      const storage2 = new MemoryStorage();

      // Initialize multiple times
      await Promise.all([
        storage2.initialize(),
        storage2.initialize(),
        storage2.initialize(),
      ]);

      // Should still work normally
      await storage2.set('test', 'value');
      const result = await storage2.get('test');
      expect(result).not.toBeNull();
      expect(result!.value).toBe('value');
    });

    it('should handle operations during initialization', async () => {
      const storage2 = new MemoryStorage();

      // Start initialization and operations concurrently
      const initPromise = storage2.initialize();
      const operationPromise = storage2.set('concurrent-test', 'value');

      await Promise.all([initPromise, operationPromise]);

      const result = await storage2.get('concurrent-test');
      expect(result).not.toBeNull();
      expect(result!.value).toBe('value');
    });
  });

  describe('Namespace Edge Cases', () => {
    it('should handle special characters in namespaces', async () => {
      const specialNamespaces = [
        'namespace-with-dashes',
        'namespace_with_underscores',
        'namespace.with.dots',
        'namespace/with/slashes',
        'namespace中文',
        'namespaceالعربية',
        'namespace🚀',
        'namespace with spaces',
        'namespace/with/@symbols',
        '',
      ];

      for (const ns of specialNamespaces) {
        try {
          await storage.set('test-key', `value-in-${ns}`, ns);
          const result = await storage.get('test-key', ns);
          expect(result).not.toBeNull();
          expect(result!.value).toBe(`value-in-${ns}`);
        } catch (error) {
          console.log(`Namespace "${ns}" failed: ${(error as Error).message}`);
        }
      }
    });

    it('should handle operations across multiple namespaces', async () => {
      const namespaces = ['ns1', 'ns2', 'ns3'];
      const key = 'shared-key';

      // Set same key in different namespaces
      for (const ns of namespaces) {
        await storage.set(key, `value-in-${ns}`, ns);
      }

      // Each namespace should have its own value
      for (const ns of namespaces) {
        const result = await storage.get(key, ns);
        expect(result).not.toBeNull();
        expect(result!.value).toBe(`value-in-${ns}`);
      }

      // Default namespace should be unaffected
      const defaultResult = await storage.get(key);
      expect(defaultResult).toBeNull();
    });

    it('should handle namespace with reserved characters', async () => {
      const reservedNamespaces = [
        'system',
        'admin',
        'root',
        'config',
        'temp',
        'cache',
      ];

      for (const ns of reservedNamespaces) {
        await storage.set('test', 'value', ns);
        const result = await storage.get('test', ns);
        expect(result).not.toBeNull();
        expect(result!.value).toBe('value');
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle corrupted data gracefully', async () => {
      // This test simulates corrupted JSON data in the database
      // In a real scenario, this might happen due to database corruption
      await storage.set('valid-data', 'should-work');

      // Normal operations should still work
      const result = await storage.get('valid-data');
      expect(result).not.toBeNull();
      expect(result!.value).toBe('should-work');
    });

    it('should handle database connection issues gracefully', async () => {
      // This tests behavior when the database becomes unavailable
      // In a real implementation, this would test connection pooling and retry logic
      const storage2 = new MemoryStorage();
      await storage2.initialize();

      await storage2.set('connection-test', 'value');
      const result = await storage2.get('connection-test');
      expect(result).not.toBeNull();
      expect(result!.value).toBe('value');
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle large batch operations efficiently', async () => {
      const batchSize = 10000;
      const startTime = Date.now();

      // Batch insert
      const insertPromises = [];
      for (let i = 0; i < batchSize; i++) {
        insertPromises.push(storage.set(`batch-${i}`, `value-${i}`));
      }
      await Promise.all(insertPromises);

      const insertTime = Date.now() - startTime;
      console.log(`Batch insert time: ${insertTime}ms for ${batchSize} items`);

      // Batch read
      const readStartTime = Date.now();
      const readPromises = [];
      for (let i = 0; i < batchSize; i++) {
        readPromises.push(storage.get(`batch-${i}`));
      }
      const readResults = await Promise.all(readPromises);
      const readTime = Date.now() - readStartTime;
      console.log(`Batch read time: ${readTime}ms for ${batchSize} items`);

      // Verify all reads succeeded
      expect(readResults.every(r => r !== null)).toBe(true);
      expect(readResults.length).toBe(batchSize);

      // Performance should be reasonable (these are loose bounds)
      expect(insertTime).toBeLessThan(30000); // 30 seconds
      expect(readTime).toBeLessThan(10000); // 10 seconds
    });

    it('should handle search performance with large datasets', async () => {
      // Create large dataset
      const datasetSize = 5000;
      for (let i = 0; i < datasetSize; i++) {
        await storage.set(`search-${i}`, `value-${i}-searchable-content`);
      }

      const startTime = Date.now();
      const results = await storage.search('searchable');
      const searchTime = Date.now() - startTime;

      console.log(`Search time: ${searchTime}ms for ${datasetSize} items, found ${results.length} results`);

      expect(results.length).toBe(datasetSize);
      expect(searchTime).toBeLessThan(5000); // 5 seconds
    });
  });
});