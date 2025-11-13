#!/usr/bin/env bun
/**
 * Sylphx Flow - Legacy CLI
 * Project initialization and development flow management
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { codebaseCommand } from './commands/codebase-command.js';
import { hookCommand } from './commands/hook-command.js';
import { knowledgeCommand } from './commands/knowledge-command.js';
import {
  flowCommand,
  statusCommand,
  setupCommand,
  doctorCommand,
  upgradeCommand,
  executeFlow,
} from './commands/flow-command.js';

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

  // Default action: delegate to flow command for convenience
  // This allows `sylphx-flow "prompt"` instead of requiring `sylphx-flow flow "prompt"`
  program
    .argument('[prompt]', 'Prompt to execute with agent (optional, supports @file.txt for file input)')
    .option('--init-only', 'Only initialize, do not run')
    .option('--run-only', 'Only run, skip initialization')
    .option('--clean', 'Clean all configurations and reinitialize')
    .option('--upgrade', 'Upgrade Sylphx Flow to latest version')
    .option('--upgrade-target', 'Upgrade target platform (Claude Code/OpenCode)')
    .option('--quick', 'Quick mode: use saved defaults and skip all prompts')
    .option('--select-provider', 'Prompt to select provider each run')
    .option('--select-agent', 'Prompt to select agent each run')
    .option('--use-defaults', 'Skip prompts, use saved defaults')
    .option('--provider <provider>', 'Override provider for this run (anthropic|z.ai|kimi)')
    .option('--target <type>', 'Target platform (opencode, claude-code, auto-detect)')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--no-mcp', 'Skip MCP installation')
    .option('--no-agents', 'Skip agents installation')
    .option('--no-rules', 'Skip rules installation')
    .option('--no-output-styles', 'Skip output styles installation')
    .option('--no-slash-commands', 'Skip slash commands installation')
    .option('--no-hooks', 'Skip hooks setup')
    .option('--agent <name>', 'Agent to use (default: coder)', 'coder')
    .option('--agent-file <path>', 'Load agent from specific file')
    .option('-p, --print', 'Headless print mode (output only, no interactive)')
    .option('-c, --continue', 'Continue previous conversation (requires print mode)')

    // Loop mode options
    .option('--loop [seconds]', 'Loop mode: wait N seconds between runs (default: 0 = immediate)', (value) => {
      // If no value provided, default to 0 (no wait time)
      return value ? parseInt(value) : 0;
    })
    .option('--max-runs <count>', 'Maximum iterations before stopping (default: infinite)', parseInt)

    .action(async (prompt, options) => {
      await executeFlow(prompt, options);
    });

  // Add subcommands - these can still be used explicitly
  program.addCommand(flowCommand);
  program.addCommand(setupCommand);
  program.addCommand(statusCommand);
  program.addCommand(doctorCommand);
  program.addCommand(upgradeCommand);
  program.addCommand(codebaseCommand);
  program.addCommand(knowledgeCommand);
  program.addCommand(hookCommand);

  return program;
}

/**
 * Run the CLI application with enhanced error handling and process management
 */
export async function runCLI(): Promise<void> {
  const program = createCLI();

  // Set up global error handling before parsing
  setupGlobalErrorHandling();

  try {
    // Parse and execute commands - use parseAsync for async actions
    await program.parseAsync(process.argv);
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

  // Ensure clean exit by allowing the event loop to drain
  process.on('beforeExit', () => {
    // Node.js will exit automatically after this handler completes
    // No explicit process.exit() needed
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

// Execute CLI when run as script
(async () => {
  try {
    await runCLI();
  } catch (error) {
    handleCommandError(error);
  }
})();
