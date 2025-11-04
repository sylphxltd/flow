/**
 * Auto-start code-server if not running
 */

import { spawn } from 'node:child_process';
import { checkServer, waitForServer } from './trpc-client.js';

/**
 * Ensure code-server is running
 * If not, start it in background
 *
 * @returns true if server is ready, false if failed to start
 */
export async function ensureServerRunning(): Promise<boolean> {
  // Check if already running
  if (await checkServer()) {
    return true;
  }

  console.error('⚠️  code-server is not running');
  console.error('   Starting server in background...\n');

  // Try to start server
  try {
    // Spawn server process in background
    const serverProcess = spawn('bun', ['run', 'sylphx-code-server'], {
      detached: true,
      stdio: 'ignore',
    });

    serverProcess.unref(); // Allow parent to exit independently

    // Wait for server to be ready
    const ready = await waitForServer(10000);

    if (ready) {
      console.error('✅ code-server started successfully\n');
      return true;
    } else {
      console.error('❌ Failed to start code-server (timeout)\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to start code-server:', error);
    console.error('\n   Please start server manually:');
    console.error('   $ bun run sylphx-code-server\n');
    return false;
  }
}
