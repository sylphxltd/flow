/**
 * Configuration System Performance Benchmarks
 * Tests loading, validation, transformation, and hot-reload performance
 */

import { performance, memoryUsage } from 'node:perf_hooks';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

interface ConfigBenchmarkResult {
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

interface ConfigBenchmarkConfig {
  smallConfigSize: number; // entries
  mediumConfigSize: number; // entries
  largeConfigSize: number; // entries
  operationCount: number;
  tempDir: string;
}

// Sample configuration schema
const ConfigSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    ssl: z.boolean().optional(),
  }),
  cache: z.object({
    ttl: z.number(),
    maxSize: z.number(),
    strategy: z.enum(['lru', 'fifo', 'lfu']),
  }),
  services: z.array(z.object({
    name: z.string(),
    endpoint: z.string(),
    timeout: z.number(),
    retries: z.number().optional(),
  })),
  features: z.record(z.boolean()),
});

type ConfigType = z.infer<typeof ConfigSchema>;

/**
 * Mock configuration loader
 */
class MockConfigLoader {
  private cache = new Map<string, any>();
  private transformers: Array<(config: any) => any> = [];
  private validators: Array<(config: any) => boolean> = [];

  constructor() {
    // Add sample transformer
    this.transformers.push((config) => ({
      ...config,
      database: {
        ...config.database,
        connectionTimeout: config.database.timeout || 30000,
      },
    }));

    // Add sample validator
    this.validators.push((config) =>
      config.database.port > 0 && config.database.port < 65536
    );
  }

  async loadFromFile(filePath: string): Promise<ConfigType> {
    const content = await readFile(filePath, 'utf-8');
    const config = JSON.parse(content);

    // Apply transformers
    let transformedConfig = config;
    for (const transformer of this.transformers) {
      transformedConfig = transformer(transformedConfig);
    }

    // Apply validators
    for (const validator of this.validators) {
      if (!validator(transformedConfig)) {
        throw new Error('Configuration validation failed');
      }
    }

    return ConfigSchema.parse(transformedConfig);
  }

  async loadFromObject(obj: any): Promise<ConfigType> {
    // Apply transformers
    let transformedConfig = obj;
    for (const transformer of this.transformers) {
      transformedConfig = transformer(transformedConfig);
    }

    // Apply validators
    for (const validator of this.validators) {
      if (!validator(transformedConfig)) {
        throw new Error('Configuration validation failed');
      }
    }

    return ConfigSchema.parse(transformedConfig);
  }

  addToCache(key: string, config: ConfigType): void {
    this.cache.set(key, config);
  }

  getFromCache(key: string): ConfigType | undefined {
    return this.cache.get(key);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export class ConfigurationBenchmarks {
  private config: ConfigBenchmarkConfig;
  private loader: MockConfigLoader;

  constructor(config: Partial<ConfigBenchmarkConfig> = {}) {
    this.config = {
      smallConfigSize: 10,
      mediumConfigSize: 100,
      largeConfigSize: 1000,
      operationCount: 1000,
      tempDir: '/tmp/config-benchmarks',
      ...config,
    };
    this.loader = new MockConfigLoader();
  }

  /**
   * Generate sample configuration of specified size
   */
  private generateConfig(size: number): ConfigType {
    const services = Array.from({ length: size }, (_, i) => ({
      name: `service_${i}`,
      endpoint: `https://api${i}.example.com`,
      timeout: 5000 + (i % 10) * 1000,
      retries: i % 4,
    }));

    const features = {};
    for (let i = 0; i < size; i++) {
      features[`feature_${i}`] = Math.random() > 0.5;
    }

    return {
      database: {
        host: 'localhost',
        port: 5432,
        name: `benchmark_db_${size}`,
        ssl: size > 100,
      },
      cache: {
        ttl: 3600,
        maxSize: size * 10,
        strategy: size > 500 ? 'lfu' : 'lru',
      },
      services,
      features,
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
   * Benchmark configuration loading from objects
   */
  async benchmarkConfigObjectLoading(configSize: keyof ConfigBenchmarkConfig): Promise<ConfigBenchmarkResult> {
    const size = this.config[configSize] as number;
    const operations = this.config.operationCount;

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create loading operations
    const loadOps = Array.from({ length: operations }, () => {
      const config = this.generateConfig(size);
      return () => this.loader.loadFromObject(config);
    });

    const latencies = await this.measureLatencies(loadOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: `config_object_loading_${configSize}`,
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
   * Benchmark configuration loading from files
   */
  async benchmarkConfigFileLoading(configSize: keyof ConfigBenchmarkConfig): Promise<ConfigBenchmarkResult> {
    const size = this.config[configSize] as number;
    const operations = Math.min(this.config.operationCount, 100); // Limit file operations
    const configData = this.generateConfig(size);

    // Create temporary config files
    const tempFiles: string[] = [];
    for (let i = 0; i < operations; i++) {
      const filePath = join(this.config.tempDir, `config_${i}.json`);
      await writeFile(filePath, JSON.stringify(configData, null, 2));
      tempFiles.push(filePath);
    }

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create file loading operations
    const loadOps = tempFiles.map(filePath => () => this.loader.loadFromFile(filePath));

    const latencies = await this.measureLatencies(loadOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    // Cleanup temporary files
    for (const filePath of tempFiles) {
      try {
        await unlink(filePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    return {
      operation: `config_file_loading_${configSize}`,
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
   * Benchmark configuration validation
   */
  async benchmarkConfigValidation(): Promise<ConfigBenchmarkResult> {
    const operations = this.config.operationCount;
    const validConfigs = Array.from({ length: operations / 2 }, () => this.generateConfig(100));
    const invalidConfigs = Array.from({ length: operations / 2 }, () => ({
      ...this.generateConfig(100),
      database: {
        host: 'localhost',
        port: -1, // Invalid port
        name: 'invalid_db',
      },
    }));

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create validation operations
    const validationOps = [
      ...validConfigs.map(config => () => ConfigSchema.parse(config)),
      ...invalidConfigs.map(config => () => {
        try {
          return ConfigSchema.parse(config);
        } catch (error) {
          return null; // Handle validation errors
        }
      }),
    ];

    const latencies = await this.measureLatencies(validationOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'config_validation',
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
   * Benchmark configuration caching
   */
  async benchmarkConfigCaching(): Promise<ConfigBenchmarkResult> {
    const operations = this.config.operationCount;
    const configs = Array.from({ length: operations }, () => this.generateConfig(50));

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create caching operations
    const cacheOps = [];

    // Write operations
    for (let i = 0; i < operations / 2; i++) {
      cacheOps.push(() => {
        this.loader.addToCache(`config_${i}`, configs[i]);
        return Promise.resolve();
      });
    }

    // Read operations
    for (let i = 0; i < operations / 2; i++) {
      cacheOps.push(() => {
        const result = this.loader.getFromCache(`config_${i % (operations / 2)}`);
        return Promise.resolve(result);
      });
    }

    const latencies = await this.measureLatencies(cacheOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'config_caching',
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
   * Benchmark hot-reload performance
   */
  async benchmarkHotReload(): Promise<ConfigBenchmarkResult> {
    const operations = 100; // Limited hot-reload operations
    const configData = this.generateConfig(100);

    // Create temporary config file for hot-reload simulation
    const tempFile = join(this.config.tempDir, 'hot-reload-config.json');
    await writeFile(tempFile, JSON.stringify(configData, null, 2));

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Simulate hot-reload operations
    const reloadOps = Array.from({ length: operations }, async (_, i) => {
      // Modify config
      const modifiedConfig = {
        ...configData,
        version: i,
        timestamp: Date.now(),
      };

      // Write to file
      await writeFile(tempFile, JSON.stringify(modifiedConfig, null, 2));

      // Reload from file
      return this.loader.loadFromFile(tempFile);
    });

    const latencies = await this.measureLatencies(reloadOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    // Cleanup
    try {
      await unlink(tempFile);
    } catch (error) {
      // Ignore cleanup errors
    }

    return {
      operation: 'hot_reload',
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
   * Run all configuration benchmarks
   */
  async runAllBenchmarks(): Promise<ConfigBenchmarkResult[]> {
    console.log('⚙️  Starting Configuration System Benchmarks...');

    const results: ConfigBenchmarkResult[] = [];

    // Object loading benchmarks
    console.log('📦 Benchmarking configuration object loading...');
    results.push(await this.benchmarkConfigObjectLoading('smallConfigSize'));
    results.push(await this.benchmarkConfigObjectLoading('mediumConfigSize'));
    results.push(await this.benchmarkConfigObjectLoading('largeConfigSize'));

    // File loading benchmarks
    console.log('📁 Benchmarking configuration file loading...');
    results.push(await this.benchmarkConfigFileLoading('smallConfigSize'));
    results.push(await this.benchmarkConfigFileLoading('mediumConfigSize'));

    // Validation benchmarks
    console.log('✅ Benchmarking configuration validation...');
    results.push(await this.benchmarkConfigValidation());

    // Caching benchmarks
    console.log('🗄️  Benchmarking configuration caching...');
    results.push(await this.benchmarkConfigCaching());

    // Hot-reload benchmarks
    console.log('🔄 Benchmarking hot-reload performance...');
    results.push(await this.benchmarkHotReload());

    return results;
  }

  /**
   * Format benchmark results for display
   */
  static formatResults(results: ConfigBenchmarkResult[]): string {
    let output = '\n📊 Configuration System Performance Results\n';
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
   * Clean up benchmark resources
   */
  async cleanup(): Promise<void> {
    this.loader.clearCache();
  }
}