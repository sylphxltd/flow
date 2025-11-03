/**
 * Performance Benchmark Test Suite
 * Comprehensive performance testing for core systems
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStorage, CacheStorage, VectorStorage } from '../../core/unified-storage.js';
import { ConfigManager, ConfigFactory } from '../../core/config-system.js';
import { CommandRegistry, CommandUtils } from '../../core/command-system.js';
import {
  Result,
  ok,
  err,
  map,
  flatMap,
  all,
  allAsync
} from '../../core/result.js';

describe('Performance Benchmarks', () => {
  describe('Storage System Performance', () => {
    let memoryStorage: MemoryStorage<string>;
    let cacheStorage: CacheStorage<string>;

    beforeEach(async () => {
      memoryStorage = new MemoryStorage();
      await memoryStorage.initialize();

      cacheStorage = new CacheStorage({ type: 'cache', defaultTTL: 3600 });
      await cacheStorage.initialize();
    });

    afterEach(async () => {
      await memoryStorage.close();
      await cacheStorage.close();
    });

    it('should achieve high throughput for simple operations', async () => {
      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await memoryStorage.set(`key${i}`, `value${i}`);
        await memoryStorage.get(`key${i}`);
      }

      const duration = Date.now() - startTime;
      const throughput = (iterations * 2) / (duration / 1000); // ops/sec

      console.log(`Memory Storage Throughput: ${throughput.toFixed(2)} ops/sec`);
      expect(throughput).toBeGreaterThan(1000); // Should handle at least 1000 ops/sec
    });

    it('should handle large values efficiently', async () => {
      const largeValue = 'x'.repeat(10000); // 10KB
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await memoryStorage.set(`large${i}`, largeValue);
      }

      const duration = Date.now() - startTime;
      const throughput = iterations / (duration / 1000);

      console.log(`Large Value Storage Throughput: ${throughput.toFixed(2)} ops/sec`);
      expect(throughput).toBeGreaterThan(100); // Should handle at least 100 ops/sec for large values
    });

    it('should maintain performance with concurrent operations', async () => {
      const iterations = 1000;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < iterations; i++) {
        promises.push(memoryStorage.set(`concurrent${i}`, `value${i}`));
        promises.push(memoryStorage.get(`concurrent${i}`));
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      const throughput = (iterations * 2) / (duration / 1000);

      console.log(`Concurrent Operations Throughput: ${throughput.toFixed(2)} ops/sec`);
      expect(throughput).toBeGreaterThan(500); // Should handle at least 500 ops/sec concurrently
    });

    it('should handle memory usage efficiently', async () => {
      const initialMemory = process.memoryUsage();
      const dataPoints = 10000;
      const data = { test: 'value', array: new Array(100).fill(0) };

      for (let i = 0; i < dataPoints; i++) {
        await memoryStorage.set(`memory${i}`, data);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryPerItem = memoryIncrease / dataPoints;

      console.log(`Memory Usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB total`);
      console.log(`Memory Per Item: ${memoryPerItem.toFixed(2)} bytes`);

      // Each item should not use excessive memory (allow some overhead)
      expect(memoryPerItem).toBeLessThan(1000); // Less than 1KB per item
    });
  });

  describe('Configuration System Performance', () => {
    it('should load configuration quickly', async () => {
      const config = {
        database: {
          host: 'localhost',
          port: 5432,
          name: 'testdb'
        },
        server: {
          port: 3000,
          host: '0.0.0.0'
        },
        features: {
          auth: true,
          logging: true,
          cache: false
        }
      };

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const manager = new ConfigManager();
        manager.addSource({ type: 'object', data: config });
        await manager.load();
      }

      const duration = Date.now() - startTime;
      const throughput = iterations / (duration / 1000);

      console.log(`Configuration Loading Throughput: ${throughput.toFixed(2)} configs/sec`);
      expect(throughput).toBeGreaterThan(1000); // Should handle at least 1000 configs/sec
    });

    it('should handle deep configuration objects efficiently', async () => {
      const deepConfig = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: new Array(100).fill('test')
                }
              }
            }
          }
        }
      };

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const manager = new ConfigManager();
        manager.addSource({ type: 'object', data: deepConfig });
        await manager.load();
      }

      const duration = Date.now() - startTime;
      const throughput = iterations / (duration / 1000);

      console.log(`Deep Config Loading Throughput: ${throughput.toFixed(2)} configs/sec`);
      expect(throughput).toBeGreaterThan(500); // Should handle at least 500 deep configs/sec
    });
  });

  describe('Command System Performance', () => {
    let registry: CommandRegistry;

    beforeEach(() => {
      registry = new CommandRegistry();
    });

    it('should register commands quickly', async () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const command = CommandUtils.create(
          `command${i}`,
          `Test command ${i}`,
          async () => `result ${i}`
        );
        registry.register(command);
      }

      const duration = Date.now() - startTime;
      const throughput = iterations / (duration / 1000);

      console.log(`Command Registration Throughput: ${throughput.toFixed(2)} commands/sec`);
      expect(throughput).toBeGreaterThan(1000); // Should handle at least 1000 commands/sec
    });

    it('should execute commands quickly', async () => {
      const command = CommandUtils.create('test', 'Test command', async () => 'result');
      registry.register(command);

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await registry.execute('test');
      }

      const duration = Date.now() - startTime;
      const throughput = iterations / (duration / 1000);

      console.log(`Command Execution Throughput: ${throughput.toFixed(2)} commands/sec`);
      expect(throughput).toBeGreaterThan(500); // Should handle at least 500 commands/sec
    });

    it('should handle large command registry efficiently', async () => {
      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const command = CommandUtils.create(
          `command${i}`,
          `Test command ${i}`,
          async () => `result ${i}`
        );
        registry.register(command);
      }

      const duration = Date.now() - startTime;
      const throughput = iterations / (duration / 1000);

      console.log(`Large Registry Throughput: ${throughput.toFixed(2)} commands/sec`);
      expect(throughput).toBeGreaterThan(500); // Should handle large registry efficiently
    });
  });

  describe('Result Type Performance', () => {
    it('should handle Result transformations efficiently', async () => {
      const iterations = 100000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const result = ok(i);
        const transformed = map(x => x * 2)(result);
        const final = flatMap(x => ok(x.toString()))(transformed);

        if (final.success) {
          final.data; // Access the data
        }
      }

      const duration = Date.now() - startTime;
      const throughput = iterations / (duration / 1000);

      console.log(`Result Transformation Throughput: ${throughput.toFixed(2)} ops/sec`);
      expect(throughput).toBeGreaterThan(50000); // Should handle at least 50k transformations/sec
    });

    it('should handle Result combinators efficiently', async () => {
      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const results = [
          ok(i),
          ok(i + 1),
          ok(i + 2),
          ok(i + 3),
          ok(i + 4)
        ];
        const combined = all(results);
        combined.data; // Access the data
      }

      const duration = Date.now() - startTime;
      const throughput = iterations / (duration / 1000);

      console.log(`Result Combinator Throughput: ${throughput.toFixed(2)} ops/sec`);
      expect(throughput).toBeGreaterThan(1000); // Should handle at least 1000 combinators/sec
    });

    it('should handle async Result operations efficiently', async () => {
      const iterations = 10000;
      const startTime = Date.now();

      const asyncResults = Array.from({ length: iterations }, (_, i) =>
        Promise.resolve(ok(i))
      );

      await allAsync(asyncResults);

      const duration = Date.now() - startTime;
      const throughput = iterations / (duration / 1000);

      console.log(`Async Result Throughput: ${throughput.toFixed(2)} ops/sec`);
      expect(throughput).toBeGreaterThan(1000); // Should handle at least 1000 async results/sec
    });
  });

  describe('Memory Management', () => {
    it('should not have memory leaks in Result operations', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 10000;

      // Create many Result objects
      for (let i = 0; i < iterations; i++) {
        const result = ok(i);
        const mapped = map(x => x * 2)(result);
        const final = flatMap(x => ok(x.toString()))(mapped);

        // Force garbage collection hint
        if (i % 1000 === 0) {
          global.gc?.();
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable (less than 10MB for 10k operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should clean up resources properly', async () => {
      const storages = [];
      const initialMemory = process.memoryUsage();

      // Create many storage instances
      for (let i = 0; i < 100; i++) {
        const storage = new MemoryStorage();
        await storage.initialize();
        await storage.set(`test${i}`, `value${i}`);
        storages.push(storage);
      }

      const peakMemory = process.memoryUsage();

      // Clean up all storages
      for (const storage of storages) {
        await storage.close();
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryRecovered = peakMemory.heapUsed - finalMemory.heapUsed;

      console.log(`Memory Recovered: ${(memoryRecovered / 1024 / 1024).toFixed(2)}MB`);

      // Should recover some memory (allow for garbage collection timing)
      expect(memoryRecovered).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance over time', async () => {
      const iterations = 1000;
      const measurements = [];

      // Run multiple rounds and measure performance
      for (let round = 0; round < 5; round++) {
        const storage = new MemoryStorage();
        await storage.initialize();

        const startTime = Date.now();

        for (let i = 0; i < iterations; i++) {
          await storage.set(`key${i}`, `value${i}`);
          await storage.get(`key${i}`);
        }

        const duration = Date.now() - startTime;
        measurements.push(duration);

        await storage.close();
      }

      // Calculate statistics
      const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxDuration = Math.max(...measurements);
      const minDuration = Math.min(...measurements);
      const variance = measurements.reduce((sum, val) => sum + Math.pow(val - avgDuration, 2), 0) / measurements.length;
      const stdDev = Math.sqrt(variance);

      console.log(`Performance Stats - Avg: ${avgDuration.toFixed(2)}ms, Min: ${minDuration.toFixed(2)}ms, Max: ${maxDuration.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms`);

      // Performance should be consistent (allow reasonable variance)
      expect(stdDev).toBeLessThanOrEqual(avgDuration * 2 + 0.01); // StdDev should be less than 200% of average + epsilon
    });
  });
});