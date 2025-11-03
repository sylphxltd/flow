/**
 * Comprehensive Performance Test with Storage Benchmarks
 * Extended version including storage system tests
 */

import { performance } from 'node:perf_hooks';
import { memoryUsage } from 'node:process';
import { readFile, writeFile, unlink } from 'node:fs/promises';

interface TestResult {
  operation: string;
  throughput: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  memoryDelta: number;
  totalOperations: number;
  duration: number;
  details?: any;
}

class ComprehensiveBenchmarks {
  private getMemoryUsage(): number {
    return memoryUsage().heapUsed / 1024 / 1024;
  }

  private calculatePercentiles(values: number[]): { avg: number; p95: number; p99: number } {
    const sorted = values.sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avg = sum / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      avg,
      p95: sorted[p95Index],
      p99: sorted[p99Index],
    };
  }

  /**
   * Test in-memory storage operations
   */
  async testInMemoryStorage(): Promise<TestResult> {
    console.log('💾 Testing In-Memory Storage Performance...');

    const operations = 50000;
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create in-memory storage
    const storage = new Map<string, any>();
    const latencies: number[] = [];

    // Write operations
    for (let i = 0; i < operations; i++) {
      const writeStart = performance.now();

      const data = {
        id: i,
        content: 'x'.repeat(1024), // 1KB data
        timestamp: Date.now(),
        metadata: {
          type: 'test',
          size: 1024,
        },
      };

      storage.set(`key_${i}`, data);

      const writeEnd = performance.now();
      latencies.push(writeEnd - writeStart);
    }

    // Read operations
    for (let i = 0; i < operations; i++) {
      const readStart = performance.now();

      const data = storage.get(`key_${i}`);

      const readEnd = performance.now();
      latencies.push(readEnd - readStart);
    }

    // Search operations
    for (let i = 0; i < 1000; i++) {
      const searchStart = performance.now();

      const results = Array.from(storage.values()).filter(item =>
        item.content.includes('x') && item.id % 100 === i % 100
      );

      const searchEnd = performance.now();
      latencies.push(searchEnd - searchStart);
    }

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000;

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'in_memory_storage',
      throughput: (operations * 2 + 1000) / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations * 2 + 1000,
      duration,
      details: {
        writeOps: operations,
        readOps: operations,
        searchOps: 1000,
        storageSize: storage.size,
      },
    };
  }

  /**
   * Test file system storage operations
   */
  async testFileSystemStorage(): Promise<TestResult> {
    console.log('📁 Testing File System Storage Performance...');

    const operations = 1000; // Fewer operations for file I/O
    const testDir = '/tmp/storage-benchmark-test';
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    const latencies: number[] = [];

    // Write operations
    for (let i = 0; i < operations; i++) {
      const writeStart = performance.now();

      const data = JSON.stringify({
        id: i,
        content: 'x'.repeat(512), // 512B data
        timestamp: Date.now(),
        metadata: {
          type: 'file_test',
          size: 512,
        },
      });

      try {
        await writeFile(`${testDir}/file_${i}.json`, data, 'utf-8');
      } catch (error) {
        // Ignore file system errors for this benchmark
      }

      const writeEnd = performance.now();
      latencies.push(writeEnd - writeStart);
    }

    // Read operations
    for (let i = 0; i < operations; i++) {
      const readStart = performance.now();

      try {
        const data = await readFile(`${testDir}/file_${i}.json`, 'utf-8');
        JSON.parse(data);
      } catch (error) {
        // Ignore file system errors for this benchmark
      }

      const readEnd = performance.now();
      latencies.push(readEnd - readStart);
    }

    // Cleanup (measured as part of the test)
    for (let i = 0; i < operations; i++) {
      const deleteStart = performance.now();

      try {
        await unlink(`${testDir}/file_${i}.json`);
      } catch (error) {
        // Ignore cleanup errors
      }

      const deleteEnd = performance.now();
      latencies.push(deleteEnd - deleteStart);
    }

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000;

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'file_system_storage',
      throughput: (operations * 3) / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations * 3,
      duration,
      details: {
        writeOps: operations,
        readOps: operations,
        deleteOps: operations,
      },
    };
  }

  /**
   * Test configuration loading performance
   */
  async testConfigurationLoading(): Promise<TestResult> {
    console.log('⚙️  Testing Configuration Loading Performance...');

    const operations = 10000;
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    const latencies: number[] = [];

    // Create sample configurations
    const configs = Array.from({ length: 100 }, (_, i) => ({
      database: {
        host: 'localhost',
        port: 5432 + i,
        name: `db_${i}`,
      },
      cache: {
        ttl: 3600 + i,
        maxSize: 1000 + i * 10,
      },
      services: Array.from({ length: 10 }, (_, j) => ({
        name: `service_${j}`,
        endpoint: `https://api${j}.example.com`,
        timeout: 5000 + j * 1000,
      })),
    }));

    // Configuration loading operations
    for (let i = 0; i < operations; i++) {
      const loadStart = performance.now();

      // Simulate configuration loading and validation
      const config = configs[i % configs.length];

      // Simulate validation
      if (config.database.port < 0 || config.database.port > 65536) {
        throw new Error('Invalid port');
      }

      // Simulate transformation
      const transformed = {
        ...config,
        environment: 'production',
        version: '1.0.0',
        loadedAt: Date.now(),
      };

      const loadEnd = performance.now();
      latencies.push(loadEnd - loadStart);
    }

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000;

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'configuration_loading',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
      details: {
        configVariants: configs.length,
        avgConfigSize: JSON.stringify(configs[0]).length,
      },
    };
  }

  /**
   * Test command system performance
   */
  async testCommandSystem(): Promise<TestResult> {
    console.log('🎯 Testing Command System Performance...');

    const operations = 50000;
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Mock command registry
    const commands = new Map<string, Function>();
    const middleware: Function[] = [];

    // Register commands
    for (let i = 0; i < 100; i++) {
      commands.set(`command_${i}`, async (context: any, ...args: any[]) => {
        // Simulate command execution
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
        return {
          success: true,
          result: { commandId: i, args, processed: true },
          executionTime: 1,
        };
      });
    }

    // Add middleware
    for (let i = 0; i < 5; i++) {
      middleware.push(async (context: any, next: Function) => {
        context.middlewareTimestamp = Date.now();
        return await next();
      });
    }

    const latencies: number[] = [];

    // Command execution operations
    for (let i = 0; i < operations; i++) {
      const execStart = performance.now();

      const commandName = `command_${i % 100}`;
      const command = commands.get(commandName);

      if (command) {
        const context = {
          sessionId: `session_${i}`,
          timestamp: Date.now(),
          userId: `user_${i % 1000}`,
        };

        await command(context, `arg_${i}`);
      }

      const execEnd = performance.now();
      latencies.push(execEnd - execStart);
    }

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000;

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'command_system',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
      details: {
        registeredCommands: commands.size,
        middlewareCount: middleware.length,
      },
    };
  }

  /**
   * Test memory management under load
   */
  async testMemoryManagement(): Promise<TestResult> {
    console.log('🧠 Testing Memory Management Performance...');

    const operations = 100000;
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    const latencies: number[] = [];
    const memorySnapshots: number[] = [];

    // Create memory pressure
    const objects: any[] = [];

    for (let i = 0; i < operations; i++) {
      const opStart = performance.now();

      // Create objects with varying sizes
      const size = 64 + (i % 10) * 128;
      const obj = {
        id: i,
        data: 'x'.repeat(size),
        timestamp: Date.now(),
        metadata: {
          size,
          type: 'memory_test',
          nested: {
            level1: {
              level2: {
                data: `nested_${i}`,
                array: Array.from({ length: 10 }, (_, j) => j),
              },
            },
          },
        },
      };

      objects.push(obj);

      // Periodically clean up to test GC
      if (i % 10000 === 0 && i > 0) {
        objects.splice(0, 5000); // Remove half the objects

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        memorySnapshots.push(this.getMemoryUsage());
      }

      const opEnd = performance.now();
      latencies.push(opEnd - opStart);
    }

    // Final cleanup
    objects.length = 0;

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000;

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    const peakMemory = Math.max(...memorySnapshots, memoryBefore, memoryAfter);

    return {
      operation: 'memory_management',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
      details: {
        peakMemoryUsage: peakMemory,
        memorySnapshots: memorySnapshots.length,
        finalCleanup: true,
      },
    };
  }

  /**
   * Run all comprehensive tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Comprehensive Performance Test Suite');
    console.log('=' .repeat(60));

    const results: TestResult[] = [];

    try {
      results.push(await this.testInMemoryStorage());
      results.push(await this.testFileSystemStorage());
      results.push(await this.testConfigurationLoading());
      results.push(await this.testCommandSystem());
      results.push(await this.testMemoryManagement());
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }

    return results;
  }

  /**
   * Display comprehensive results
   */
  static displayResults(results: TestResult[]): void {
    console.log('\n📊 COMPREHENSIVE PERFORMANCE BENCHMARK RESULTS');
    console.log('=' .repeat(60));

    let totalOperations = 0;
    let totalDuration = 0;
    let totalMemoryDelta = 0;

    // Performance targets
    const targets = {
      throughput: 10000, // ops/sec
      latency: 50, // ms
      memoryGrowth: 100, // MB
    };

    let targetsMet = 0;
    let totalTargets = 0;

    for (const result of results) {
      console.log(`\n🔸 ${result.operation.replace(/_/g, ' ').toUpperCase()}`);
      console.log(`   Throughput: ${result.throughput.toFixed(2)} ops/sec`);
      console.log(`   Avg Latency: ${result.avgLatency.toFixed(4)}ms`);
      console.log(`   P95 Latency: ${result.p95Latency.toFixed(4)}ms`);
      console.log(`   P99 Latency: ${result.p99Latency.toFixed(4)}ms`);
      console.log(`   Memory Delta: ${result.memoryDelta.toFixed(2)}MB`);
      console.log(`   Operations: ${result.totalOperations.toLocaleString()}`);
      console.log(`   Duration: ${result.duration.toFixed(2)}s`);

      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 6).replace(/\n/g, '\n            ')}`);
      }

      totalOperations += result.totalOperations;
      totalDuration += result.duration;
      totalMemoryDelta += Math.abs(result.memoryDelta);

      // Check targets
      if (result.throughput >= targets.throughput) {
        targetsMet++;
        console.log(`   ✅ Throughput target met (≥${targets.throughput} ops/sec)`);
      } else {
        console.log(`   ❌ Throughput target missed (≥${targets.throughput} ops/sec)`);
      }
      totalTargets++;

      if (result.avgLatency <= targets.latency) {
        targetsMet++;
        console.log(`   ✅ Latency target met (≤${targets.latency}ms)`);
      } else {
        console.log(`   ❌ Latency target missed (≤${targets.latency}ms)`);
      }
      totalTargets++;

      if (Math.abs(result.memoryDelta) <= targets.memoryGrowth) {
        targetsMet++;
        console.log(`   ✅ Memory target met (≤${targets.memoryGrowth}MB)`);
      } else {
        console.log(`   ❌ Memory target missed (≤${targets.memoryGrowth}MB)`);
      }
      totalTargets++;
    }

    console.log('\n📈 OVERALL SUMMARY');
    console.log('-'.repeat(30));
    console.log(`Total Operations: ${totalOperations.toLocaleString()}`);
    console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);
    console.log(`Avg Throughput: ${(totalOperations / totalDuration).toFixed(2)} ops/sec`);
    console.log(`Total Memory Usage: ${totalMemoryDelta.toFixed(2)}MB`);
    console.log(`Performance Score: ${((targetsMet / totalTargets) * 100).toFixed(1)}%`);

    console.log('\n🎯 PERFORMANCE ANALYSIS');
    console.log('-'.repeat(30));

    if (targetsMet / totalTargets >= 0.8) {
      console.log('✅ EXCELLENT: Most performance targets met');
    } else if (targetsMet / totalTargets >= 0.6) {
      console.log('⚠️  GOOD: Majority of performance targets met');
    } else {
      console.log('❌ NEEDS IMPROVEMENT: Many performance targets missed');
    }

    // Identify areas for optimization
    console.log('\n🔍 OPTIMIZATION OPPORTUNITIES');
    console.log('-'.repeat(30));

    const slowOperations = results.filter(r => r.avgLatency > targets.latency);
    if (slowOperations.length > 0) {
      console.log('🐌 High Latency Operations:');
      slowOperations.forEach(op => {
        console.log(`   • ${op.operation}: ${op.avgLatency.toFixed(2)}ms avg`);
      });
    }

    const lowThroughputOps = results.filter(r => r.throughput < targets.throughput);
    if (lowThroughputOps.length > 0) {
      console.log('📉 Low Throughput Operations:');
      lowThroughputOps.forEach(op => {
        console.log(`   • ${op.operation}: ${op.throughput.toFixed(2)} ops/sec`);
      });
    }

    const highMemoryOps = results.filter(r => Math.abs(r.memoryDelta) > targets.memoryGrowth);
    if (highMemoryOps.length > 0) {
      console.log('🧠 High Memory Usage Operations:');
      highMemoryOps.forEach(op => {
        console.log(`   • ${op.operation}: ${Math.abs(op.memoryDelta).toFixed(2)}MB`);
      });
    }

    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(30));

    if (slowOperations.length > 0) {
      console.log('• Optimize algorithms and data structures for slow operations');
      console.log('• Consider caching or memoization for repeated computations');
    }

    if (lowThroughputOps.length > 0) {
      console.log('• Implement batching or parallel processing where possible');
      console.log('• Profile and optimize bottlenecks in low-throughput operations');
    }

    if (highMemoryOps.length > 0) {
      console.log('• Implement object pooling for frequently created objects');
      console.log('• Review memory management and garbage collection patterns');
      console.log('• Consider streaming for large data processing');
    }

    console.log('• Set up continuous performance monitoring in production');
    console.log('• Establish performance regression testing in CI/CD pipeline');
  }
}

// Run tests if this file is executed directly
async function main() {
  try {
    const benchmarks = new ComprehensiveBenchmarks();
    const results = await benchmarks.runAllTests();
    ComprehensiveBenchmarks.displayResults(results);
  } catch (error) {
    console.error('❌ Benchmark execution failed:', error);
    process.exit(1);
  }
}

export { ComprehensiveBenchmarks, main };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}