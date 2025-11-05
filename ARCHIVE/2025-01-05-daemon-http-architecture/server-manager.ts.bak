/**
 * Server Manager
 * Manages code-server daemon lifecycle
 */

import chalk from 'chalk';
import { ChildProcess, spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { checkServer, waitForServer } from './trpc-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get server command and args
 * Supports both development mode (monorepo) and production (global install)
 */
function getServerCommand(): { command: string; args: string[] } | null {
  // 1. Check for development mode (monorepo)
  const devServerPath = join(__dirname, '../../code-server/src/cli.ts');
  if (existsSync(devServerPath)) {
    return {
      command: 'bun',
      args: [devServerPath],
    };
  }

  // 2. Check for global install
  const globalCommand = Bun.which('sylphx-code-server');
  if (globalCommand) {
    return {
      command: 'sylphx-code-server',
      args: [],
    };
  }

  return null;
}

/**
 * Check if code-server is available (dev mode or global install)
 */
function isServerAvailable(): boolean {
  return getServerCommand() !== null;
}

/**
 * Ensure server is running
 * Spawns detached daemon if needed
 *
 * @returns true if server is running/started
 */
export async function ensureServer(
  options: { autoStart?: boolean; timeout?: number; quiet?: boolean } = {}
): Promise<boolean> {
  const { autoStart = true, timeout = 5000, quiet = false } = options;

  // 1. Check if server already running
  if (await checkServer()) {
    if (!quiet && process.env.DEBUG) {
      console.error(chalk.dim('✓ Server already running'));
    }
    return true;
  }

  // 2. If not auto-starting, return false
  if (!autoStart) {
    return false;
  }

  // 3. Check if server is available (dev mode or global)
  const serverCommand = getServerCommand();
  if (!serverCommand) {
    console.error(chalk.red('✗ code-server not found'));
    console.error(chalk.yellow('\nPlease install @sylphx/code-server:'));
    console.error(chalk.dim('  $ bun add -g @sylphx/code-server'));
    console.error(chalk.dim('\nOr run from monorepo root directory'));
    return false;
  }

  // 4. Spawn detached daemon
  if (!quiet) {
    const mode = serverCommand.command === 'bun' ? '(dev mode)' : '(global)';
    console.error(chalk.dim(`Starting code-server daemon... ${mode}`));
  }

  try {
    const serverProcess = spawn(serverCommand.command, serverCommand.args, {
      detached: true, // Run independently
      stdio: 'ignore', // Don't pipe stdio
      shell: false, // Direct execution
    });

    // Unref to allow parent to exit
    serverProcess.unref();

    // 5. Wait for server to be ready
    const ready = await waitForServer(timeout);

    if (ready) {
      if (!quiet) {
        console.error(chalk.green('✓ Server ready'));
      }
      return true;
    } else {
      console.error(chalk.red('✗ Server failed to start'));
      console.error(chalk.dim('\nCheck server logs for details'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('✗ Failed to spawn server'));
    console.error(error);
    return false;
  }
}

/**
 * Check server status (without starting)
 */
export async function getServerStatus(): Promise<{
  running: boolean;
  available: boolean;
}> {
  return {
    running: await checkServer(),
    available: isServerAvailable(),
  };
}
