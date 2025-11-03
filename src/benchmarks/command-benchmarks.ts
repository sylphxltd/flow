/**
 * Command System Performance Benchmarks
 * Tests command registration, lookup, middleware execution, and performance
 */

import { performance, memoryUsage } from 'node:perf_hooks';

interface CommandBenchmarkResult {
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

interface CommandBenchmarkConfig {
  commandCount: number;
  middlewareCount: number;
  operationCount: number;
}

// Mock command types
interface CommandContext {
  userId?: string;
  sessionId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

type CommandHandler = (context: CommandContext, ...args: any[]) => Promise<CommandResult>;
type Middleware = (context: CommandContext, next: () => Promise<CommandResult>) => Promise<CommandResult>;

/**
 * Mock command registry
 */
class MockCommandRegistry {
  private commands = new Map<string, CommandHandler>();
  private middleware: Middleware[] = [];
  private executionStats = new Map<string, { count: number; totalTime: number }>();

  /**
   * Register a new command
   */
  register(name: string, handler: CommandHandler): void {
    this.commands.set(name, handler);
  }

  /**
   * Get a command handler
   */
  get(name: string): CommandHandler | undefined {
    return this.commands.get(name);
  }

  /**
   * Check if command exists
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Get all command names
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Add middleware
   */
  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Execute a command with middleware chain
   */
  async execute(name: string, context: CommandContext, ...args: any[]): Promise<CommandResult> {
    const handler = this.commands.get(name);
    if (!handler) {
      return {
        success: false,
        error: `Command not found: ${name}`,
        executionTime: 0,
      };
    }

    const startTime = performance.now();

    // Build middleware chain
    const chain = this.middleware.reduceRight(
      (next, middleware) =>
        (ctx: CommandContext) => middleware(ctx, next),
      () => handler(context, ...args)
    );

    try {
      const result = await chain(context);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Update stats
      const stats = this.executionStats.get(name) || { count: 0, totalTime: 0 };
      stats.count++;
      stats.totalTime += executionTime;
      this.executionStats.set(name, stats);

      return {
        ...result,
        executionTime,
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        error: (error as Error).message,
        executionTime: endTime - startTime,
      };
    }
  }

  /**
   * Get execution statistics
   */
  getStats(): Record<string, { count: number; avgTime: number }> {
    const stats: Record<string, { count: number; avgTime: number }> = {};

    for (const [name, data] of this.executionStats) {
      stats[name] = {
        count: data.count,
        avgTime: data.totalTime / data.count,
      };
    }

    return stats;
  }

  /**
   * Clear all commands and stats
   */
  clear(): void {
    this.commands.clear();
    this.executionStats.clear();
    this.middleware = [];
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.commands.size;
  }
}

export class CommandBenchmarks {
  private config: CommandBenchmarkConfig;
  private registry: MockCommandRegistry;

  constructor(config: Partial<CommandBenchmarkConfig> = {}) {
    this.config = {
      commandCount: 1000,
      middlewareCount: 10,
      operationCount: 10000,
      ...config,
    };
    this.registry = new MockCommandRegistry();
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
   * Create sample command handlers
   */
  private createCommandHandlers(count: number): Array<{ name: string; handler: CommandHandler }> {
    return Array.from({ length: count }, (_, i) => ({
      name: `command_${i}`,
      handler: async (context: CommandContext, ...args: any[]): Promise<CommandResult> => {
        // Simulate different workloads
        const complexity = i % 4;
        let processingTime = 0;

        switch (complexity) {
          case 0: // Simple operation
            processingTime = Math.random() * 5;
            break;
          case 1: // Medium operation
            processingTime = Math.random() * 20;
            break;
          case 2: // Complex operation
            processingTime = Math.random() * 50;
            break;
          case 3: // I/O simulation
            processingTime = Math.random() * 100;
            break;
        }

        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, processingTime));

        return {
          success: true,
          data: {
            commandId: i,
            processedAt: Date.now(),
            args,
            complexity,
          },
          executionTime: processingTime,
        };
      },
    }));
  }

  /**
   * Create sample middleware
   */
  private createMiddleware(count: number): Middleware[] {
    return Array.from({ length: count }, (_, i) => {
      return async (context: CommandContext, next: () => Promise<CommandResult>): Promise<CommandResult> => {
        // Add metadata to context
        if (!context.metadata) context.metadata = {};
        context.metadata[`middleware_${i}`] = true;
        context.metadata[`timestamp_${i}`] = Date.now();

        // Simulate middleware processing time
        const processingTime = Math.random() * 5;
        await new Promise(resolve => setTimeout(resolve, processingTime));

        // Call next middleware or command
        const result = await next();

        // Post-processing
        if (result.data && !Array.isArray(result.data)) {
          result.data[`processed_by_middleware_${i}`] = true;
        }

        return result;
      };
    });
  }

  /**
   * Benchmark command registration
   */
  async benchmarkCommandRegistration(): Promise<CommandBenchmarkResult> {
    const operations = this.config.commandCount;
    const handlers = this.createCommandHandlers(operations);

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Register commands
    for (const { name, handler } of handlers) {
      this.registry.register(name, handler);
    }

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    // Simulate latencies (registration is synchronous)
    const avgLatency = (endTime - startTime) / operations;
    const latencies = Array.from({ length: operations }, () => avgLatency);

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'command_registration',
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
   * Benchmark command lookup
   */
  async benchmarkCommandLookup(): Promise<CommandBenchmarkResult> {
    const operations = this.config.operationCount;
    const commandCount = Math.min(this.config.commandCount, 100); // Limit for lookup test

    // Register some commands
    const handlers = this.createCommandHandlers(commandCount);
    for (const { name, handler } of handlers) {
      this.registry.register(name, handler);
    }

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create lookup operations
    const lookupOps = Array.from({ length: operations }, (_, i) => {
      const commandName = `command_${i % commandCount}`;
      return () => Promise.resolve(this.registry.get(commandName));
    });

    const latencies = await this.measureLatencies(lookupOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'command_lookup',
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
   * Benchmark middleware chain execution
   */
  async benchmarkMiddlewareExecution(): Promise<CommandBenchmarkResult> {
    const operations = this.config.operationCount;
    const middlewareCount = this.config.middlewareCount;

    // Register test command
    this.registry.register('test_command', async (context: CommandContext) => ({
      success: true,
      data: { executed: true },
      executionTime: 1,
    }));

    // Add middleware
    const middleware = this.createMiddleware(middlewareCount);
    for (const mw of middleware) {
      this.registry.use(mw);
    }

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create execution operations
    const executeOps = Array.from({ length: operations }, (_, i) => {
      const context: CommandContext = {
        sessionId: `session_${i}`,
        timestamp: Date.now(),
        userId: `user_${i % 100}`,
      };
      return () => this.registry.execute('test_command', context);
    });

    const latencies = await this.measureLatencies(executeOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'middleware_execution',
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
   * Benchmark command execution with varying complexity
   */
  async benchmarkCommandExecution(): Promise<CommandBenchmarkResult> {
    const operations = this.config.operationCount;
    const commandCount = Math.min(this.config.commandCount, 100);

    // Register commands with different complexities
    const handlers = this.createCommandHandlers(commandCount);
    for (const { name, handler } of handlers) {
      this.registry.register(name, handler);
    }

    // Add some middleware
    const middleware = this.createMiddleware(5);
    for (const mw of middleware) {
      this.registry.use(mw);
    }

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Create execution operations
    const executeOps = Array.from({ length: operations }, (_, i) => {
      const commandName = `command_${i % commandCount}`;
      const context: CommandContext = {
        sessionId: `session_${i}`,
        timestamp: Date.now(),
        userId: `user_${i % 100}`,
        metadata: { iteration: i },
      };
      return () => this.registry.execute(commandName, context, `arg_${i}`);
    });

    const latencies = await this.measureLatencies(executeOps);

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    const { avg, p95, p99 } = this.calculatePercentiles(latencies);

    return {
      operation: 'command_execution',
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
   * Benchmark memory usage of large command registry
   */
  async benchmarkMemoryUsage(): Promise<CommandBenchmarkResult> {
    const operations = this.config.commandCount;
    const handlers = this.createCommandHandlers(operations);

    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    // Register all commands
    for (const { name, handler } of handlers) {
      this.registry.register(name, handler);
    }

    // Add middleware
    const middleware = this.createMiddleware(this.config.middlewareCount);
    for (const mw of middleware) {
      this.registry.use(mw);
    }

    // Execute some commands to populate stats
    for (let i = 0; i < 1000; i++) {
      const commandName = `command_${i % operations}`;
      const context: CommandContext = {
        sessionId: `memory_test_${i}`,
        timestamp: Date.now(),
      };
      await this.registry.execute(commandName, context);
    }

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds

    return {
      operation: 'memory_usage',
      throughput: operations / duration,
      avgLatency: 0, // Not applicable for this benchmark
      p95Latency: 0,
      p99Latency: 0,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      totalOperations: operations,
      duration,
    };
  }

  /**
   * Run all command benchmarks
   */
  async runAllBenchmarks(): Promise<CommandBenchmarkResult[]> {
    console.log('🎯 Starting Command System Benchmarks...');

    const results: CommandBenchmarkResult[] = [];

    // Registration benchmark
    console.log('📝 Benchmarking command registration...');
    results.push(await this.benchmarkCommandRegistration());

    // Reset registry for lookup test
    this.registry.clear();
    console.log('🔍 Benchmarking command lookup...');
    results.push(await this.benchmarkCommandLookup());

    // Reset for middleware test
    this.registry.clear();
    console.log('⚙️  Benchmarking middleware execution...');
    results.push(await this.benchmarkMiddlewareExecution());

    // Reset for execution test
    this.registry.clear();
    console.log('⚡ Benchmarking command execution...');
    results.push(await this.benchmarkCommandExecution());

    // Reset for memory test
    this.registry.clear();
    console.log('🧠 Benchmarking memory usage...');
    results.push(await this.benchmarkMemoryUsage());

    return results;
  }

  /**
   * Format benchmark results for display
   */
  static formatResults(results: CommandBenchmarkResult[]): string {
    let output = '\n📊 Command System Performance Results\n';
    output += '='.repeat(60) + '\n\n';

    for (const result of results) {
      output += `🔸 ${result.operation.replace(/_/g, ' ').toUpperCase()}\n`;
      output += `   Throughput: ${result.throughput.toFixed(2)} ops/sec\n`;
      if (result.avgLatency > 0) {
        output += `   Avg Latency: ${result.avgLatency.toFixed(2)}ms\n`;
        output += `   P95 Latency: ${result.p95Latency.toFixed(2)}ms\n`;
        output += `   P99 Latency: ${result.p99Latency.toFixed(2)}ms\n`;
      }
      output += `   Memory Usage: ${result.memoryDelta.toFixed(2)}MB delta\n`;
      output += `   Total Operations: ${result.totalOperations}\n`;
      output += `   Duration: ${result.duration.toFixed(2)}s\n\n`;
    }

    return output;
  }

  /**
   * Clean up benchmark resources
   */
  cleanup(): void {
    this.registry.clear();
  }
}