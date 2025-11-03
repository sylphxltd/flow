/**
 * Memory Management and Profiling Benchmarks
 * Tests memory usage patterns, GC impact, and resource management
 */

import { performance, memoryUsage } from 'node:perf_hooks';
import { gc } from 'node:vm';
import { setTimeout } from 'node:timers/promises';

interface MemoryBenchmarkResult {
  operation: string;
  peakMemoryUsage: number; // MB
  avgMemoryUsage: number; // MB
  memoryGrowthRate: number; // MB per second
  gcCount: number;
  gcTime: number; // milliseconds
  objectCreationRate: number; // objects per second
  totalOperations: number;
  duration: number; // seconds
  memoryLeakDetected: boolean;
}

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

interface MemoryBenchmarkConfig {
  sampleInterval: number; // milliseconds
  testDuration: number; // seconds
  objectCount: number;
  objectSize: number; // bytes
  stressTestDuration: number; // seconds
}

/**
 * Memory profiler for tracking memory usage over time
 */
class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;
  private gcCountBefore = 0;
  private gcCountAfter = 0;

  constructor(private sampleInterval: number = 100) {}

  /**
   * Start memory profiling
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.snapshots = [];
    this.gcCountBefore = this.getGCCount();

    // Take initial snapshot
    this.takeSnapshot();

    // Start periodic sampling
    this.interval = setInterval(() => {
      this.takeSnapshot();
    }, this.sampleInterval);
  }

  /**
   * Stop memory profiling
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.gcCountAfter = this.getGCCount();
    this.takeSnapshot(); // Final snapshot
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): void {
    const usage = process.memoryUsage();
    this.snapshots.push({
      timestamp: performance.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    });
  }

  /**
   * Get GC count (approximation)
   */
  private getGCCount(): number {
    // Node.js doesn't expose GC count directly, so we'll use approximation
    // This is a simplified approach
    return 0;
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): void {
    try {
      if (gc) {
        gc();
      }
    } catch (error) {
      // GC not available
    }
  }

  /**
   * Get profiling results
   */
  getResults(): {
    snapshots: MemorySnapshot[];
    peakMemoryUsage: number;
    avgMemoryUsage: number;
    memoryGrowthRate: number;
    gcCount: number;
    duration: number;
  } {
    if (this.snapshots.length < 2) {
      return {
        snapshots: this.snapshots,
        peakMemoryUsage: 0,
        avgMemoryUsage: 0,
        memoryGrowthRate: 0,
        gcCount: 0,
        duration: 0,
      };
    }

    const startSnapshot = this.snapshots[0];
    const endSnapshot = this.snapshots[this.snapshots.length - 1];
    const duration = (endSnapshot.timestamp - startSnapshot.timestamp) / 1000; // seconds

    // Calculate peak memory usage
    const peakMemoryUsage = Math.max(
      ...this.snapshots.map(s => s.heapUsed)
    ) / 1024 / 1024; // MB

    // Calculate average memory usage
    const totalMemory = this.snapshots.reduce(
      (sum, snapshot) => sum + snapshot.heapUsed,
      0
    );
    const avgMemoryUsage = (totalMemory / this.snapshots.length) / 1024 / 1024; // MB

    // Calculate memory growth rate
    const memoryGrowth = (endSnapshot.heapUsed - startSnapshot.heapUsed) / 1024 / 1024; // MB
    const memoryGrowthRate = duration > 0 ? memoryGrowth / duration : 0; // MB per second

    return {
      snapshots: this.snapshots,
      peakMemoryUsage,
      avgMemoryUsage,
      memoryGrowthRate,
      gcCount: this.gcCountAfter - this.gcCountBefore,
      duration,
    };
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeaks(threshold: number = 1.0): boolean {
    const results = this.getResults();
    return results.memoryGrowthRate > threshold; // MB per second
  }

  /**
   * Reset profiler
   */
  reset(): void {
    this.stop();
    this.snapshots = [];
    this.gcCountBefore = 0;
    this.gcCountAfter = 0;
  }
}

export class MemoryBenchmarks {
  private config: MemoryBenchmarkConfig;
  private profiler: MemoryProfiler;

  constructor(config: Partial<MemoryBenchmarkConfig> = {}) {
    this.config = {
      sampleInterval: 100,
      testDuration: 10,
      objectCount: 100000,
      objectSize: 1024,
      stressTestDuration: 30,
      ...config,
    };
    this.profiler = new MemoryProfiler(this.config.sampleInterval);
  }

  /**
   * Create test object of specified size
   */
  private createTestObject(size: number, index: number): any {
    const data = 'x'.repeat(Math.max(0, size - 100)); // Account for object overhead
    return {
      id: index,
      timestamp: Date.now(),
      data: data,
      metadata: {
        created: new Date().toISOString(),
        size: size,
        checksum: Math.random().toString(36),
      },
      nested: {
        level1: {
          level2: {
            value: index * 2,
            text: `nested_${index}`,
          },
        },
      },
    };
  }

  /**
   * Benchmark object creation and destruction
   */
  async benchmarkObjectCreation(): Promise<MemoryBenchmarkResult> {
    const objectCount = this.config.objectCount;
    const objectSize = this.config.objectSize;

    this.profiler.start();
    const startTime = performance.now();

    // Create objects
    const objects: any[] = [];
    for (let i = 0; i < objectCount; i++) {
      objects.push(this.createTestObject(objectSize, i));
    }

    // Destroy objects
    objects.length = 0; // Clear array

    // Force GC if available
    this.profiler.forceGC();

    const endTime = performance.now();
    this.profiler.stop();

    const profilingResults = this.profiler.getResults();
    const duration = (endTime - startTime) / 1000; // seconds

    return {
      operation: 'object_creation_destruction',
      peakMemoryUsage: profilingResults.peakMemoryUsage,
      avgMemoryUsage: profilingResults.avgMemoryUsage,
      memoryGrowthRate: profilingResults.memoryGrowthRate,
      gcCount: profilingResults.gcCount,
      gcTime: 0, // Not directly measurable
      objectCreationRate: objectCount / duration,
      totalOperations: objectCount,
      duration,
      memoryLeakDetected: this.profiler.detectMemoryLeaks(),
    };
  }

  /**
   * Benchmark memory usage under sustained load
   */
  async benchmarkSustainedLoad(): Promise<MemoryBenchmarkResult> {
    const testDuration = this.config.stressTestDuration;
    const objectSize = this.config.objectSize;

    this.profiler.start();
    const startTime = performance.now();
    let operationCount = 0;

    const endTime = startTime + (testDuration * 1000);

    // Sustained load for specified duration
    while (performance.now() < endTime) {
      // Create and immediately discard objects
      for (let i = 0; i < 1000; i++) {
        const obj = this.createTestObject(objectSize, operationCount++);
        // Simulate some processing
        obj.processed = true;
      }

      // Periodic GC
      if (operationCount % 10000 === 0) {
        this.profiler.forceGC();
      }

      // Small delay to prevent 100% CPU usage
      await setTimeout(1);
    }

    const finalTime = performance.now();
    this.profiler.stop();

    const profilingResults = this.profiler.getResults();
    const duration = (finalTime - startTime) / 1000; // seconds

    return {
      operation: 'sustained_load',
      peakMemoryUsage: profilingResults.peakMemoryUsage,
      avgMemoryUsage: profilingResults.avgMemoryUsage,
      memoryGrowthRate: profilingResults.memoryGrowthRate,
      gcCount: profilingResults.gcCount,
      gcTime: 0,
      objectCreationRate: operationCount / duration,
      totalOperations: operationCount,
      duration,
      memoryLeakDetected: this.profiler.detectMemoryLeaks(),
    };
  }

  /**
   * Benchmark memory leak scenarios
   */
  async benchmarkMemoryLeaks(): Promise<MemoryBenchmarkResult> {
    const objectCount = this.config.objectCount / 10; // Smaller for leak test
    const objectSize = this.config.objectSize;

    // Intentionally create a memory leak by keeping references
    const leakedObjects: any[] = [];

    this.profiler.start();
    const startTime = performance.now();

    // Create objects that won't be cleaned up
    for (let i = 0; i < objectCount; i++) {
      leakedObjects.push(this.createTestObject(objectSize, i));

      // Also create objects that will be cleaned up
      const tempObj = this.createTestObject(objectSize, i);
      tempObj.temp = true; // Mark as temporary
    }

    const endTime = performance.now();
    this.profiler.stop();

    const profilingResults = this.profiler.getResults();
    const duration = (endTime - startTime) / 1000; // seconds

    // Clean up for next test (but leak remains)
    leakedObjects.length = 0;

    return {
      operation: 'memory_leak_simulation',
      peakMemoryUsage: profilingResults.peakMemoryUsage,
      avgMemoryUsage: profilingResults.avgMemoryUsage,
      memoryGrowthRate: profilingResults.memoryGrowthRate,
      gcCount: profilingResults.gcCount,
      gcTime: 0,
      objectCreationRate: (objectCount * 2) / duration, // Created 2x objects
      totalOperations: objectCount * 2,
      duration,
      memoryLeakDetected: true, // We expect a leak in this test
    };
  }

  /**
   * Benchmark garbage collection performance
   */
  async benchmarkGarbageCollection(): Promise<MemoryBenchmarkResult> {
    const objectCount = this.config.objectCount;
    const objectSize = this.config.objectSize;

    this.profiler.start();
    const startTime = performance.now();

    // Create objects
    const objects: any[] = [];
    for (let i = 0; i < objectCount; i++) {
      objects.push(this.createTestObject(objectSize, i));
    }

    // Measure GC performance
    const gcStartTime = performance.now();
    this.profiler.forceGC();
    const gcEndTime = performance.now();

    // Clear references
    objects.length = 0;

    // Force GC again
    this.profiler.forceGC();

    const endTime = performance.now();
    this.profiler.stop();

    const profilingResults = this.profiler.getResults();
    const duration = (endTime - startTime) / 1000; // seconds

    return {
      operation: 'garbage_collection',
      peakMemoryUsage: profilingResults.peakMemoryUsage,
      avgMemoryUsage: profilingResults.avgMemoryUsage,
      memoryGrowthRate: profilingResults.memoryGrowthRate,
      gcCount: profilingResults.gcCount,
      gcTime: gcEndTime - gcStartTime,
      objectCreationRate: objectCount / duration,
      totalOperations: objectCount,
      duration,
      memoryLeakDetected: this.profiler.detectMemoryLeaks(),
    };
  }

  /**
   * Benchmark memory fragmentation
   */
  async benchmarkMemoryFragmentation(): Promise<MemoryBenchmarkResult> {
    const objectCount = this.config.objectCount;

    this.profiler.start();
    const startTime = performance.now();

    // Create objects of varying sizes to cause fragmentation
    const objects: any[] = [];
    for (let i = 0; i < objectCount; i++) {
      const size = 64 + (i % 10) * 512; // Varying sizes from 64B to 5KB
      objects.push(this.createTestObject(size, i));
    }

    // Randomly delete objects to create fragmentation
    for (let i = 0; i < objectCount / 2; i++) {
      const randomIndex = Math.floor(Math.random() * objects.length);
      objects.splice(randomIndex, 1);
    }

    // Create more objects
    for (let i = 0; i < objectCount / 4; i++) {
      const size = 128 + (i % 5) * 256;
      objects.push(this.createTestObject(size, i + objectCount));
    }

    const endTime = performance.now();
    this.profiler.stop();

    const profilingResults = this.profiler.getResults();
    const duration = (endTime - startTime) / 1000; // seconds

    return {
      operation: 'memory_fragmentation',
      peakMemoryUsage: profilingResults.peakMemoryUsage,
      avgMemoryUsage: profilingResults.avgMemoryUsage,
      memoryGrowthRate: profilingResults.memoryGrowthRate,
      gcCount: profilingResults.gcCount,
      gcTime: 0,
      objectCreationRate: (objectCount * 1.25) / duration, // 125% of original count
      totalOperations: Math.floor(objectCount * 1.25),
      duration,
      memoryLeakDetected: this.profiler.detectMemoryLeaks(),
    };
  }

  /**
   * Run all memory benchmarks
   */
  async runAllBenchmarks(): Promise<MemoryBenchmarkResult[]> {
    console.log('🧠 Starting Memory Management Benchmarks...');

    const results: MemoryBenchmarkResult[] = [];

    // Object creation benchmark
    console.log('🏗️  Benchmarking object creation and destruction...');
    results.push(await this.benchmarkObjectCreation());

    // Reset profiler
    this.profiler.reset();

    // Sustained load benchmark
    console.log('⚡ Benchmarking sustained memory load...');
    results.push(await this.benchmarkSustainedLoad());

    // Reset profiler
    this.profiler.reset();

    // Memory leak benchmark
    console.log('🕳️  Benchmarking memory leak scenarios...');
    results.push(await this.benchmarkMemoryLeaks());

    // Reset profiler
    this.profiler.reset();

    // Garbage collection benchmark
    console.log('🗑️  Benchmarking garbage collection...');
    results.push(await this.benchmarkGarbageCollection());

    // Reset profiler
    this.profiler.reset();

    // Memory fragmentation benchmark
    console.log('💔 Benchmarking memory fragmentation...');
    results.push(await this.benchmarkMemoryFragmentation());

    return results;
  }

  /**
   * Format benchmark results for display
   */
  static formatResults(results: MemoryBenchmarkResult[]): string {
    let output = '\n📊 Memory Management Performance Results\n';
    output += '='.repeat(60) + '\n\n';

    for (const result of results) {
      output += `🔸 ${result.operation.replace(/_/g, ' ').toUpperCase()}\n`;
      output += `   Peak Memory Usage: ${result.peakMemoryUsage.toFixed(2)}MB\n`;
      output += `   Avg Memory Usage: ${result.avgMemoryUsage.toFixed(2)}MB\n`;
      output += `   Memory Growth Rate: ${result.memoryGrowthRate.toFixed(2)}MB/s\n`;
      output += `   GC Count: ${result.gcCount}\n`;
      if (result.gcTime > 0) {
        output += `   GC Time: ${result.gcTime.toFixed(2)}ms\n`;
      }
      output += `   Object Creation Rate: ${result.objectCreationRate.toFixed(0)} objects/sec\n`;
      output += `   Total Operations: ${result.totalOperations}\n`;
      output += `   Duration: ${result.duration.toFixed(2)}s\n`;
      output += `   Memory Leak Detected: ${result.memoryLeakDetected ? '⚠️ YES' : '✅ NO'}\n\n`;
    }

    return output;
  }

  /**
   * Generate memory usage recommendations
   */
  static generateRecommendations(results: MemoryBenchmarkResult[]): string {
    let recommendations = '\n💡 Memory Management Recommendations\n';
    recommendations += '='.repeat(60) + '\n\n';

    const leaksDetected = results.filter(r => r.memoryLeakDetected);
    if (leaksDetected.length > 0) {
      recommendations += '⚠️  MEMORY LEAKS DETECTED:\n';
      recommendations += '   - Review object lifecycle management\n';
      recommendations += '   - Check for unintended reference retention\n';
      recommendations += '   - Consider using WeakMap/WeakSet for caching\n\n';
    }

    const highGrowthRates = results.filter(r => r.memoryGrowthRate > 5);
    if (highGrowthRates.length > 0) {
      recommendations += '📈 HIGH MEMORY GROWTH RATES:\n';
      recommendations += '   - Implement object pooling for frequently created objects\n';
      recommendations += '   - Consider streaming instead of buffering large datasets\n';
      recommendations += '   - Review data structure efficiency\n\n';
    }

    const highPeakUsage = results.filter(r => r.peakMemoryUsage > 500);
    if (highPeakUsage.length > 0) {
      recommendations += '🏔️  HIGH PEAK MEMORY USAGE:\n';
      recommendations += '   - Implement memory usage monitoring\n';
      recommendations += '   - Consider breaking large operations into smaller chunks\n';
      recommendations += '   - Optimize data structures and algorithms\n\n';
    }

    const lowObjectCreationRates = results.filter(r => r.objectCreationRate < 10000);
    if (lowObjectCreationRates.length > 0) {
      recommendations += '🐌 LOW OBJECT CREATION PERFORMANCE:\n';
      recommendations += '   - Consider object pooling or reuse patterns\n';
      recommendations += '   - Optimize object initialization\n';
      recommendations += '   - Reduce unnecessary object creation\n\n';
    }

    if (leaksDetected.length === 0 && highGrowthRates.length === 0 &&
        highPeakUsage.length === 0 && lowObjectCreationRates.length === 0) {
      recommendations += '✅ Memory management appears healthy!\n';
      recommendations += '   - Continue monitoring in production\n';
      recommendations += '   - Consider periodic memory profiling\n';
      recommendations += '   - Implement memory usage alerts\n\n';
    }

    return recommendations;
  }
}