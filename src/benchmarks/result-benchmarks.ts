/**
 * Result Type Performance Benchmarks
 * Tests functional error handling performance vs exceptions
 */

import { performance, memoryUsage } from 'node:perf_hooks';
import { success, failure, isSuccess, isFailure, map, flatMap, mapError, getOrElse, all, match, tryCatch } from '../core/functional/result.js';

interface ResultBenchmarkResult {
  operation: string;
  throughput: number; // operations per second
  avgLatency: number; // milliseconds
  p95Latency: number; // milliseconds
  p99Latency: number; // milliseconds
  memoryBefore: number; // MB
  memoryAfter: number; // MB
  memoryDelta: number; // MB
  totalOperations: number;
  duration: number; // seconds
}

interface ResultBenchmarkConfig {
  operationCount: number;
  chainDepth: number;
  arraySize: number;
}

// Test data types
type TestValue = { id: number; data: string };
type TestError = { code: string; message: string };

export class ResultBenchmarks {
  private config: ResultBenchmarkConfig;

  constructor(config: Partial<ResultBenchmarkConfig> = {}) {
    this.config = {
      operationCount: 100000,
      chainDepth: 10,
      arraySize: 1000,
      ...config,
    };
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed / 1024 / 1024;
  }

  /**
   * Measure operation latencies
   */
  private async measureLatencies<T>(
    operations: (() => T)[]
  ): Promise<number[]> {
    const latencies: number[] = [];

    for (const operation of operations) {
      const start = performance.now();
      operation();
      const end = performance.now();
      latencies.push(end - start);
    }

    return latencies.sort((a, b) => a - b);
  }

  /**
   * Measure async operation latencies
   */
  private async measureAsyncLatencies<T>(
    operations: (() => Promise<T>)[]
  ): Promise<number[]> {
    const latencies: number[] = [];

    for (const operation of operations) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      latencies.push(end - start);
    }

    return latencies.sort((a, b) => a - b);
  }

  /**
   * Calculate percentiles
   */
  private calculatePercentiles(values: number[]): {
    avg: number;
    p95: number;
    p99: number;
  } {
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;

    const p95Index = Math.floor(values.length * 0.95);
    const p99Index = Math.floor(values.length * 0.99);

    return {
      avg,
      p95: values[p95Index],
      p99: values[p99Index],
    };
  }

  /**
   * Create test result instances
   */
  private createTestResults(): Array<ReturnType<typeof success<TestValue, TestError>> | ReturnType<typeof failure<TestValue, TestError>>> {
    const results: Array<ReturnType<typeof success<TestValue, TestError>> | ReturnType<typeof failure<TestValue, TestError>>> = [];

    for (let i = 0; i < this.config.operationCount; i++) {
      if (i % 3 === 0) {
        // 1/3 failures
        results.push(failure({
          code: `ERROR_${i}`,
          message: `Test error ${i}`,
        }));
      } else {
        // 2/3 successes
        results.push(success({
          id: i,
          data: `test_data_${i}`,
        }));
      }
    }

    return results;
  }

  /**
   * Benchmark Result creation
   */
  async benchmarkResultCreation(): Promise<ResultBenchmarkResult> {
    const operations = this.config.operationCount;

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create results
    const createOps = Array.from({ length: operations }, (_, i) => {
      if (i % 3 === 0) {
        return () => failure({
          code: `ERROR_${i}`,
          message: `Test error ${i}`,
        });
      } else {
        return () => success({
          id: i,
          data: `test_data_${i}`,
        });
      }
    });

    const latencies = await this.measureLatencies(createOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'result_creation',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Benchmark type guard performance
   */
  async benchmarkTypeGuards(): Promise<ResultBenchmarkResult> {
    const operations = this.config.operationCount;
    const results = this.createTestResults();

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Test type guards
    const guardOps = results.map(result => () => {
      const isSuc = isSuccess(result);
      const isFail = isFailure(result);
      return isSuc || isFail; // Use both results
    });

    const latencies = await this.measureLatencies(guardOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'type_guards',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Benchmark map transformation
   */
  async benchmarkMapTransformation(): Promise<ResultBenchmarkResult> {
    const operations = this.config.operationCount;
    const results = this.createTestResults();

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Test map operations
    const mapOps = results.map(result => {
      const mapFn = map((value: TestValue) => ({
        ...value,
        data: value.data.toUpperCase(),
        processed: true,
      }));
      return () => mapFn(result);
    });

    const latencies = await this.measureLatencies(mapOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'map_transformation',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Benchmark flatMap chaining
   */
  async benchmarkFlatMapChaining(): Promise<ResultBenchmarkResult> {
    const operations = this.config.operationCount;
    const results = this.createTestResults();

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create chain of flatMap operations
    const chainOps = results.map(result => {
      let chained = result;

      // Apply chain of transformations
      for (let i = 0; i < this.config.chainDepth; i++) {
        const flatMapFn = flatMap((value: TestValue) =>
          success({
            ...value,
            step: i,
            data: `${value.data}_step_${i}`,
          })
        );
        chained = flatMapFn(chained);
      }

      return () => chained;
    });

    const latencies = await this.measureLatencies(chainOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'flatmap_chaining',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Benchmark pattern matching
   */
  async benchmarkPatternMatching(): Promise<ResultBenchmarkResult> {
    const operations = this.config.operationCount;
    const results = this.createTestResults();

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Test pattern matching
    const matchOps = results.map(result => {
      const matchFn = match(
        (value: TestValue) => `Success: ${value.id}`,
        (error: TestError) => `Error: ${error.code}`
      );
      return () => matchFn(result);
    });

    const latencies = await this.measureLatencies(matchOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'pattern_matching',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Benchmark all combinator
   */
  async benchmarkAllCombinator(): Promise<ResultBenchmarkResult> {
    const operations = Math.floor(this.config.operationCount / 10); // Smaller array for this test
    const arraySize = this.config.arraySize;

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Test all combinator with arrays of results
    const allOps = Array.from({ length: operations }, (_, batchIndex) => {
      const results = Array.from({ length: arraySize }, (_, i) => {
        const index = batchIndex * arraySize + i;
        if (index % 5 === 0) {
          return failure({
            code: `BATCH_ERROR_${index}`,
            message: `Batch error ${index}`,
          });
        } else {
          return success({
            id: index,
            data: `batch_data_${index}`,
          });
        }
      });

      return () => all(results);
    });

    const latencies = await this.measureLatencies(allOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'all_combinator',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Benchmark tryCatch vs exceptions
   */
  async benchmarkTryCatchVsExceptions(): Promise<ResultBenchmarkResult> {
    const operations = this.config.operationCount;

    // Create functions that might throw
    const throwingFunctions = Array.from({ length: operations }, (_, i) => {
      if (i % 4 === 0) {
        // 1/4 throw
        return () => {
          throw new Error(`Test exception ${i}`);
        };
      } else {
        // 3/4 succeed
        return () => ({
          id: i,
          data: `exception_test_${i}`,
        });
      }
    });

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Test tryCatch
    const tryCatchOps = throwingFunctions.map(fn =>
      () => tryCatch(fn, (error) => ({
        code: 'EXCEPTION',
        message: (error as Error).message,
      }))
    );

    const latencies = await this.measureLatencies(tryCatchOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'trycatch_vs_exceptions',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Benchmark memory allocation patterns
   */
  async benchmarkMemoryAllocation(): Promise<ResultBenchmarkResult> {
    const operations = this.config.operationCount;

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create many short-lived Result instances
    const allocationOps = Array.from({ length: operations }, (_, i) => {
      return () => {
        const result = Math.random() > 0.3
          ? success({ id: i, data: `memory_test_${i}` })
          : failure({ code: `MEM_ERROR_${i}`, message: `Memory error ${i}` });

        // Transform and immediately discard
        const transformed = map((v: TestValue) => ({ ...v, processed: true }))(result);
        return transformed;
      };
    });

    const latencies = await this.measureLatencies(allocationOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'memory_allocation',
      throughput: operations / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Run all Result benchmarks
   */
  async runAllBenchmarks(): Promise<ResultBenchmarkResult[]> {
    console.log('🎲 Starting Result Type Performance Benchmarks...');

    const results: ResultBenchmarkResult[] = [];

    // Creation benchmarks
    console.log('🏗️  Benchmarking Result creation...');
    results.push(await this.benchmarkResultCreation());

    // Type guard benchmarks
    console.log('🛡️  Benchmarking type guards...');
    results.push(await this.benchmarkTypeGuards());

    // Transformation benchmarks
    console.log('🔄 Benchmarking map transformations...');
    results.push(await this.benchmarkMapTransformation());

    // Chaining benchmarks
    console.log('⛓️  Benchmarking flatMap chaining...');
    results.push(await this.benchmarkFlatMapChaining());

    // Pattern matching benchmarks
    console.log('🎯 Benchmarking pattern matching...');
    results.push(await this.benchmarkPatternMatching());

    // Combinator benchmarks
    console.log('🔗 Benchmarking all combinator...');
    results.push(await this.benchmarkAllCombinator());

    // Exception handling benchmarks
    console.log('⚡ Benchmarking tryCatch vs exceptions...');
    results.push(await this.benchmarkTryCatchVsExceptions());

    // Memory allocation benchmarks
    console.log('🧠 Benchmarking memory allocation...');
    results.push(await this.benchmarkMemoryAllocation());

    return results;
  }

  /**
   * Format benchmark results for display
   */
  static formatResults(results: ResultBenchmarkResult[]): string {
    let output = '\n📊 Result Type Performance Results\n';
    output += '='.repeat(60) + '\n\n';

    for (const result of results) {
      output += `🔸 ${result.operation.replace(/_/g, ' ').toUpperCase()}\n`;
      output += `   Throughput: ${result.throughput.toFixed(2)} ops/sec\n`;
      output += `   Avg Latency: ${result.avgLatency.toFixed(2)}ms\n`;
      output += `   P95 Latency: ${result.p95Latency.toFixed(2)}ms\n`;
      output += `   P99 Latency: ${result.p99Latency.toFixed(2)}ms\n`;
      output += `   Memory Usage: ${result.memoryDelta.toFixed(2)}MB delta\n`;
      output += `   Total Operations: ${result.totalOperations}\n`;
      output += `   Duration: ${result.duration.toFixed(2)}s\n\n`;
    }

    return output;
  }
}