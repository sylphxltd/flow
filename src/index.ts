#!/usr/bin/env node
// Simple relative import - should work for both local and npx
import { runCLI } from './cli.js';

// Detect if we're running in TUI mode (no prompt argument)
const args = process.argv.slice(2);
const isTUIMode = args[0] === 'code' && args.length === 1;

if (isTUIMode) {
  // For TUI mode, completely suppress ALL error output
  // Errors will be shown in the UI instead

  // Override console.error completely to block all error output
  // Save original for potential future use
  const originalConsoleError = console.error;
  console.error = () => {
    // Completely silent - all errors will be shown in TUI
  };

  // Override console.warn as well (some errors might use this)
  const originalConsoleWarn = console.warn;
  console.warn = () => {
    // Completely silent
  };

  // Suppress unhandled rejections (prevent default handler)
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', () => {
    // Silently ignore - TUI will show errors
  });

  // Suppress uncaught exceptions (prevent default handler)
  process.removeAllListeners('uncaughtException');
  process.on('uncaughtException', () => {
    // Silently ignore - TUI will show errors
  });

  // Intercept stderr to filter out error traces but allow TUI output
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = function (chunk: any, ...args: any[]): boolean {
    const str = chunk.toString();

    // Block error-like output (contains Error, stack traces, etc.)
    if (
      str.includes('Error') ||
      str.includes('  at ') ||
      str.includes('requestBodyValues') ||
      str.includes('statusCode') ||
      str.includes('cause:')
    ) {
      // Silently drop error output
      return true;
    }

    // Allow other stderr output (for TUI rendering)
    return originalStderrWrite(chunk, ...args);
  } as typeof process.stderr.write;
}

runCLI();
