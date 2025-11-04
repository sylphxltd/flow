/**
 * Web Launcher
 * Launches Web GUI mode
 */

import chalk from 'chalk';
import { ensureServer } from './server-manager.js';

/**
 * Launch Web GUI mode
 * Ensures server is running and opens browser
 */
export async function launchWeb(): Promise<void> {
  console.error(chalk.cyan('Launching Web GUI...'));

  // 1. Ensure server is running
  const ready = await ensureServer({ timeout: 10000 });

  if (!ready) {
    console.error(chalk.red('\n✗ Failed to start server'));
    console.error(chalk.yellow('\nTroubleshooting:'));
    console.error(chalk.dim('  1. Check server is installed: code --status'));
    console.error(chalk.dim('  2. Start manually: sylphx-code-server'));
    console.error(chalk.dim('  3. Check logs for errors'));
    process.exit(1);
  }

  // 2. Open browser
  const url = process.env.CODE_SERVER_URL || 'http://localhost:3000';
  console.error(chalk.cyan(`\nOpening browser: ${url}`));

  try {
    // Use dynamic import for 'open' package
    const open = (await import('open')).default;
    await open(url);

    console.error(chalk.green('\n✓ Browser opened'));
    console.error(chalk.dim('\nServer is running in background'));
    console.error(chalk.dim('Press Ctrl+C to exit (server will keep running)'));

    // Keep process alive (optional)
    // User can Ctrl+C to exit, server continues as daemon
    process.stdin.resume();
  } catch (error) {
    console.error(chalk.yellow('\n⚠ Failed to open browser'));
    console.error(chalk.cyan(`\nPlease open manually: ${url}`));
    process.exit(1);
  }
}
