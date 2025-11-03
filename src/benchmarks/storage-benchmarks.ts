/**
 * Storage System Performance Benchmarks
 * Tests throughput, latency, memory usage, and scalability
 */

import { performance, memoryUsage } from 'node:perf_hooks';
import { MemoryStorage } from '../services/storage/memory-storage.js';

interface BenchmarkResult {
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

interface StorageBenchmarkConfig {
  smallDataSize: number; // bytes
  mediumDataSize: number; // bytes
  largeDataSize: number; // bytes
  operationCount: number;
  concurrencyLevels: number[];
}

export class StorageBenchmarks {
  private storage: MemoryStorage;
  private config: StorageBenchmarkConfig;

  constructor(config: Partial<StorageBenchmarkConfig> = {}) {
    this.storage = new MemoryStorage();
    this.config = {
      smallDataSize: 1024, // 1KB
      mediumDataSize: 1024 * 100, // 100KB
      largeDataSize: 1024 * 1024, // 1MB
      operationCount: 10000,
      concurrencyLevels: [1, 10, 50, 100],
      ...config,
    };
  }

  /**
   * Initialize storage system for benchmarking
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  /**
   * Generate test data of specified size
   */
  private generateTestData(size: number): string {
    return 'x'.repeat(size);
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
   * Benchmark write operations
   */
  async benchmarkWriteOperations(dataSize: keyof StorageBenchmarkConfig): Promise<BenchmarkResult> {
    const size = this.config[dataSize] as number;
    const testData = this.generateTestData(size);
    const operations = this.config.operationCount;

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create write operations
    const writeOps = Array.from({ length: operations }, (_, i) =>
      () => this.storage.set(`key_${i}`, testData, 'benchmark')
    );

    const latencies = await this.measureLatencies(writeOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: `write_${dataSize}_bytes`,
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
   * Benchmark read operations
   */
  async benchmarkReadOperations(dataSize: keyof StorageBenchmarkConfig): Promise<BenchmarkResult> {
    const size = this.config[dataSize] as number;
    const testData = this.generateTestData(size);
    const operations = this.config.operationCount;

    // Pre-populate data
    for (let i = 0; i < operations; i++) {
      await this.storage.set(`key_${i}`, testData, 'benchmark');
    }

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create read operations
    const readOps = Array.from({ length: operations }, (_, i) =>
      () => this.storage.get(`key_${i}`, 'benchmark')
    );

    const latencies = await this.measureLatencies(readOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: `read_${dataSize}_bytes`,
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
   * Benchmark concurrent operations
   */
  async benchmarkConcurrentOperations(concurrency: number): Promise<BenchmarkResult> {
    const operations = this.config.operationCount;
    const testData = this.generateTestData(this.config.mediumDataSize);
    const operationsPerWorker = Math.ceil(operations / concurrency);

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create concurrent workers
    const workers = Array.from({ length: concurrency }, async (_, workerId) => {
      const workerLatencies: number[] = [];
      const startIdx = workerId * operationsPerWorker;
      const endIdx = Math.min(startIdx + operationsPerWorker, operations);

      for (let i = startIdx; i < endIdx; i++) {
        const writeStart = performance.now();
        await this.storage.set(`concurrent_${workerId}_${i}`, testData, 'concurrent');
        const writeEnd = performance.now();
        workerLatencies.push(writeEnd - writeStart);

        const readStart = performance.now();
        await this.storage.get(`concurrent_${workerId}_${i}`, 'concurrent');
        const readEnd = performance.now();
        workerLatencies.push(readEnd - readStart);
      }

      return workerLatencies;
    });

    const allLatencies = await Promise.all(workers);
    const latencies = allLatencies.flat().sort((a, b) => a - b);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);
    const totalOps = latencies.length;

    return {
      operation: `concurrent_${concurrency}_workers`,
      throughput: totalOps / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: totalOps,
      duration,
    };
  }

  /**
   * Benchmark search operations
   */
  async benchmarkSearchOperations(): Promise<BenchmarkResult> {
    const operations = 1000;

    // Pre-populate with searchable data
    for (let i = 0; i < operations; i++) {
      const searchData = {
        id: i,
        content: `searchable content ${i} with special keywords`,
        tags: [`tag_${i % 10}`, `category_${i % 5}`],
      };
      await this.storage.set(`search_${i}`, searchData, 'search_benchmark');
    }

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create search operations
    const searchOps = Array.from({ length: 100 }, (_, i) =>
      () => this.storage.search(`searchable ${i % 10}`, 'search_benchmark')
    );

    const latencies = await this.measureLatencies(searchOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'search_operations',
      throughput: searchOps.length / duration,
      avgLatency: avg,
      p95Latency: p95,
      p99Latency: p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: searchOps.length,
      duration,
    };
  }

  /**
   * Run all storage benchmarks
   */
  async runAllBenchmarks(): Promise<BenchmarkResult[]> {
    console.log('🚀 Starting Storage System Benchmarks...');

    const results: BenchmarkResult[] = [];

    // Write benchmarks for different data sizes
    console.log('📝 Benchmarking write operations...');
    results.push(await this.benchmarkWriteOperations('smallDataSize'));
    results.push(await this.benchmarkWriteOperations('mediumDataSize'));
    results.push(await this.benchmarkWriteOperations('largeDataSize'));

    // Read benchmarks for different data sizes
    console.log('📖 Benchmarking read operations...');
    results.push(await this.benchmarkReadOperations('smallDataSize'));
    results.push(await this.benchmarkReadOperations('mediumDataSize'));
    results.push(await this.benchmarkReadOperations('largeDataSize'));

    // Concurrency benchmarks
    console.log('⚡ Benchmarking concurrent operations...');
    for (const concurrency of this.config.concurrencyLevels) {
      results.push(await this.benchmarkConcurrentOperations(concurrency));
    }

    // Search benchmarks
    console.log('🔍 Benchmarking search operations...');
    results.push(await this.benchmarkSearchOperations());

    return results;
  }

  /**
   * Format benchmark results for display
   */
  static formatResults(results: BenchmarkResult[]): string {
    let output = '\n📊 Storage System Performance Results\n';
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

  /**
   * Clean up benchmark data
   */
  async cleanup(): Promise<void> {
    try {
      await this.storage.clear('benchmark');
      await this.storage.clear('concurrent');
      await this.storage.clear('search_benchmark');
    } catch (error) {
      console.warn('⚠️  Warning: Could not cleanup benchmark data:', error);
    }
  }
}