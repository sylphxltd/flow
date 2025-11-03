import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { codeCommand } from './commands/code-command.js';
import { codebaseCommand } from './commands/codebase-command.js';
import { hookCommand } from './commands/hook-command.js';
import { initCommand } from './commands/init-command.js';
import { knowledgeCommand } from './commands/knowledge-command.js';
import { mcpCommand } from './commands/mcp-command.js';
import { runCommand } from './commands/run-command.js';

import { showDefaultHelp } from './utils/help.js';

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const VERSION = packageJson.version;

/**
 * Create the main CLI application with enhanced Commander.js configuration
 */
export function createCLI(): Command {
  const program = new Command();

  // Configure main program with better defaults
  program
    .name('sylphx-flow')
    .description('Sylphx Flow - Type-safe development flow CLI')
    .version(VERSION, '-V, --version', 'Show version number')
    .helpOption('-h, --help', 'Display help for command')
    .configureHelp({
      sortSubcommands: true,
      showGlobalOptions: true,
    });

  // Enable strict mode for better error handling
  program.configureOutput({
    writeErr: (str) => process.stderr.write(str),
    writeOut: (str) => process.stdout.write(str),
  });

  // Add all commands directly using Commander.js
  program.addCommand(initCommand);
  program.addCommand(mcpCommand);
  program.addCommand(runCommand);
  program.addCommand(codeCommand);
  program.addCommand(codebaseCommand);
  program.addCommand(knowledgeCommand);
  program.addCommand(hookCommand);

  // Default action when no command is provided
  program.action(() => {
    showDefaultHelp();
  });

  return program;
}

/**
 * Run the CLI application with enhanced error handling and process management
 */
export function runCLI(): void {
  const program = createCLI();

  // Set up global error handling before parsing
  setupGlobalErrorHandling();

  try {
    // Parse and execute commands
    program.parse(process.argv);
  } catch (error) {
    handleCommandError(error);
  }
}

/**
 * Set up global error handlers for uncaught exceptions and unhandled rejections
 */
function setupGlobalErrorHandling(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('✗ Uncaught Exception:');
    console.error(`  ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error('  Stack trace:', error.stack);
    }
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    // Ignore AbortError - this is expected when user cancels operations
    if (reason instanceof Error && reason.name === 'AbortError') {
      return;
    }

    // Only log unhandled rejections in development mode
    // Don't exit the process - let the application handle errors gracefully
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.error('✗ Unhandled Promise Rejection:');
      console.error(`  Reason: ${reason}`);
      console.error('  Promise:', promise);
    }
  });

  // Handle process termination gracefully
  process.on('SIGINT', () => {
    console.log('\nSylphx Flow CLI terminated by user');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nSylphx Flow CLI terminated');
    process.exit(0);
  });
}

/**
 * Handle command execution errors with proper formatting
 */
function handleCommandError(error: unknown): void {
  if (error instanceof Error) {
    // Handle Commander.js specific errors
    if (error.name === 'CommanderError') {
      const commanderError = error as any;

      // Don't exit for help or version commands - they should already be handled
      if (commanderError.code === 'commander.help' || commanderError.code === 'commander.version') {
        return;
      }

      // For other Commander.js errors, show the message and exit
      console.error(`✗ ${commanderError.message}`);
      process.exit(commanderError.exitCode || 1);
    }

    // Handle CLI errors with better formatting
    console.error(`✗ Error: ${error.message}`);

    // Show stack trace in development mode
    if (process.env.NODE_ENV === 'development' && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  } else {
    console.error(`✗ Unknown error: ${String(error)}`);
  }

  process.exit(1);
}
