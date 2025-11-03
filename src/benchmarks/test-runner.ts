/**
 * Test Runner for Performance Benchmarks
 * Simplified version for demonstration
 */

import { performance } from 'node:perf_hooks';
import { memoryUsage } from 'node:process';

interface TestResult {
  operation: string;
  throughput: number;
  avgLatency: number;
  memoryDelta: number;
  totalOperations: number;
  duration: number;
}

class SimplifiedBenchmarks {
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
   * Test Result type performance
   */
  async testResultTypes(): Promise<TestResult> {
    console.log('🎲 Testing Result Type Performance...');

    const operations = 100000;
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Test simple Result operations
    const latencies: number[] = [];

    for (let i = 0; i < operations; i++) {
      const opStart = performance.now();

      // Simulate Result creation and operations
      if (i % 3 === 0) {
        // Failure case
        const result = { _tag: 'Failure' as const, error: `Error ${i}` };

        // Pattern matching
        if (result._tag === 'Success') {
          result.value;
        } else {
          result.error;
        }
      } else {
        // Success case
        const result = { _tag: 'Success' as const, value: { id: i, data: `test_${i}` } };

        // Map transformation
        if (result._tag === 'Success') {
          const transformed = {
            ...result.value,
            processed: true,
          };
        }
      }

      const opEnd = performance.now();
      latencies.push(opEnd - opStart);
    }

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000;

    const { avg } = this.calculatePercentiles(latencies);

    return {
      operation: 'result_types',
      throughput: operations / duration,
      avgLatency: avg,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Test object creation performance
   */
  async testObjectCreation(): Promise<TestResult> {
    console.log('🏗️  Testing Object Creation Performance...');

    const operations = 100000;
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    const latencies: number[] = [];
    const objects: any[] = [];

    for (let i = 0; i < operations; i++) {
      const opStart = performance.now();

      // Create test objects
      const obj = {
        id: i,
        data: 'x'.repeat(100),
        timestamp: Date.now(),
        metadata: {
          created: new Date().toISOString(),
          processed: false,
        },
      };

      objects.push(obj);

      const opEnd = performance.now();
      latencies.push(opEnd - opStart);
    }

    // Clean up
    objects.length = 0;

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000;

    const { avg } = this.calculatePercentiles(latencies);

    return {
      operation: 'object_creation',
      throughput: operations / duration,
      avgLatency: avg,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Test array operations performance
   */
  async testArrayOperations(): Promise<TestResult> {
    console.log('📊 Testing Array Operations Performance...');

    const operations = 10000;
    const arraySize = 1000;
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    const latencies: number[] = [];

    for (let i = 0; i < operations; i++) {
      const opStart = performance.now();

      // Create large array
      const largeArray = Array.from({ length: arraySize }, (_, j) => ({
        id: j,
        value: Math.random(),
        nested: {
          data: `item_${j}`,
          timestamp: Date.now(),
        },
      }));

      // Perform array operations
      const filtered = largeArray.filter(item => item.value > 0.5);
      const mapped = filtered.map(item => ({
        ...item,
        processed: true,
        result: item.value * 2,
      }));
      const reduced = mapped.reduce((sum, item) => sum + item.result, 0);

      const opEnd = performance.now();
      latencies.push(opEnd - opStart);
    }

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000;

    const { avg } = this.calculatePercentiles(latencies);

    return {
      operation: 'array_operations',
      throughput: operations / duration,
      avgLatency: avg,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Test async operations performance
   */
  async testAsyncOperations(): Promise<TestResult> {
    console.log('⚡ Testing Async Operations Performance...');

    const operations = 1000;
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    const latencies: number[] = [];

    // Create async operations
    const asyncOps = Array.from({ length: operations }, async (_, i) => {
      const opStart = performance.now();

      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5));

      const result = {
        id: i,
        processed: true,
        timestamp: Date.now(),
      };

      const opEnd = performance.now();
      latencies.push(opEnd - opStart);

      return result;
    });

    // Execute all async operations in parallel
    await Promise.all(asyncOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000;

    const { avg } = this.calculatePercentiles(latencies);

    return {
      operation: 'async_operations',
      throughput: operations / duration,
      avgLatency: avg,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Performance Benchmark Tests');
    console.log('=' .repeat(50));

    const results: TestResult[] = [];

    // Run each test
    results.push(await this.testResultTypes());
    results.push(await this.testObjectCreation());
    results.push(await this.testArrayOperations());
    results.push(await this.testAsyncOperations());

    return results;
  }

  /**
   * Display results
   */
  static displayResults(results: TestResult[]): void {
    console.log('\n📊 PERFORMANCE BENCHMARK RESULTS');
    console.log('=' .repeat(50));

    let totalOperations = 0;
    let totalDuration = 0;
    let totalMemoryDelta = 0;

    for (const result of results) {
      console.log(`\n🔸 ${result.operation.replace(/_/g, ' ').toUpperCase()}`);
      console.log(`   Throughput: ${result.throughput.toFixed(2)} ops/sec`);
      console.log(`   Avg Latency: ${result.avgLatency.toFixed(4)}ms`);
      console.log(`   Memory Delta: ${result.memoryDelta.toFixed(2)}MB`);
      console.log(`   Operations: ${result.totalOperations.toLocaleString()}`);
      console.log(`   Duration: ${result.duration.toFixed(2)}s`);

      totalOperations += result.totalOperations;
      totalDuration += result.duration;
      totalMemoryDelta += Math.abs(result.memoryDelta);
    }

    console.log('\n📈 SUMMARY');
    console.log('-'.repeat(30));
    console.log(`Total Operations: ${totalOperations.toLocaleString()}`);
    console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);
    console.log(`Avg Throughput: ${(totalOperations / totalDuration).toFixed(2)} ops/sec`);
    console.log(`Total Memory Usage: ${totalMemoryDelta.toFixed(2)}MB`);

    // Performance assessment
    console.log('\n🎯 PERFORMANCE ASSESSMENT');
    console.log('-'.repeat(30));

    const avgThroughput = totalOperations / totalDuration;
    if (avgThroughput > 50000) {
      console.log('✅ Excellent throughput performance');
    } else if (avgThroughput > 20000) {
      console.log('✅ Good throughput performance');
    } else if (avgThroughput > 10000) {
      console.log('⚠️  Moderate throughput performance');
    } else {
      console.log('❌ Low throughput performance - needs optimization');
    }

    if (totalMemoryDelta < 100) {
      console.log('✅ Good memory efficiency');
    } else if (totalMemoryDelta < 500) {
      console.log('⚠️  Moderate memory usage');
    } else {
      console.log('❌ High memory usage - investigate for leaks');
    }

    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(30));

    if (avgThroughput < 20000) {
      console.log('• Consider optimizing object creation patterns');
      console.log('• Implement object pooling for frequently created objects');
    }

    if (totalMemoryDelta > 200) {
      console.log('• Monitor for memory leaks');
      console.log('• Consider using WeakMap/WeakSet for caching');
    }

    console.log('• Continue monitoring in production environment');
    console.log('• Set up performance alerts for regression detection');
  }
}

// Run tests if this file is executed directly
async function main() {
  try {
    const benchmarks = new SimplifiedBenchmarks();
    const results = await benchmarks.runAllTests();
    SimplifiedBenchmarks.displayResults(results);
  } catch (error) {
    console.error('❌ Benchmark execution failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { SimplifiedBenchmarks, main };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}