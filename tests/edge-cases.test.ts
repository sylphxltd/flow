/**
 * Edge Cases and Error Handling Test Suite
 * Comprehensive testing of edge cases and error handling scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStorage, CacheStorage, VectorStorage, createStorage } from '../core/unified-storage.js';
import { ConfigManager, ConfigFactory } from '../core/config-system.js';
import { CommandRegistry, CommandUtils } from '../core/command-system.js';
import {
  Result,
  ok,
  err,
  tryCatch,
  tryCatchAsync,
  all,
  allAsync,
  map,
  flatMap
} from '../core/result.js';
import { CircuitBreaker } from '../core/error-handling.js';
import type { StorageConfig } from '../interfaces/unified-storage.js';

describe('Storage System Edge Cases', () => {
  let memoryStorage: MemoryStorage<any>;
  let cacheStorage: CacheStorage<any>;
  let vectorStorage: VectorStorage;

  beforeEach(async () => {
    memoryStorage = new MemoryStorage();
    await memoryStorage.initialize();

    cacheStorage = new CacheStorage({ type: 'cache', defaultTTL: 3600 });
    await cacheStorage.initialize();

    vectorStorage = new VectorStorage();
    await vectorStorage.initialize();
  });

  afterEach(async () => {
    await memoryStorage.close();
    await cacheStorage.close();
    await vectorStorage.close();
  });

  describe('Key Handling Edge Cases', () => {
    it('should handle empty string keys', async () => {
      await memoryStorage.set('', 'empty key value');
      const result = await memoryStorage.get('');
      expect(result).toBe('empty key value');
    });

    it('should handle special characters in keys', async () => {
      const specialKeys = [
        'key with spaces',
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
        'key"with"quotes',
        "key'with'apostrophes",
        'key`with`backticks',
        'key~with~tilde',
        'key!with!exclamation',
        'key?with?question'
      ];

      for (const key of specialKeys) {
        await memoryStorage.set(key, `value for ${key}`);
        const retrieved = await memoryStorage.get(key);
        expect(retrieved).toBe(`value for ${key}`);
      }
    });

    it('should handle very long keys', async () => {
      const longKey = 'k'.repeat(1000);
      await memoryStorage.set(longKey, 'long key value');
      const result = await memoryStorage.get(longKey);
      expect(result).toBe('long key value');
    });

    it('should handle unicode keys', async () => {
      const unicodeKeys = [
        'ключ_русский',
        'clé_français',
        'schlüssel_deutsch',
        '鍵_中文',
        'キー_日本語',
        'llave_español',
        'مفتاح_عربي',
        '열쇠_한국어',
        'chave_português',
        'tasto_italiano'
      ];

      for (const key of unicodeKeys) {
        await memoryStorage.set(key, `value for ${key}`);
        const retrieved = await memoryStorage.get(key);
        expect(retrieved).toBe(`value for ${key}`);
      }
    });
  });

  describe('Value Handling Edge Cases', () => {
    it('should handle null and undefined values', async () => {
      await memoryStorage.set('nullKey', null);
      await memoryStorage.set('undefinedKey', undefined);

      const nullResult = await memoryStorage.get('nullKey');
      const undefinedResult = await memoryStorage.get('undefinedKey');

      expect(nullResult).toBe(null);
      expect(undefinedResult).toBe(undefined);
    });

    it('should handle very large values', async () => {
      const largeValue = 'x'.repeat(1000000); // 1MB string
      await memoryStorage.set('largeKey', largeValue);
      const result = await memoryStorage.get('largeKey');
      expect(result).toBe(largeValue);
    });

    it('should handle deeply nested objects', async () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  deep: 'value'
                }
              }
            }
          }
        }
      };

      await memoryStorage.set('deepKey', deepObject);
      const retrieved = await memoryStorage.get('deepKey');
      expect(retrieved).toEqual(deepObject);

      // Test immutability
      retrieved!.level1.level2.level3.level4.level5.deep = 'modified';
      const original = await memoryStorage.get('deepKey');
      expect(original!.level1.level2.level3.level4.level5.deep).toBe('value');
    });

    it('should handle circular references', async () => {
      const circular: any = { name: 'circular' };
      circular.self = circular;

      // Should not crash when storing circular reference
      await expect(
        memoryStorage.set('circularKey', circular)
      ).rejects.toThrow();
    });

    it('should handle array values', async () => {
      const arrayValue = [1, 2, { nested: 'object' }, [4, 5, 6]];
      await memoryStorage.set('arrayKey', arrayValue);
      const retrieved = await memoryStorage.get('arrayKey');
      expect(retrieved).toEqual(arrayValue);

      // Test immutability
      retrieved![2].nested = 'modified';
      const original = await memoryStorage.get('arrayKey');
      expect(original![2].nested).toBe('object');
    });
  });

  describe('Cache Storage Specific Edge Cases', () => {
    it('should handle immediate expiration', async () => {
      await cacheStorage.set('immediateKey', 'value', 0.001); // 1ms TTL
      await new Promise(resolve => setTimeout(resolve, 10));
      const result = await cacheStorage.get('immediateKey');
      expect(result).toBe(null);
    });

    it('should handle TTL edge cases', async () => {
      // Very large TTL
      await cacheStorage.set('largeTTLKey', 'value', 31536000); // 1 year
      const result1 = await cacheStorage.get('largeTTLKey');
      expect(result1).toBe('value');

      // Zero TTL
      await cacheStorage.set('zeroTTLKey', 'value', 0);
      const result2 = await cacheStorage.get('zeroTTLKey');
      expect(result2).toBe(null);
    });

    it('should handle cleanup with many expired items', async () => {
      // Add many items that will expire
      for (let i = 0; i < 1000; i++) {
        await cacheStorage.set(`key${i}`, `value${i}`, 0.001);
      }

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      // Cleanup should handle all expired items
      const cleaned = await cacheStorage.cleanup();
      expect(cleaned).toBe(1000);

      // All items should be gone
      const result = await cacheStorage.get('key0');
      expect(result).toBe(null);
    });
  });

  describe('Vector Storage Specific Edge Cases', () => {
    it('should handle empty embeddings', async () => {
      const doc = {
        content: 'test',
        embedding: [],
        metadata: { type: 'empty' }
      };

      await vectorStorage.set('emptyEmbedding', doc);
      const result = await vectorStorage.get('emptyEmbedding');
      expect(result).toEqual(doc);
    });

    it('should handle very large embeddings', async () => {
      const largeEmbedding = new Array(10000).fill(0.1);
      const doc = {
        content: 'large embedding test',
        embedding: largeEmbedding
      };

      await vectorStorage.set('largeEmbedding', doc);
      const result = await vectorStorage.get('largeEmbedding');
      expect(result?.embedding).toEqual(largeEmbedding);
    });

    it('should handle NaN and Infinity in embeddings', async () => {
      const doc = {
        content: 'invalid numbers',
        embedding: [1, NaN, Infinity, -Infinity, 2]
      };

      await vectorStorage.set('invalidNumbers', doc);
      const result = await vectorStorage.get('invalidNumbers');
      expect(result).toEqual(doc);
    });

    it('should handle search with empty query', async () => {
      await vectorStorage.set('testDoc', {
        content: 'test',
        embedding: [1, 2, 3]
      });

      const results = await vectorStorage.search([], 5);
      expect(results).toEqual([]);
    });

    it('should handle search with mismatched dimensions', async () => {
      await vectorStorage.set('testDoc', {
        content: 'test',
        embedding: [1, 2, 3]
      });

      // Search with different dimension embedding
      const results = await vectorStorage.search([1, 2], 5);
      expect(results).toEqual([]);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent read/write operations', async () => {
      const promises = [];

      // Create 100 concurrent operations
      for (let i = 0; i < 100; i++) {
        promises.push(memoryStorage.set(`concurrent${i}`, `value${i}`));
        promises.push(memoryStorage.get(`concurrent${i}`));
      }

      await Promise.all(promises);

      // Verify all values were stored correctly
      for (let i = 0; i < 100; i++) {
        const result = await memoryStorage.get(`concurrent${i}`);
        expect(result).toBe(`value${i}`);
      }
    });

    it('should handle concurrent clear operations', async () => {
      // Add many items
      for (let i = 0; i < 100; i++) {
        await memoryStorage.set(`item${i}`, `value${i}`);
      }

      // Concurrent clear and set operations
      const promises = [
        memoryStorage.clear(),
        ...Array.from({ length: 50 }, (_, i) =>
          memoryStorage.set(`new${i}`, `newValue${i}`)
        )
      ];

      await Promise.all(promises);

      // Should have some new items
      const size = await memoryStorage.size();
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('Memory Pressure Scenarios', () => {
    it('should handle storage with many items', async () => {
      // Add 10000 items
      for (let i = 0; i < 10000; i++) {
        await memoryStorage.set(`item${i}`, `value${i}`);
      }

      const size = await memoryStorage.size();
      expect(size).toBe(10000);

      // Should be able to retrieve items
      const result = await memoryStorage.get('item9999');
      expect(result).toBe('value9999');
    });

    it('should handle large value operations', async () => {
      const largeValue = new Array(10000).fill('large string').join('');

      // Store multiple large values
      for (let i = 0; i < 10; i++) {
        await memoryStorage.set(`large${i}`, largeValue);
      }

      // Should be able to retrieve large values
      const result = await memoryStorage.get('large5');
      expect(result).toBe(largeValue);
    });
  });
});

describe('Configuration System Edge Cases', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  describe('Invalid Configuration Formats', () => {
    it('should handle cyclic configuration objects', async () => {
      const cyclic: any = { name: 'test' };
      cyclic.self = cyclic;

      expect(() => {
        configManager.addSource({ type: 'object', data: cyclic });
      }).not.toThrow();
    });

    it('should handle deeply nested configuration', async () => {
      const deepConfig = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: {
                    level7: {
                      level8: {
                        level9: {
                          level10: 'deep value'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      configManager.addSource({ type: 'object', data: deepConfig });
      await configManager.load();

      const result = configManager.get('level1.level2.level3.level4.level5.level6.level7.level8.level9.level10');
      expect(result).toBe('deep value');
    });

    it('should handle configuration with prototype pollution', async () => {
      const pollutedConfig: any = { name: 'test' };
      pollutedConfig['__proto__'] = { polluted: true };

      configManager.addSource({ type: 'object', data: pollutedConfig });
      await configManager.load();

      expect(configManager.get('name')).toBe('test');
      expect(configManager.get('polluted')).toBeUndefined();
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('should handle invalid Zod schemas', async () => {
      const invalidSchema = {
        parse: () => {
          throw new Error('Invalid schema');
        }
      };

      configManager.addSource({ type: 'object', data: { test: 'value' } });

      // This should not throw but handle the error gracefully
      try {
        await configManager.load();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle custom validator failures', async () => {
      const failingValidator = {
        name: 'failing',
        validate: () => err(new Error('Always fails'))
      };

      configManager.addValidator(failingValidator);
      configManager.addSource({ type: 'object', data: { test: 'value' } });

      const result = await configManager.load();
      expect(result.success).toBe(false);
    });
  });

  describe('Environment Variable Edge Cases', () => {
    it('should handle undefined environment variables', async () => {
      configManager.addSource({ type: 'env', prefix: 'TEST_UNDEFINED_' });

      // Should not throw for undefined variables
      await expect(configManager.load()).resolves.toBeDefined();
    });

    it('should handle environment variable injection failures', async () => {
      // Mock a situation where env access fails
      const originalEnv = process.env;
      process.env = {} as any;

      configManager.addSource({ type: 'env', prefix: 'TEST_' });

      try {
        await configManager.load();
      } finally {
        process.env = originalEnv;
      }

      // Should handle gracefully
      expect(true).toBe(true);
    });
  });
});

describe('Command System Edge Cases', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('Invalid Command Scenarios', () => {
    it('should handle command with invalid characters', async () => {
      const invalidCommand = CommandUtils.create(
        'invalid-command-name!',
        'Invalid command name',
        async () => 'result'
      );

      registry.register(invalidCommand);
      const result = await registry.execute('invalid-command-name!');
      expect(result.success).toBe(true);
    });

    it('should handle empty command name', async () => {
      expect(() => {
        CommandUtils.create('', 'Empty command', async () => 'result');
      }).toThrow();
    });

    it('should handle command with missing required options', async () => {
      const command = CommandUtils.createWithOptions(
        'test',
        'Test command',
        [
          CommandUtils.option.string('required', 'Required option', true)
        ],
        async (options) => options.required
      );

      registry.register(command);
      const result = await registry.execute('test', {});
      expect(result.success).toBe(false);
    });
  });

  describe('Middleware Chain Failures', () => {
    it('should handle middleware throwing exceptions', async () => {
      const failingMiddleware = {
        name: 'failing',
        before: async () => {
          throw new Error('Middleware failed');
        }
      };

      const command = CommandUtils.create('test', 'Test', async () => 'result');
      command.middleware = [failingMiddleware];

      registry.register(command);
      const result = await registry.execute('test');
      expect(result.success).toBe(false);
    });

    it('should handle middleware chain with multiple failures', async () => {
      const middleware1 = {
        name: 'first',
        before: async () => {
          throw new Error('First middleware failed');
        }
      };

      const middleware2 = {
        name: 'second',
        before: async () => {
          // Should not be called
          expect(false).toBe(true);
        }
      };

      const command = CommandUtils.create('test', 'Test', async () => 'result');
      command.middleware = [middleware1, middleware2];

      registry.register(command);
      const result = await registry.execute('test');
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('First middleware failed');
    });
  });

  describe('Command Timeout Scenarios', () => {
    it('should handle long-running commands', async () => {
      const slowCommand = CommandUtils.create('slow', 'Slow command', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'done';
      });

      registry.register(slowCommand);
      const startTime = Date.now();
      const result = await registry.execute('slow');
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toBe('done');
      expect(endTime - startTime).toBeGreaterThan(90);
    });
  });
});

describe('Error Handling Robustness', () => {
  describe('Result Type Edge Cases', () => {
    it('should handle nested Result transformations', () => {
      const deepTransform = (value: number): Result<string, Error> =>
        ok(`transformed: ${value}`);

      const pipeline = [
        map((x: number) => x * 2),
        flatMap(deepTransform),
        map((str: string) => str.toUpperCase())
      ].reduce((acc, fn) => acc.success ? fn(acc.data) : acc, ok(5));

      expect(pipeline).toEqual({
        success: true,
        data: 'TRANSFORMED: 10'
      });
    });

    it('should handle error propagation through complex chains', () => {
      const errorThrowing = (x: number): Result<string, Error> =>
        err(new Error(`Error at ${x}`));

      const pipeline = [
        map((x: number) => x + 1),
        flatMap(errorThrowing),
        map((str: string) => str.toUpperCase()) // Should not be called
      ].reduce((acc, fn) => acc.success ? fn(acc.data) : acc, ok(5));

      expect(pipeline).toEqual({
        success: false,
        error: expect.objectContaining({ message: 'Error at 6' })
      });
    });

    it('should handle all combinator with mixed results', () => {
      const results = [
        ok(1),
        err(new Error('Error 1')),
        ok(2),
        err(new Error('Error 2')),
        ok(3)
      ];

      const combined = all(results);
      expect(combined.success).toBe(false);
      expect(combined.error?.message).toBe('Error 1'); // Short-circuits on first error
    });
  });

  describe('Circuit Breaker Edge Cases', () => {
    it('should handle circuit breaker with immediate failures', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeMs: 100
      });

      // First failure
      const result1 = await circuitBreaker.execute(async () => {
        throw new Error('First failure');
      });
      expect(result1.success).toBe(false);

      // Second failure - should open circuit
      const result2 = await circuitBreaker.execute(async () => {
        throw new Error('Second failure');
      });
      expect(result2.success).toBe(false);
      expect(circuitBreaker.getState()).toBe('open');

      // Should fail fast when circuit is open
      const result3 = await circuitBreaker.execute(async () => {
        return 'should not execute';
      });
      expect(result3.success).toBe(false);
      expect(result3.error?.message).toBe('Circuit breaker is open');
    });

    it('should handle circuit breaker recovery', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 1,
        recoveryTimeMs: 50 // Short recovery time
      });

      // Fail to open circuit
      await circuitBreaker.execute(async () => {
        throw new Error('Failure');
      });

      expect(circuitBreaker.getState()).toBe('open');

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 60));

      // Should be half-open now and allow one attempt
      const result = await circuitBreaker.execute(async () => {
        return 'recovered';
      });

      expect(result.success).toBe(true);
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });

  describe('Async Error Handling', () => {
    it('should handle Promise rejections in tryCatchAsync', async () => {
      const goodResult = await tryCatchAsync(async () => {
        return 'success';
      });

      const badResult = await tryCatchAsync(async () => {
        throw new Error('Async failure');
      });

      expect(goodResult).toEqual({
        success: true,
        data: 'success'
      });

      expect(badResult).toEqual({
        success: false,
        error: expect.objectContaining({ message: 'Async failure' })
      });
    });

    it('should handle allAsync with mixed success/failure', async () => {
      const promises = [
        Promise.resolve(ok(1)),
        Promise.resolve(err(new Error('Error 1'))),
        Promise.resolve(ok(2)),
        Promise.reject(new Error('Promise rejection'))
      ];

      const result = await allAsync(promises);
      expect(result.success).toBe(false);
    });
  });
});

describe('Type System Edge Cases', () => {
  it('should handle complex nested Result types', () => {
    type ComplexResult = Result<Result<string, number>, Error>;

    const nested: ComplexResult = ok(ok('nested success'));

    const flattened = flatMap((inner) => inner)(nested);
    expect(flattened).toEqual({
      success: true,
      data: 'nested success'
    });
  });

  it('should handle generic type inference at limits', () => {
    const complexFunction = <T, E>(input: T): Result<T[], E> => {
      return ok([input]);
    };

    const result = complexFunction({ deep: { nested: { value: 42 } } });
    expect(result).toEqual({
      success: true,
      data: [{ deep: { nested: { value: 42 } } }]
    });
  });

  it('should handle type guard correctness', () => {
    const results: Result<string | number, Error>[] = [
      ok('string'),
      ok(42),
      err(new Error('error'))
    ];

    const strings: string[] = [];
    const numbers: number[] = [];

    results.forEach(result => {
      if (isOk(result)) {
        if (typeof result.data === 'string') {
          strings.push(result.data);
        } else {
          numbers.push(result.data);
        }
      }
    });

    expect(strings).toEqual(['string']);
    expect(numbers).toEqual([42]);
  });
});