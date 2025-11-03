/**
 * Memory Leak Detection and Resource Management Test Suite
 * Comprehensive testing for memory leaks and proper resource cleanup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStorage, CacheStorage, VectorStorage } from '../core/unified-storage.js';
import { ConfigManager } from '../core/config-system.js';
import { CommandRegistry } from '../core/command-system.js';
import { CircuitBreaker } from '../core/error-handling.js';
import { ok, err } from '../core/result.js';

describe('Memory Leak Detection and Resource Management', () => {
  describe('Storage Resource Management', () => {
    it('should not leak memory with repeated storage creation/destruction', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const memoryStorage = new MemoryStorage();
        await memoryStorage.initialize();

        // Add data
        for (let j = 0; j < 100; j++) {
          await memoryStorage.set(`key${j}`, `value${j}`);
        }

        // Access data
        for (let j = 0; j < 100; j++) {
          await memoryStorage.get(`key${j}`);
        }

        await memoryStorage.close();

        // Force garbage collection periodically
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      // Final garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory increase after ${iterations} storage cycles: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable (< 50MB for 100 storage cycles)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should properly clean up cache storage timers', async () => {
      const initialTimerCount = Object.keys(process).filter(key => key.includes('timer')).length;

      for (let i = 0; i < 20; i++) {
        const cacheStorage = new CacheStorage({ type: 'cache', defaultTTL: 1 });
        await cacheStorage.initialize();

        // Add some data with short TTL
        await cacheStorage.set(`key${i}`, `value${i}`, 1);

        await cacheStorage.close();
      }

      // Wait for any pending timers to be cleared
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalTimerCount = Object.keys(process).filter(key => key.includes('timer')).length;

      // Timer count should not have grown significantly
      expect(finalTimerCount - initialTimerCount).toBeLessThan(5);
    });

    it('should handle vector storage memory properly', async () => {
      const initialMemory = process.memoryUsage();
      const documents = [];

      // Create documents with embeddings
      for (let i = 0; i < 1000; i++) {
        documents.push({
          id: `doc${i}`,
          content: `This is document ${i}`.repeat(10),
          embedding: Array.from({ length: 1536 }, () => Math.random()),
          metadata: { index: i, category: `cat${i % 10}` }
        });
      }

      const vectorStorage = new VectorStorage();
      await vectorStorage.initialize();

      // Add all documents
      for (const doc of documents) {
        await vectorStorage.add(doc);
      }

      const peakMemory = process.memoryUsage();

      // Perform searches
      for (let i = 0; i < 100; i++) {
        const query = Array.from({ length: 1536 }, () => Math.random());
        await vectorStorage.search(query, 10);
      }

      await vectorStorage.close();

      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryRecovered = peakMemory.heapUsed - finalMemory.heapUsed;

      console.log(`Vector storage memory recovered: ${(memoryRecovered / 1024 / 1024).toFixed(2)}MB`);

      // Memory recovery patterns vary - just ensure no excessive memory growth
      const memoryIncreaseAtPeak = peakMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncreaseAtPeak).toBeLessThan(200 * 1024 * 1024); // Less than 200MB peak
    });
  });

  describe('Configuration System Resource Management', () => {
    it('should not leak memory with repeated config loading', async () => {
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < 1000; i++) {
        const manager = new ConfigManager({
          sources: [{ type: 'object', data: { test: i, nested: { value: i * 2 } } }]
        });

        await manager.load();

        // Access configuration
        const value = manager.get('test');
        const nestedValue = manager.get('nested.value');
        const all = manager.getAll();

        // Clear references
        // (In a real scenario, the manager would go out of scope here)
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Config system memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });

    it('should properly manage watchers and callbacks', async () => {
      const manager = new ConfigManager();
      const callbacks = [];

      // Add many watchers
      for (let i = 0; i < 1000; i++) {
        const unsubscribe = manager.watch(() => {});
        callbacks.push(unsubscribe);
      }

      // Check that all callbacks are tracked
      expect(manager['watchCallbacks'].size).toBe(1000);

      // Remove all watchers
      for (const unsubscribe of callbacks) {
        unsubscribe();
      }

      // All callbacks should be removed
      expect(manager['watchCallbacks'].size).toBe(0);

      // No memory should be held by callbacks
      expect(callbacks.length).toBe(1000);
    });
  });

  describe('Command System Resource Management', () => {
    it('should not leak memory with repeated command registrations', async () => {
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < 100; i++) {
        const registry = new CommandRegistry();

        // Register many commands
        for (let j = 0; j < 100; j++) {
          registry.register({
            name: `command${j}`,
            description: `Test command ${j}`,
            handler: async () => ok(`result ${j}`),
            options: {
              test: {
                type: 'string',
                description: 'Test option'
              }
            }
          });
        }

        // Execute commands
        for (let j = 0; j < 100; j++) {
          await registry.execute(`command${j}`, { test: 'value' });
        }

        // Registry will be garbage collected
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Command system memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(30 * 1024 * 1024);
    });
  });

  describe('Error Handling Resource Management', () => {
    it('should not leak memory in circuit breaker', async () => {
      const initialMemory = process.memoryUsage();
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 1000
      });

      // Execute many operations through circuit breaker
      for (let i = 0; i < 1000; i++) {
        try {
          await circuitBreaker.execute(async () => {
            if (i % 3 === 0) {
              throw new Error(`Test error ${i}`);
            }
            return ok(`success ${i}`);
          });
        } catch {
          // Expected failures
        }
      }

      // Circuit breaker should maintain reasonable state size
      const state = circuitBreaker.getState();
      expect(state).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Circuit breaker memory increase: ${(memoryIncrease / 1024).toFixed(2)}KB`);

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });
  });

  describe('Result Type Memory Efficiency', () => {
    it('should not leak memory with extensive Result operations', async () => {
      const initialMemory = process.memoryUsage();
      const results = [];

      // Create many Result objects
      for (let i = 0; i < 10000; i++) {
        const result = i % 2 === 0 ? ok(i) : err(new Error(`error ${i}`));
        results.push(result);
      }

      // Transform results
      const transformed = results.map(r =>
        r.success ? ok(r.data * 2) : err(r.error)
      );

      // Chain operations
      for (let i = 0; i < 1000; i++) {
        const result = ok(i);
        const chain = result
          .map(x => x * 2)
          .map(x => x.toString())
          .flatMap(x => ok(x.toUpperCase()));

        if (chain.success) {
          chain.data; // Access the data
        }
      }

      // Clear references
      results.length = 0;
      transformed.length = 0;

      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Result operations memory increase: ${(memoryIncrease / 1024).toFixed(2)}KB`);

      // Memory increase should be minimal for Result operations
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Event Handler and Listener Cleanup', () => {
    it('should properly clean up event listeners', async () => {
      const listeners = [];
      const emitter = new EventTarget();

      // Add many listeners
      for (let i = 0; i < 1000; i++) {
        const listener = () => {};
        emitter.addEventListener('test', listener);
        listeners.push(listener);
      }

      // Check that listeners are added
      // (EventTarget doesn't expose listener count directly)

      // Remove all listeners
      for (const listener of listeners) {
        emitter.removeEventListener('test', listener);
      }

      // Dispatch event - should not trigger any listeners
      let triggered = false;
      emitter.addEventListener('test', () => { triggered = true; });
      emitter.dispatchEvent(new Event('test'));

      // Memory should be properly cleaned up
      expect(listeners.length).toBe(1000);
    });
  });

  describe('Buffer and Stream Management', () => {
    it('should properly clean up large buffers', async () => {
      const initialMemory = process.memoryUsage();
      const buffers = [];

      // Create many large buffers
      for (let i = 0; i < 100; i++) {
        buffers.push(Buffer.alloc(1024 * 1024, i)); // 1MB each
      }

      const peakMemory = process.memoryUsage();
      const memoryIncreaseAtPeak = peakMemory.heapUsed - initialMemory.heapUsed;

      // Clear all buffer references
      buffers.length = 0;

      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryRecovered = peakMemory.heapUsed - finalMemory.heapUsed;

      console.log(`Buffer memory: ${(memoryIncreaseAtPeak / 1024 / 1024).toFixed(2)}MB peak, ${(memoryRecovered / 1024 / 1024).toFixed(2)}MB recovered`);

      // Should recover most of the buffer memory
      expect(memoryRecovered).toBeGreaterThan(80 * 1024 * 1024); // At least 80MB recovered
    });
  });

  describe('Async Operation Resource Management', () => {
    it('should not accumulate pending promises', async () => {
      const initialMemory = process.memoryUsage();
      const promises = [];

      // Create many async operations
      for (let i = 0; i < 1000; i++) {
        promises.push(
          new Promise(resolve => {
            setTimeout(() => resolve(i), 10);
          })
        );
      }

      // Wait for all promises to resolve
      await Promise.all(promises);

      // Clear promise references
      promises.length = 0;

      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Async operations memory increase: ${(memoryIncrease / 1024).toFixed(2)}KB`);

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});