#!/usr/bin/env node
// Simple relative import - should work for both local and npx
import { runCLI } from './cli.js';

// Detect if we're running in TUI mode (no prompt argument)
const args = process.argv.slice(2);
const isTUIMode = args[0] === 'code' && args.length === 1;

if (isTUIMode) {
  // For TUI mode, suppress all error console output
  // Errors will be shown in the UI instead
  process.on('unhandledRejection', () => {
    // Silently ignore - TUI will show errors
  });
  process.on('uncaughtException', () => {
    // Silently ignore - TUI will show errors
  });
}

runCLI();
