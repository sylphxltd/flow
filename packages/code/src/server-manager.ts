/**
 * Server Manager
 * Manages code-server daemon lifecycle
 */

import { spawn, ChildProcess } from 'child_process';
import { checkServer, waitForServer } from './trpc-client.js';
import chalk from 'chalk';

/**
 * Check if code-server binary is available
 */
function isServerAvailable(): boolean {
  try {
    // Use Bun.which to check if binary exists in PATH
    const result = Bun.which('sylphx-code-server');
    return !!result;
  } catch {
    return false;
  }
}

/**
 * Ensure server is running
 * Spawns detached daemon if needed
 *
 * @returns true if server is running/started
 */
export async function ensureServer(options: {
  autoStart?: boolean;
  timeout?: number;
  quiet?: boolean;
} = {}): Promise<boolean> {
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

  // 3. Check if server binary available
  if (!isServerAvailable()) {
    console.error(chalk.red('✗ code-server not found'));
    console.error(chalk.yellow('\nPlease install @sylphx/code-server:'));
    console.error(chalk.dim('  $ bun add -g @sylphx/code-server'));
    console.error(chalk.dim('\nOr ensure it\'s in your PATH'));
    return false;
  }

  // 4. Spawn detached daemon
  if (!quiet) {
    console.error(chalk.dim('Starting code-server daemon...'));
  }

  try {
    const serverProcess = spawn('sylphx-code-server', [], {
      detached: true,      // Run independently
      stdio: 'ignore',     // Don't pipe stdio
      shell: false,        // Direct execution
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
