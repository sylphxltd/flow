/**
 * Loop Controller - Autonomous execution with intelligent exit conditions
 *
 * Enables continuous/periodic task execution with:
 * - Configurable intervals
 * - Multiple exit conditions
 * - Error handling strategies
 * - Progress tracking
 * - Graceful shutdown
 */

import chalk from 'chalk';
import type { FlowOptions } from '../commands/flow-command.js';

export interface LoopOptions {
  enabled: boolean;
  interval: number;          // Seconds between runs
  maxRuns?: number;          // Max iterations (default: 100)
  untilSuccess?: boolean;    // Exit when task succeeds
  untilStable?: boolean;     // Exit when output unchanged
  onError?: ErrorStrategy;   // Error handling strategy
}

export type ErrorStrategy = 'continue' | 'stop' | 'retry';

export interface LoopResult {
  exitCode: number;
  output?: string;
  error?: Error;
}

export interface LoopState {
  iteration: number;
  startTime: Date;
  lastOutput: string | null;
  consecutiveErrors: number;
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
      lastOutput: null,
      consecutiveErrors: 0,
      successCount: 0,
      errorCount: 0,
    };

    // Handle graceful shutdown
    this.setupSignalHandlers();
  }

  /**
   * Execute task in loop mode
   */
  async run(
    executor: () => Promise<LoopResult>,
    options: LoopOptions
  ): Promise<void> {
    console.log(chalk.cyan.bold('\n━━━ 🔄 Loop Mode Activated\n'));
    console.log(chalk.dim(`  Interval: ${options.interval}s`));
    console.log(chalk.dim(`  Max runs: ${options.maxRuns || '∞'}`));
    if (options.untilSuccess) console.log(chalk.dim('  Exit: Until success'));
    if (options.untilStable) console.log(chalk.dim('  Exit: Until stable'));
    console.log(chalk.dim(`  On error: ${options.onError || 'continue'}\n`));

    while (this.shouldContinue(options)) {
      this.state.iteration++;

      try {
        await this.executeIteration(executor, options);
      } catch (error) {
        await this.handleError(error as Error, options);
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

    // Update state
    if (result.error || result.exitCode !== 0) {
      this.state.consecutiveErrors++;
      this.state.errorCount++;
    } else {
      this.state.consecutiveErrors = 0;
      this.state.successCount++;
    }

    // Check exit conditions
    if (options.untilSuccess && result.exitCode === 0) {
      console.log(chalk.green('\n✓ Success condition met - stopping loop\n'));
      this.shouldStop = true;
      return;
    }

    if (options.untilStable && this.isStable(result.output)) {
      console.log(chalk.green('\n✓ Stable state reached - stopping loop\n'));
      this.shouldStop = true;
      return;
    }

    // Save output for stability check
    if (result.output) {
      this.state.lastOutput = result.output;
    }

    // Check error threshold
    if (this.state.consecutiveErrors >= 5) {
      console.log(
        chalk.red('\n❌ Too many consecutive errors (5) - stopping loop\n')
      );
      this.shouldStop = true;
    }
  }

  /**
   * Handle execution error
   */
  private async handleError(
    error: Error,
    options: LoopOptions
  ): Promise<void> {
    const strategy = options.onError || 'continue';

    switch (strategy) {
      case 'stop':
        console.error(chalk.red('\n❌ Error occurred - stopping loop'));
        console.error(chalk.red(`Error: ${error.message}\n`));
        this.shouldStop = true;
        throw error;

      case 'retry':
        console.log(chalk.yellow('\n⚠️  Error occurred - retrying immediately'));
        console.error(chalk.dim(`Error: ${error.message}\n`));
        // Don't increment iteration for retry
        this.state.iteration--;
        break;

      case 'continue':
      default:
        console.error(
          chalk.yellow('\n⚠️  Error occurred - continuing to next iteration')
        );
        console.error(chalk.dim(`Error: ${error.message}\n`));
        break;
    }
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
   */
  private shouldContinue(options: LoopOptions): boolean {
    if (this.shouldStop) return false;
    if (options.maxRuns && this.state.iteration >= options.maxRuns) return false;
    return true;
  }

  /**
   * Check if output is stable (unchanged from last run)
   */
  private isStable(currentOutput?: string): boolean {
    if (!this.state.lastOutput || !currentOutput) return false;

    // Simple string comparison (can be enhanced with diff)
    return this.state.lastOutput.trim() === currentOutput.trim();
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
