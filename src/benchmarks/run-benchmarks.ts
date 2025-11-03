#!/usr/bin/env node

/**
 * Benchmark CLI Tool
 * Command-line interface for running performance benchmarks
 */

import { BenchmarkRunner } from './benchmark-runner.js';

interface CLIOptions {
  suite?: string;
  output?: string;
  help?: boolean;
  list?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--suite':
      case '-s':
        options.suite = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--list':
      case '-l':
        options.list = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🚀 Performance Benchmark Tool

USAGE:
  run-benchmarks [OPTIONS]

OPTIONS:
  -s, --suite <name>     Run specific benchmark suite
  -o, --output <dir>     Output directory for results (default: ./benchmark-results)
  -l, --list             List available benchmark suites
  -h, --help             Show this help message

AVAILABLE SUITES:
  • Storage System       - Tests storage throughput, latency, and scalability
  • Configuration System - Tests config loading, validation, and hot-reload
  • Command System       - Tests command registration, lookup, and execution
  • Result Types         - Tests functional error handling performance
  • Memory Management    - Tests memory usage, GC, and resource management

EXAMPLES:
  run-benchmarks                           # Run all benchmarks
  run-benchmarks --suite "Storage System" # Run storage benchmarks only
  run-benchmarks --output ./reports        # Save results to ./reports
  run-benchmarks --list                    # List available suites
`);
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  const runner = new BenchmarkRunner(options.output);

  if (options.list) {
    runner.listSuites();
    return;
  }

  try {
    if (options.suite) {
      // Run specific suite
      console.log(`🎯 Running benchmark suite: ${options.suite}`);
      const results = await runner.runSuite(options.suite);
      console.log(`✅ ${options.suite} completed!`);
    } else {
      // Run all benchmarks
      console.log('🚀 Starting comprehensive performance benchmark suite...');
      const report = await runner.runAllBenchmarks();
      console.log('\n🎉 All benchmarks completed successfully!');
      console.log(`📊 Check the results in the output directory for detailed analysis.`);
    }
  } catch (error) {
    console.error('❌ Benchmark execution failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runBenchmarks };