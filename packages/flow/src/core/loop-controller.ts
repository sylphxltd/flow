/**
 * Loop Controller - Simple continuous execution
 *
 * Core concept: Keep executing the same task with context persistence
 * - First run: Fresh start
 * - Subsequent runs: Auto-continue (builds on previous work)
 * - Stop: Manual (Ctrl+C) or max-runs limit
 *
 * Use case: "Keep working on X until I stop you"
 */

import chalk from 'chalk';
import type { FlowOptions } from '../commands/flow-command.js';

export interface LoopOptions {
  enabled: boolean;
  interval: number;          // Seconds between runs
  maxRuns?: number;          // Optional safety limit (default: infinite)
}

export interface LoopResult {
  exitCode: number;
  error?: Error;
}

export interface LoopState {
  iteration: number;
  startTime: Date;
  successCount: number;
  errorCount: number;
}

/**
 * Controller for loop execution mode
 */
export class LoopController {
  private state: LoopState;
  private shouldStop: boolean = false;

  constructor() {
    this.state = {
      iteration: 0,
      startTime: new Date(),
      successCount: 0,
      errorCount: 0,
    };

    // Handle graceful shutdown
    this.setupSignalHandlers();
  }

  /**
   * Execute task in loop mode
   * Simple: Keep running same task until manual stop or max-runs
   */
  async run(
    executor: () => Promise<LoopResult>,
    options: LoopOptions
  ): Promise<void> {
    console.log(chalk.cyan.bold('\n━━━ 🔄 Loop Mode Activated\n'));
    console.log(chalk.dim(`  Interval: ${options.interval}s`));
    console.log(chalk.dim(`  Max runs: ${options.maxRuns || '∞'}`));
    console.log(chalk.dim(`  Stop: Ctrl+C or max-runs limit\n`));

    while (this.shouldContinue(options)) {
      this.state.iteration++;

      try {
        await this.executeIteration(executor, options);
      } catch (error) {
        this.handleError(error as Error);
      }

      // Wait for next iteration
      if (this.shouldContinue(options)) {
        await this.waitForNextRun(options);
      }
    }

    this.printSummary();
  }

  /**
   * Execute single iteration
   * Simple: Run task, track success/error, continue
   */
  private async executeIteration(
    executor: () => Promise<LoopResult>,
    options: LoopOptions
  ): Promise<void> {
    const maxDisplay = options.maxRuns || '∞';
    console.log(
      chalk.cyan(
        `\n🔄 Loop iteration ${this.state.iteration}/${maxDisplay}`
      )
    );
    console.log(chalk.dim(`Started: ${new Date().toLocaleTimeString()}\n`));

    const result = await executor();

    // Update state (just count success/error)
    if (result.error || result.exitCode !== 0) {
      this.state.errorCount++;
      console.log(chalk.yellow(`\n⚠️  Task encountered error (continuing...)`));
    } else {
      this.state.successCount++;
    }
  }

  /**
   * Handle execution error
   * Simple: Log and continue (resilient)
   */
  private handleError(error: Error): void {
    this.state.errorCount++;
    console.error(chalk.yellow('\n⚠️  Error occurred - continuing to next iteration'));
    console.error(chalk.dim(`Error: ${error.message}\n`));
  }

  /**
   * Wait for next iteration
   */
  private async waitForNextRun(options: LoopOptions): Promise<void> {
    const maxDisplay = options.maxRuns || '∞';
    const progress = `${this.state.iteration}/${maxDisplay}`;

    console.log(
      chalk.dim(
        `\n⏳ Waiting ${options.interval}s until next run... (completed: ${progress})`
      )
    );

    // Countdown display (optional, can be removed if too verbose)
    const startTime = Date.now();
    const endTime = startTime + options.interval * 1000;

    while (Date.now() < endTime && !this.shouldStop) {
      await this.sleep(1000);

      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      if (remaining > 0 && remaining % 10 === 0) {
        process.stdout.write(chalk.dim(`\r⏳ ${remaining}s remaining...`));
      }
    }

    if (!this.shouldStop) {
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear line
    }
  }

  /**
   * Check if should continue looping
   * Simple: Stop only on manual interrupt or max-runs
   */
  private shouldContinue(options: LoopOptions): boolean {
    if (this.shouldStop) return false;
    if (options.maxRuns && this.state.iteration >= options.maxRuns) return false;
    return true;
  }

  /**
   * Print execution summary
   */
  private printSummary(): void {
    const duration = Date.now() - this.state.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    console.log(chalk.cyan.bold('\n━━━ 🏁 Loop Summary\n'));
    console.log(`  Total iterations: ${this.state.iteration}`);
    console.log(
      `  Successful: ${chalk.green(this.state.successCount.toString())}`
    );
    console.log(`  Errors: ${chalk.red(this.state.errorCount.toString())}`);
    console.log(`  Duration: ${minutes}m ${seconds}s`);
    console.log();
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const handler = () => {
      console.log(
        chalk.yellow('\n\n⚠️  Interrupt received - finishing current iteration...')
      );
      this.shouldStop = true;
    };

    process.on('SIGINT', handler);
    process.on('SIGTERM', handler);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
