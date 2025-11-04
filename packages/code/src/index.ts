#!/usr/bin/env bun
/**
 * Sylphx Code - Unified CLI Tool
 * Connects to code-server for multi-client data sharing
 *
 * Architecture:
 * - Requires code-server to be running
 * - Connects via HTTP/SSE tRPC
 * - Shares data with code-web in real-time
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { checkServer, waitForServer } from './trpc-client.js';

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const VERSION = packageJson.version;

/**
 * Ensure code-server is running
 */
async function ensureServer(): Promise<boolean> {
  // Check if server is already running
  if (await checkServer()) {
    return true;
  }

  console.error(chalk.yellow('\n⚠️  code-server is not running'));
  console.error(chalk.dim('   This tool requires code-server to be running first.\n'));
  console.error(chalk.cyan('   Start the server in a separate terminal:'));
  console.error(chalk.dim('   $ sylphx-code-server\n'));
  console.error(chalk.dim('   Or install globally:'));
  console.error(chalk.dim('   $ bun add -g @sylphx/code-server\n'));

  return false;
}

/**
 * Main CLI entry point
 */
async function main() {
  // Check server connection first
  if (!await ensureServer()) {
    process.exit(1);
  }
  const program = new Command();

  program
    .name('sylphx-code')
    .description('Sylphx Code - AI development assistant')
    .version(VERSION, '-V, --version', 'Show version number')
    .helpOption('-h, --help', 'Display help for command');

  // Headless mode command
  program
    .command('headless [prompt]')
    .description('Run in headless mode (non-interactive)')
    .option('-c, --continue', 'Continue last session')
    .option('-q, --quiet', 'Quiet mode - only output assistant response')
    .option('-v, --verbose', 'Show detailed output including tool calls')
    .action(async (prompt, options) => {
      if (!prompt || !prompt.trim()) {
        console.error('Error: No prompt provided');
        console.error('Usage: sylphx-code headless "your prompt here"');
        process.exit(1);
      }

      // Setup HTTP tRPC client before running headless
      const { createClient } = await import('./trpc-client.js');
      const { setTRPCClient } = await import('@sylphx/code-client');

      const client = createClient();
      setTRPCClient(client);

      const { runHeadless } = await import('./headless.js');
      await runHeadless(prompt, options);
    });

  // Default action: Launch TUI
  program.action(async () => {
    // If no command specified, launch TUI
    if (process.argv.length === 2 || process.argv[2] === '--help' || process.argv[2] === '-h') {
      // Show help or launch TUI
      if (process.argv[2] === '--help' || process.argv[2] === '-h') {
        program.outputHelp();
        return;
      }
    }

    // Check if a subcommand was invoked
    const hasSubcommand = process.argv.some(arg =>
      ['headless', 'help', '--help', '-h', '--version', '-V'].includes(arg)
    );

    if (!hasSubcommand) {
      // Launch TUI
      // Setup HTTP tRPC client before launching TUI
      const { createClient } = await import('./trpc-client.js');
      const { setTRPCClient } = await import('@sylphx/code-client');

      const client = createClient();
      setTRPCClient(client);

      const React = await import('react');
      const { render } = await import('ink');
      const { default: App } = await import('./App.js');

      render(React.createElement(App));
      return;
    }
  });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
