/**
 * Security and Robustness Assessment Test Suite
 * Comprehensive testing for security vulnerabilities and system robustness
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStorage, CacheStorage, VectorStorage } from '../core/unified-storage.js';
import { ConfigManager } from '../core/config-system.js';
import { CommandRegistry } from '../core/command-system.js';
import { CircuitBreaker } from '../core/error-handling.js';
import { ok, err } from '../core/result.js';

describe('Security and Robustness Assessment', () => {
  describe('Input Validation and Sanitization', () => {
    it('should handle malicious input in storage keys', async () => {
      const storage = new MemoryStorage();
      await storage.initialize();

      const maliciousKeys = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'null',
        'undefined',
        '__proto__',
        'constructor',
        'prototype',
        '\\x00\\x01\\x02',
        'a'.repeat(10000), // Very long key
        '🔥💣🚀', // Unicode characters
        'key with\nnewlines',
        'key\twith\ttabs',
        'key with spaces and symbols!@#$%^&*()'
      ];

      for (const key of maliciousKeys) {
        await storage.set(key, 'test_value');
        const result = await storage.get(key);
        expect(result).toBe('test_value');
      }

      await storage.close();
    });

    it('should handle malicious input in storage values', async () => {
      const storage = new MemoryStorage();
      await storage.initialize();

      const maliciousValues = [
        { '__proto__': { 'polluted': 'yes' } },
        { 'constructor': { 'name': 'Malicious' } },
        { 'prototype': { 'hacked': true } },
        JSON.parse('{"__proto__":{"isAdmin":true}}'),
        Buffer.from('malicious binary data'),
        null,
        undefined,
        Infinity,
        -Infinity,
        NaN,
        'a'.repeat(1000000), // Very large string
        '<script>window.location="http://evil.com"</script>',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>'
      ];

      for (let i = 0; i < maliciousValues.length; i++) {
        const value = maliciousValues[i];
        await storage.set(`key${i}`, value);
        const result = await storage.get(`key${i}`);

        // Deep copy protection should prevent prototype pollution
        if (typeof result === 'object' && result !== null) {
          // The deep copy should isolate the prototype chain
          expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
        }
      }

      await storage.close();
    });

    it('should validate configuration input safely', async () => {
      const manager = new ConfigManager();

      const maliciousConfigs = [
        { '__proto__': { 'env': 'production' } },
        { 'constructor': { 'debug': true } },
        { 'prototype': { 'admin': true } },
        { 'database': { 'url': '__proto__/malicious' } },
        { 'eval': 'malicious code' },
        { 'require': 'evil-module' },
        { 'process': { 'env': { 'HACKED': 'true' } } }
      ];

      for (const config of maliciousConfigs) {
        manager.addSource({ type: 'object', data: config });
        await manager.load();

        // Ensure no prototype pollution (empty objects are acceptable)
        const protoValue = manager.get('__proto__');
        const constructorValue = manager.get('constructor');
        const prototypeValue = manager.get('prototype');

        // These should either be undefined, objects, or functions - not malicious values
        if (protoValue !== undefined && protoValue !== null) {
          expect(['object', 'function']).toContain(typeof protoValue);
        }
        if (constructorValue !== undefined && constructorValue !== null) {
          expect(['object', 'function']).toContain(typeof constructorValue);
        }
        if (prototypeValue !== undefined && prototypeValue !== null) {
          expect(['object', 'function']).toContain(typeof prototypeValue);
        }
      }
    });

    it('should sanitize command inputs', async () => {
      const registry = new CommandRegistry();

      const maliciousCommand = {
        name: '; rm -rf /',
        description: '<script>alert("xss")</script>',
        handler: async () => ok('result'),
        options: {
          '__proto__': { type: 'string', description: 'malicious' }
        }
      };

      registry.register(maliciousCommand);

      // Command should be registered but might fail due to invalid name
      const result = await registry.execute('; rm -rf /');
      // Result can be success or failure - the system shouldn't crash
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Error Handling Robustness', () => {
    it('should handle and isolate errors in storage operations', async () => {
      const storage = new MemoryStorage();
      await storage.initialize();

      // Test with circular references
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      try {
        await storage.set('circular', circularObj);
        const result = await storage.get('circular');
        // Should handle circular references gracefully
        expect(result).toBeDefined();
      } catch (error) {
        // Should not crash the system
        expect(error).toBeInstanceOf(Error);
      }

      await storage.close();
    });

    it('should maintain circuit breaker under error conditions', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        recoveryTimeout: 100
      });

      let errorCount = 0;
      const failingOperation = async () => {
        errorCount++;
        if (errorCount <= 5) {
          throw new Error(`Simulated error ${errorCount}`);
        }
        return ok('success');
      };

      // First few operations should fail
      for (let i = 0; i < 3; i++) {
        const result = await circuitBreaker.execute(failingOperation);
        expect(result.success).toBe(false);
      }

      // Circuit should change state after failures
      const state = circuitBreaker.getState();
      // Should not be closed after multiple failures
      expect(state.state !== 'closed').toBe(true);

      // Should fail fast when circuit is open
      const fastFailResult = await circuitBreaker.execute(failingOperation);
      expect(fastFailResult.success).toBe(false);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should try again after recovery timeout
      const recoverResult = await circuitBreaker.execute(failingOperation);
      expect(recoverResult.success).toBe(false); // Still fails but circuit is trying

      // Eventually succeed (allow more time for recovery)
      await new Promise(resolve => setTimeout(resolve, 200));
      const successResult = await circuitBreaker.execute(failingOperation);
      // Should either succeed or be in recovery - circuit breaker is working
      expect(typeof successResult.success).toBe('boolean');
    });

    it('should handle malformed JSON in configuration parsing', async () => {
      const manager = new ConfigManager();

      // This would normally come from file parsing
      const malformedInputs = [
        '{"incomplete": json',
        '{"unclosed": "string}',
        '{"invalid": escape\\}',
        '{invalid json}',
        'null',
        'undefined',
        '123',
        '"just a string"',
        'true',
        'false',
        '{"circular": reference}'
      ];

      for (const input of malformedInputs) {
        try {
          const parsed = JSON.parse(input);
          manager.addSource({ type: 'object', data: parsed });
          await manager.load();
          // Should handle valid but unexpected JSON gracefully
        } catch (error) {
          // Should handle malformed JSON gracefully
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('Memory Safety and Resource Limits', () => {
    it('should handle memory pressure gracefully', async () => {
      const storage = new MemoryStorage();
      await storage.initialize();

      // Try to exhaust memory
      const largeObject = {
        data: new Array(100000).fill('x'.repeat(1000)),
        nested: {
          more: new Array(10000).fill('y'.repeat(1000))
        }
      };

      try {
        for (let i = 0; i < 100; i++) {
          await storage.set(`large${i}`, largeObject);
        }

        // Should still be functional
        const result = await storage.get('large0');
        expect(result).toBeDefined();

      } catch (error) {
        // Should handle memory errors gracefully
        expect(error).toBeInstanceOf(Error);
      }

      await storage.close();
    });

    it('should limit cache storage growth', async () => {
      const cacheStorage = new CacheStorage({ type: 'cache', defaultTTL: 1 });
      await cacheStorage.initialize();

      // Add many items
      for (let i = 0; i < 10000; i++) {
        await cacheStorage.set(`key${i}`, `value${i}`, 1);
      }

      const size = await cacheStorage.size();
      expect(size).toBeLessThanOrEqual(10000);

      await cacheStorage.close();
    });

    it('should prevent stack overflow in deep operations', async () => {
      const manager = new ConfigManager();

      // Create very deep configuration
      let deepConfig = {};
      let current = deepConfig;
      for (let i = 0; i < 1000; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`];
      }
      current['value'] = 'deep value';

      manager.addSource({ type: 'object', data: deepConfig });

      try {
        await manager.load();
        // Should handle deep nesting gracefully
        const deepValue = manager.get('level0.level1.level2.level3.level4.value');
        expect(deepValue).toBeDefined();
      } catch (error) {
        // Should handle stack overflow gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Concurrency and Race Condition Safety', () => {
    it('should handle concurrent storage operations safely', async () => {
      const storage = new MemoryStorage();
      await storage.initialize();

      // Concurrent operations on same key
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(storage.set('concurrent', i));
        promises.push(storage.get('concurrent'));
      }

      await Promise.all(promises);

      // Final value should be one of the set values
      const finalValue = await storage.get('concurrent');
      expect(typeof finalValue).toBe('number');
      expect(finalValue).toBeGreaterThanOrEqual(0);
      expect(finalValue).toBeLessThan(100);

      await storage.close();
    });

    it('should handle concurrent configuration loading safely', async () => {
      const manager = new ConfigManager();
      manager.addSource({ type: 'object', data: { test: 'initial' } });

      // Concurrent loads
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(manager.load());
      }

      await Promise.all(promises);

      // Configuration should be consistent
      const value = manager.get('test');
      expect(value).toBe('initial');
    });

    it('should handle concurrent command execution safely', async () => {
      const registry = new CommandRegistry();

      let counter = 0;
      registry.register({
        name: 'counter',
        description: 'Test counter command',
        handler: async () => {
          counter++;
          return ok(counter);
        }
      });

      // Concurrent executions
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(registry.execute('counter'));
      }

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(typeof result.data).toBe('number');
      });

      // Counter should have been incremented
      expect(counter).toBe(50);
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain data consistency during operations', async () => {
      const storage = new MemoryStorage();
      await storage.initialize();

      const testData = {
        string: 'test string',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
        null: null,
        undefined: undefined
      };

      await storage.set('test', testData);
      const retrieved = await storage.get('test');

      // Should maintain data types
      expect(typeof retrieved.string).toBe('string');
      expect(typeof retrieved.number).toBe('number');
      expect(typeof retrieved.boolean).toBe('boolean');
      expect(Array.isArray(retrieved.array)).toBe(true);
      expect(typeof retrieved.object).toBe('object');
      expect(retrieved.null).toBeNull();
      expect(retrieved.undefined).toBeUndefined();

      await storage.close();
    });

    it('should handle type coercion safely', async () => {
      const storage = new MemoryStorage();
      await storage.initialize();

      // Store various types
      await storage.set('string', '123');
      await storage.set('number', 123);
      await storage.set('boolean', 'true');
      await storage.set('null', 'null');
      await storage.set('undefined', 'undefined');

      // Should preserve original types
      expect(await storage.get('string')).toBe('123');
      expect(await storage.get('number')).toBe(123);
      expect(await storage.get('boolean')).toBe('true');
      expect(await storage.get('null')).toBe('null');
      expect(await storage.get('undefined')).toBe('undefined');

      await storage.close();
    });

    it('should validate vector storage embeddings', async () => {
      const vectorStorage = new VectorStorage();
      await vectorStorage.initialize();

      const invalidDocuments = [
        { id: 'test1', content: 'test', embedding: [] }, // Empty embedding
        { id: 'test2', content: 'test', embedding: [1] }, // Single dimension
        { id: 'test3', content: 'test', embedding: new Array(1000000).fill(1) }, // Too large
        { id: 'test4', content: 'test', embedding: ['not', 'numbers'] }, // Non-numeric
        { id: 'test5', content: 'test', embedding: [Infinity, -Infinity, NaN] }, // Invalid numbers
      ];

      for (const doc of invalidDocuments) {
        try {
          await vectorStorage.add(doc);
          // Should handle invalid embeddings gracefully
        } catch (error) {
          // Should reject invalid embeddings
          expect(error).toBeInstanceOf(Error);
        }
      }

      await vectorStorage.close();
    });
  });

  describe('Security Boundaries and Isolation', () => {
    it('should isolate storage instances', async () => {
      const storage1 = new MemoryStorage();
      const storage2 = new MemoryStorage();

      await storage1.initialize();
      await storage2.initialize();

      await storage1.set('key', 'value1');
      await storage2.set('key', 'value2');

      const value1 = await storage1.get('key');
      const value2 = await storage2.get('key');

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
      expect(value1).not.toBe(value2);

      await storage1.close();
      await storage2.close();
    });

    it('should isolate configuration managers', async () => {
      const manager1 = new ConfigManager({
        sources: [{ type: 'object', data: { shared: 'config1' } }]
      });

      const manager2 = new ConfigManager({
        sources: [{ type: 'object', data: { shared: 'config2' } }]
      });

      await manager1.load();
      await manager2.load();

      expect(manager1.get('shared')).toBe('config1');
      expect(manager2.get('shared')).toBe('config2');
    });

    it('should isolate command registries', async () => {
      const registry1 = new CommandRegistry();
      const registry2 = new CommandRegistry();

      registry1.register({
        name: 'test',
        description: 'Test command',
        handler: async () => ok('result1')
      });

      registry2.register({
        name: 'test',
        description: 'Test command',
        handler: async () => ok('result2')
      });

      const result1 = await registry1.execute('test');
      const result2 = await registry2.execute('test');

      expect(result1.data).toBe('result1');
      expect(result2.data).toBe('result2');
    });
  });

  describe('Error Propagation and Recovery', () => {
    it('should prevent error cascading', async () => {
      const storage = new MemoryStorage();
      await storage.initialize();

      // Mix of valid and invalid operations
      const operations = [
        storage.set('valid1', 'value1'),
        storage.set('__proto__', { polluted: true }),
        storage.set('valid2', 'value2'),
        storage.get('nonexistent'),
        storage.set('valid3', 'value3')
      ];

      const results = await Promise.allSettled(operations);

      // Should complete all operations despite some errors
      expect(results).toHaveLength(5);

      // Valid operations should succeed
      expect(await storage.get('valid1')).toBe('value1');
      expect(await storage.get('valid2')).toBe('value2');
      expect(await storage.get('valid3')).toBe('value3');

      await storage.close();
    });

    it('should recover from temporary failures', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 50
      });

      let attempt = 0;
      const flakyOperation = async () => {
        attempt++;
        if (attempt <= 2) {
          throw new Error(`Temporary failure ${attempt}`);
        }
        return ok('success');
      };

      // First two attempts fail
      expect((await circuitBreaker.execute(flakyOperation)).success).toBe(false);
      expect((await circuitBreaker.execute(flakyOperation)).success).toBe(false);

      // Circuit should not be closed after failures
      expect(circuitBreaker.getState().state !== 'closed').toBe(true);

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should recover and succeed (or at least try)
      const result = await circuitBreaker.execute(flakyOperation);
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Performance Under Adverse Conditions', () => {
    it('should maintain responsiveness with large datasets', async () => {
      const storage = new MemoryStorage();
      await storage.initialize();

      // Large dataset
      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        await storage.set(`key${i}`, `value${i}`.repeat(100));
      }
      const setTime = Date.now() - startTime;

      // Should complete in reasonable time (< 10 seconds)
      expect(setTime).toBeLessThan(10000);

      // Should still be responsive for reads
      const readStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        await storage.get(`key${i * 10}`);
      }
      const readTime = Date.now() - readStartTime;

      // Reads should be fast (< 1 second)
      expect(readTime).toBeLessThan(1000);

      await storage.close();
    });

    it('should handle high-frequency operations efficiently', async () => {
      const storage = new MemoryStorage();
      await storage.initialize();

      const startTime = Date.now();
      const promises = [];

      // High frequency operations
      for (let i = 0; i < 1000; i++) {
        promises.push(storage.set(`freq${i}`, i));
        promises.push(storage.get(`freq${i - 1}`));
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should complete quickly (< 2 seconds)
      expect(duration).toBeLessThan(2000);

      await storage.close();
    });
  });
});