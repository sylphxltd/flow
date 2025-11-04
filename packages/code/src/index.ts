#!/usr/bin/env bun
/**
 * Sylphx Code - Unified CLI Tool
 *
 * Architecture:
 * - Auto-manages code-server daemon
 * - Connects via HTTP/SSE tRPC
 * - Shares data with code-web in real-time
 *
 * Modes:
 * - TUI: code
 * - headless: code "prompt"
 * - Web: code --web
 * - Server: code --server
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { ensureServer, getServerStatus } from './server-manager.js';
import { launchWeb } from './web-launcher.js';

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const VERSION = packageJson.version;

/**
 * Main CLI entry point
 */
async function main() {
  const program = new Command();

  program
    .name('sylphx-code')
    .description('Sylphx Code - AI development assistant')
    .version(VERSION, '-V, --version', 'Show version number')
    .helpOption('-h, --help', 'Display help for command')
    .argument('[prompt]', 'Prompt to send to AI (headless mode)')
    .option('-p, --print', 'Print mode (headless)')
    .option('-c, --continue', 'Continue last session')
    .option('--web', 'Launch Web GUI in browser')
    .option('--server', 'Start server only (daemon mode)')
    .option('--no-auto-server', 'Don\'t auto-start server')
    .option('--status', 'Check server status')
    .option('-q, --quiet', 'Quiet mode')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (prompt, options) => {
      // Status check
      if (options.status) {
        const status = await getServerStatus();
        console.log('Server status:');
        console.log(`  Running: ${status.running ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  Available: ${status.available ? chalk.green('✓') : chalk.red('✗')}`);
        process.exit(status.running ? 0 : 1);
      }

      // Server-only mode
      if (options.server) {
        console.log(chalk.cyan('Starting code-server daemon...'));
        console.log(chalk.dim('Use Ctrl+C to stop'));

        // Execute server binary and wait
        const serverProcess = spawn('sylphx-code-server', [], {
          stdio: 'inherit',
        });

        await new Promise((resolve) => {
          serverProcess.on('exit', resolve);
        });
        return;
      }

      // Web mode
      if (options.web) {
        await launchWeb();
        return;
      }

      // CLI mode (TUI or headless)
      // Ensure server is running (unless --no-auto-server)
      const ready = await ensureServer({
        autoStart: options.autoServer !== false,
        quiet: options.quiet
      });

      if (!ready) {
        console.error(chalk.red('\n✗ Server not available'));
        console.error(chalk.yellow('\nOptions:'));
        console.error(chalk.dim('  1. Install server: bun add -g @sylphx/code-server'));
        console.error(chalk.dim('  2. Start manually: sylphx-code-server'));
        console.error(chalk.dim('  3. Check status: code --status'));
        process.exit(1);
      }

      // Setup HTTP tRPC client
      const { createClient } = await import('./trpc-client.js');
      const { setTRPCClient } = await import('@sylphx/code-client');

      const client = createClient();
      setTRPCClient(client);

      // Headless mode: if prompt provided OR --print flag
      if (prompt || options.print) {
        if (!prompt) {
          console.error(chalk.red('Error: No prompt provided'));
          console.error(chalk.dim('Usage: sylphx-code "your prompt here"'));
          console.error(chalk.dim('   or: sylphx-code --print "your prompt"'));
          process.exit(1);
        }

        const { runHeadless } = await import('./headless.js');
        await runHeadless(prompt, options);
        return;
      }

      // TUI mode (default)
      const React = await import('react');
      const { render } = await import('ink');
      const { default: App } = await import('./App.js');

      render(React.createElement(App));
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
