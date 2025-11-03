/**
 * Comprehensive Performance Benchmark Runner
 * Orchestrates all performance tests and generates reports
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { StorageBenchmarks } from './storage-benchmarks.js';
import { ConfigurationBenchmarks } from './config-benchmarks.js';
import { CommandBenchmarks } from './command-benchmarks.js';
import { ResultBenchmarks } from './result-benchmarks.js';
import { MemoryBenchmarks } from './memory-benchmarks.js';

interface BenchmarkSuite {
  name: string;
  description: string;
  run: () => Promise<any[]>;
  cleanup?: () => Promise<void> | void;
}

interface OverallBenchmarkReport {
  timestamp: string;
  totalDuration: number; // seconds
  systemInfo: {
    nodeVersion: string;
    platform: string;
    arch: string;
    memory: {
      total: number; // MB
      free: number; // MB
    };
  };
  results: {
    storage: any[];
    configuration: any[];
    commands: any[];
    resultTypes: any[];
    memory: any[];
  };
  summary: {
    totalOperations: number;
    peakMemoryUsage: number;
    issues: string[];
    recommendations: string[];
  };
}

export class BenchmarkRunner {
  private suites: BenchmarkSuite[];
  private outputDir: string;

  constructor(outputDir: string = './benchmark-results') {
    this.outputDir = outputDir;
    this.suites = [
      {
        name: 'Storage System',
        description: 'Tests storage throughput, latency, and scalability',
        run: async () => {
          const benchmarks = new StorageBenchmarks();
          await benchmarks.initialize();
          const results = await benchmarks.runAllBenchmarks();
          await benchmarks.cleanup();
          return results;
        },
      },
      {
        name: 'Configuration System',
        description: 'Tests config loading, validation, and hot-reload',
        run: async () => {
          const benchmarks = new ConfigurationBenchmarks();
          const results = await benchmarks.runAllBenchmarks();
          await benchmarks.cleanup();
          return results;
        },
      },
      {
        name: 'Command System',
        description: 'Tests command registration, lookup, and execution',
        run: async () => {
          const benchmarks = new CommandBenchmarks();
          const results = await benchmarks.runAllBenchmarks();
          benchmarks.cleanup();
          return results;
        },
      },
      {
        name: 'Result Types',
        description: 'Tests functional error handling performance',
        run: async () => {
          const benchmarks = new ResultBenchmarks();
          return await benchmarks.runAllBenchmarks();
        },
      },
      {
        name: 'Memory Management',
        description: 'Tests memory usage, GC, and resource management',
        run: async () => {
          const benchmarks = new MemoryBenchmarks();
          return await benchmarks.runAllBenchmarks();
        },
      },
    ];
  }

  /**
   * Get system information
   */
  private getSystemInfo() {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        total: totalMem / 1024 / 1024, // MB
        free: freeMem / 1024 / 1024, // MB
      },
    };
  }

  /**
   * Run all benchmark suites
   */
  async runAllBenchmarks(): Promise<OverallBenchmarkReport> {
    console.log('🚀 Starting Comprehensive Performance Benchmark Suite');
    console.log('=' .repeat(60));

    const startTime = Date.now();
    const systemInfo = this.getSystemInfo();

    // Ensure output directory exists
    try {
      await mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.warn('⚠️  Could not create output directory:', error);
    }

    const report: OverallBenchmarkReport = {
      timestamp: new Date().toISOString(),
      totalDuration: 0,
      systemInfo,
      results: {
        storage: [],
        configuration: [],
        commands: [],
        resultTypes: [],
        memory: [],
      },
      summary: {
        totalOperations: 0,
        peakMemoryUsage: 0,
        issues: [],
        recommendations: [],
      },
    };

    // Run each benchmark suite
    for (const suite of this.suites) {
      console.log(`\n📊 Running ${suite.name} Benchmarks`);
      console.log(`   ${suite.description}`);
      console.log('-'.repeat(40));

      const suiteStartTime = Date.now();

      try {
        const results = await suite.run();
        const suiteDuration = (Date.now() - suiteStartTime) / 1000;

        // Store results based on suite name
        const suiteKey = this.getSuiteKey(suite.name);
        report.results[suiteKey] = results;

        // Display results
        this.displaySuiteResults(suite.name, results, suiteDuration);

        // Update summary
        this.updateSummary(report, results);

        // Save individual suite results
        await this.saveSuiteResults(suite.name, results);

      } catch (error) {
        console.error(`❌ ${suite.name} benchmarks failed:`, error);
        report.summary.issues.push(`${suite.name} failed: ${(error as Error).message}`);
      }

      // Cleanup if needed
      if (suite.cleanup) {
        try {
          await suite.cleanup();
        } catch (error) {
          console.warn(`⚠️  Cleanup failed for ${suite.name}:`, error);
        }
      }
    }

    report.totalDuration = (Date.now() - startTime) / 1000;

    // Generate overall report
    await this.generateOverallReport(report);

    console.log('\n✅ All benchmarks completed successfully!');
    console.log(`📁 Results saved to: ${this.outputDir}`);

    return report;
  }

  /**
   * Get the key for storing suite results
   */
  private getSuiteKey(suiteName: string): keyof OverallBenchmarkReport['results'] {
    const keyMap: Record<string, keyof OverallBenchmarkReport['results']> = {
      'Storage System': 'storage',
      'Configuration System': 'configuration',
      'Command System': 'commands',
      'Result Types': 'resultTypes',
      'Memory Management': 'memory',
    };
    return keyMap[suiteName] || 'storage';
  }

  /**
   * Display suite results
   */
  private displaySuiteResults(suiteName: string, results: any[], duration: number): void {
    let formattedResults = '';

    switch (suiteName) {
      case 'Storage System':
        formattedResults = StorageBenchmarks.formatResults(results);
        break;
      case 'Configuration System':
        formattedResults = ConfigurationBenchmarks.formatResults(results);
        break;
      case 'Command System':
        formattedResults = CommandBenchmarks.formatResults(results);
        break;
      case 'Result Types':
        formattedResults = ResultBenchmarks.formatResults(results);
        break;
      case 'Memory Management':
        formattedResults = MemoryBenchmarks.formatResults(results);
        break;
    }

    console.log(formattedResults);
    console.log(`⏱️  ${suiteName} completed in ${duration.toFixed(2)}s`);
  }

  /**
   * Update overall summary
   */
  private updateSummary(report: OverallBenchmarkReport, results: any[]): void {
    // Calculate total operations
    const totalOps = results.reduce((sum, result) => {
      return sum + (result.totalOperations || 0);
    }, 0);
    report.summary.totalOperations += totalOps;

    // Track peak memory usage
    const peakMemory = Math.max(
      ...results.map(r => r.memoryAfter || r.peakMemoryUsage || 0)
    );
    report.summary.peakMemoryUsage = Math.max(
      report.summary.peakMemoryUsage,
      peakMemory
    );

    // Check for performance issues
    results.forEach(result => {
      if (result.memoryLeakDetected) {
        report.summary.issues.push(`Memory leak detected in ${result.operation}`);
      }
      if (result.throughput && result.throughput < 1000) {
        report.summary.issues.push(`Low throughput in ${result.operation}: ${result.throughput.toFixed(2)} ops/sec`);
      }
      if (result.avgLatency && result.avgLatency > 100) {
        report.summary.issues.push(`High latency in ${result.operation}: ${result.avgLatency.toFixed(2)}ms`);
      }
    });
  }

  /**
   * Save individual suite results
   */
  private async saveSuiteResults(suiteName: string, results: any[]): Promise<void> {
    const fileName = `${suiteName.toLowerCase().replace(/\s+/g, '-')}-results.json`;
    const filePath = join(this.outputDir, fileName);

    try {
      await writeFile(
        filePath,
        JSON.stringify(results, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.warn(`⚠️  Could not save ${suiteName} results:`, error);
    }
  }

  /**
   * Generate overall performance report
   */
  private async generateOverallReport(report: OverallBenchmarkReport): Promise<void> {
    // Generate summary report
    let summaryReport = '\n📊 COMPREHENSIVE PERFORMANCE BENCHMARK REPORT\n';
    summaryReport += '='.repeat(60) + '\n\n';
    summaryReport += `🕐 Timestamp: ${report.timestamp}\n`;
    summaryReport += `⏱️  Total Duration: ${report.totalDuration.toFixed(2)}s\n`;
    summaryReport += `🔢 Total Operations: ${report.summary.totalOperations.toLocaleString()}\n`;
    summaryReport += `🧠 Peak Memory Usage: ${report.summary.peakMemoryUsage.toFixed(2)}MB\n\n`;

    // System information
    summaryReport += '💻 SYSTEM INFORMATION\n';
    summaryReport += '-'.repeat(30) + '\n';
    summaryReport += `Node.js Version: ${report.systemInfo.nodeVersion}\n`;
    summaryReport += `Platform: ${report.systemInfo.platform} (${report.systemInfo.arch})\n`;
    summaryReport += `Total Memory: ${report.systemInfo.memory.total.toFixed(0)}MB\n`;
    summaryReport += `Free Memory: ${report.systemInfo.memory.free.toFixed(0)}MB\n\n`;

    // Performance highlights
    summaryReport += '⚡ PERFORMANCE HIGHLIGHTS\n';
    summaryReport += '-'.repeat(30) + '\n';

    // Best performers
    const allResults = [
      ...report.results.storage,
      ...report.results.configuration,
      ...report.results.commands,
      ...report.results.resultTypes,
      ...report.results.memory,
    ];

    if (allResults.length > 0) {
      // Highest throughput
      const bestThroughput = allResults
        .filter(r => r.throughput)
        .sort((a, b) => b.throughput - a.throughput)[0];
      if (bestThroughput) {
        summaryReport += `🏆 Highest Throughput: ${bestThroughput.operation} (${bestThroughput.throughput.toFixed(2)} ops/sec)\n`;
      }

      // Lowest latency
      const bestLatency = allResults
        .filter(r => r.avgLatency)
        .sort((a, b) => a.avgLatency - b.avgLatency)[0];
      if (bestLatency) {
        summaryReport += `⚡ Lowest Latency: ${bestLatency.operation} (${bestLatency.avgLatency.toFixed(2)}ms)\n`;
      }
    }

    // Issues and recommendations
    if (report.summary.issues.length > 0) {
      summaryReport += '\n⚠️  PERFORMANCE ISSUES\n';
      summaryReport += '-'.repeat(30) + '\n';
      report.summary.issues.forEach((issue, i) => {
        summaryReport += `${i + 1}. ${issue}\n`;
      });
    }

    // Add memory recommendations if memory benchmarks were run
    if (report.results.memory.length > 0) {
      summaryReport += MemoryBenchmarks.generateRecommendations(report.results.memory);
    }

    // Performance targets assessment
    summaryReport += '\n🎯 PERFORMANCE TARGETS ASSESSMENT\n';
    summaryReport += '-'.repeat(30) + '\n';
    summaryReport += this.assessPerformanceTargets(allResults);

    // Save comprehensive report
    const reportPath = join(this.outputDir, 'comprehensive-performance-report.md');
    try {
      await writeFile(reportPath, summaryReport, 'utf-8');
      console.log(`📄 Comprehensive report saved to: ${reportPath}`);
    } catch (error) {
      console.warn('⚠️  Could not save comprehensive report:', error);
    }

    // Save raw data
    const jsonReportPath = join(this.outputDir, 'benchmark-results.json');
    try {
      await writeFile(jsonReportPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`📊 Raw data saved to: ${jsonReportPath}`);
    } catch (error) {
      console.warn('⚠️  Could not save raw data:', error);
    }
  }

  /**
   * Assess performance against targets
   */
  private assessPerformanceTargets(results: any[]): string {
    let assessment = '';

    const targets = {
      throughput: 10000, // ops/sec
      latency: 50, // ms
      memoryGrowth: 5, // MB/sec
    };

    let targetsMet = 0;
    let totalTargets = 0;

    // Check throughput targets
    const throughputResults = results.filter(r => r.throughput);
    if (throughputResults.length > 0) {
      totalTargets++;
      const avgThroughput = throughputResults.reduce((sum, r) => sum + r.throughput, 0) / throughputResults.length;
      if (avgThroughput >= targets.throughput) {
        targetsMet++;
        assessment += `✅ Throughput: ${avgThroughput.toFixed(2)} ops/sec (target: ${targets.throughput})\n`;
      } else {
        assessment += `❌ Throughput: ${avgThroughput.toFixed(2)} ops/sec (target: ${targets.throughput})\n`;
      }
    }

    // Check latency targets
    const latencyResults = results.filter(r => r.avgLatency);
    if (latencyResults.length > 0) {
      totalTargets++;
      const avgLatency = latencyResults.reduce((sum, r) => sum + r.avgLatency, 0) / latencyResults.length;
      if (avgLatency <= targets.latency) {
        targetsMet++;
        assessment += `✅ Latency: ${avgLatency.toFixed(2)}ms (target: ≤${targets.latency}ms)\n`;
      } else {
        assessment += `❌ Latency: ${avgLatency.toFixed(2)}ms (target: ≤${targets.latency}ms)\n`;
      }
    }

    // Check memory growth targets
    const memoryResults = results.filter(r => r.memoryGrowthRate !== undefined);
    if (memoryResults.length > 0) {
      totalTargets++;
      const avgGrowthRate = memoryResults.reduce((sum, r) => sum + (r.memoryGrowthRate || 0), 0) / memoryResults.length;
      if (avgGrowthRate <= targets.memoryGrowth) {
        targetsMet++;
        assessment += `✅ Memory Growth: ${avgGrowthRate.toFixed(2)}MB/s (target: ≤${targets.memoryGrowth})\n`;
      } else {
        assessment += `❌ Memory Growth: ${avgGrowthRate.toFixed(2)}MB/s (target: ≤${targets.memoryGrowth})\n`;
      }
    }

    // Overall score
    if (totalTargets > 0) {
      const score = (targetsMet / totalTargets) * 100;
      assessment += `\n📈 Overall Performance Score: ${score.toFixed(0)}% (${targetsMet}/${totalTargets} targets met)\n`;
    }

    return assessment;
  }

  /**
   * Run specific benchmark suite
   */
  async runSuite(suiteName: string): Promise<any[]> {
    const suite = this.suites.find(s => s.name === suiteName);
    if (!suite) {
      throw new Error(`Benchmark suite not found: ${suiteName}`);
    }

    console.log(`🚀 Running ${suiteName} Benchmarks`);
    console.log(`   ${suite.description}`);

    const results = await suite.run();

    if (suite.cleanup) {
      await suite.cleanup();
    }

    return results;
  }

  /**
   * List available benchmark suites
   */
  listSuites(): void {
    console.log('📋 Available Benchmark Suites:');
    console.log('=' .repeat(40));

    this.suites.forEach((suite, index) => {
      console.log(`${index + 1}. ${suite.name}`);
      console.log(`   ${suite.description}`);
    });
  }
}