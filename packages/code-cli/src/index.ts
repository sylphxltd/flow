#!/usr/bin/env bun
/**
 * Sylphx Code CLI - Headless AI Assistant
 * Headless mode for running prompts without TUI
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const VERSION = packageJson.version;

/**
 * Create the main CLI application
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name('sylphx-code')
    .description('Sylphx Code - Headless AI development assistant')
    .version(VERSION, '-V, --version', 'Show version number')
    .helpOption('-h, --help', 'Display help for command')
    .argument('[prompt]', 'Prompt to send to AI assistant')
    .option('-c, --continue', 'Continue last session')
    .option('-q, --quiet', 'Quiet mode - only output assistant response')
    .option('-v, --verbose', 'Show detailed output including tool calls')
    .action(async (prompt, options) => {
      if (!prompt || !prompt.trim()) {
        console.error(chalk.yellow('✗ No prompt provided'));
        console.error(chalk.dim('Usage: sylphx-code "your prompt here"'));
        console.error(chalk.dim('       sylphx-code --help'));
        process.exit(1);
      }

      const { runHeadless } = await import('./headless.js');
      await runHeadless(prompt, options);
    });

  return program;
}

/**
 * Run the CLI application
 */
export function runCLI(): void {
  const program = createCLI();

  // Set up global error handling
  setupGlobalErrorHandling();

  try {
    program.parse(process.argv);
  } catch (error) {
    handleCommandError(error);
  }
}

/**
 * Set up global error handlers
 */
function setupGlobalErrorHandling(): void {
  process.on('uncaughtException', (error) => {
    console.error(chalk.red('✗ Uncaught Exception:'));
    console.error(`  ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error('  Stack trace:', error.stack);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error && reason.name === 'AbortError') {
      return;
    }

    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.error(chalk.red('✗ Unhandled Promise Rejection:'));
      console.error(`  Reason: ${reason}`);
    }
  });

  process.on('SIGINT', () => {
    console.log('\nSylphx Code CLI terminated by user');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nSylphx Code CLI terminated');
    process.exit(0);
  });
}

/**
 * Handle command execution errors
 */
function handleCommandError(error: unknown): void {
  if (error instanceof Error) {
    console.error(chalk.red(`✗ Error: ${error.message}`));

    if (process.env.NODE_ENV === 'development' && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  } else {
    console.error(chalk.red(`✗ Unknown error: ${String(error)}`));
  }

  process.exit(1);
}

// Execute CLI when run as script
runCLI();
