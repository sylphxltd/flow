/**
 * Debug Logger
 * Conditional logging based on DEBUG environment variable
 *
 * Usage:
 *   DEBUG=* bun ./packages/code/src/index.ts              // All debug logs to stderr
 *   DEBUG=subscription,stream bun ...                      // Specific namespaces
 *   DEBUG=subscription:* bun ...                           // Namespace with wildcard
 *   DEBUG_FILE=debug.log DEBUG=* bun ...                   // Write to file instead
 *   (no DEBUG) bun ...                                     // No debug logs
 *
 * Examples:
 *   debugLog('subscription', 'Received event:', event.type);
 *   debugLog('stream', 'Processing delta:', text);
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DEBUG_ENV = process.env.DEBUG || '';
const DEBUG_FILE = process.env.DEBUG_FILE || ''; // Path to log file
const DEBUG_DIR = process.env.DEBUG_DIR || path.join(os.homedir(), '.sylphx-code', 'logs');

const enabledNamespaces = new Set(
  DEBUG_ENV.split(',').map(ns => ns.trim()).filter(Boolean)
);

// Log file stream (lazy initialized)
let logFileStream: fs.WriteStream | null = null;

// Initialize log file if DEBUG_FILE is set
function initLogFile() {
  if (!DEBUG_FILE || logFileStream) return;

  try {
    // Create directory if needed
    const logFilePath = path.isAbsolute(DEBUG_FILE)
      ? DEBUG_FILE
      : path.join(DEBUG_DIR, DEBUG_FILE);

    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Open file for appending
    logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    // Write session start marker
    const timestamp = new Date().toISOString();
    logFileStream.write(`\n========== DEBUG SESSION START: ${timestamp} ==========\n`);

    // Ensure file is flushed on exit
    process.on('exit', () => {
      if (logFileStream) {
        logFileStream.end();
      }
    });
  } catch (error) {
    console.error('[debug-logger] Failed to initialize log file:', error);
  }
}

// Check if namespace is enabled
function isEnabled(namespace: string): boolean {
  if (!DEBUG_ENV) return false;
  if (DEBUG_ENV === '*') return true;
  if (enabledNamespaces.has(namespace)) return true;

  // Check wildcard patterns (e.g., "subscription:*")
  for (const pattern of enabledNamespaces) {
    if (pattern.endsWith(':*') && namespace.startsWith(pattern.slice(0, -1))) {
      return true;
    }
  }

  return false;
}

/**
 * Format log message with timestamp
 */
function formatLogMessage(namespace: string, args: any[]): string {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  return `[${timestamp}] [${namespace}] ${message}\n`;
}

/**
 * Debug logger with namespace filtering
 */
export function debugLog(namespace: string, ...args: any[]) {
  if (!isEnabled(namespace)) return;

  // Initialize log file on first use
  if (DEBUG_FILE && !logFileStream) {
    initLogFile();
  }

  // Write to file if enabled
  if (logFileStream) {
    const message = formatLogMessage(namespace, args);
    logFileStream.write(message);
  } else {
    // Write to stderr (doesn't interfere with stdout/TUI)
    console.error(`[${namespace}]`, ...args);
  }
}

/**
 * Create a logger for a specific namespace
 *
 * Usage:
 *   const log = createLogger('subscription');
 *   log('Received event:', event.type);
 */
export function createLogger(namespace: string) {
  return (...args: any[]) => debugLog(namespace, ...args);
}

/**
 * Flush and close log file
 * Call this before exiting
 */
export function closeLogFile() {
  if (logFileStream) {
    logFileStream.end();
    logFileStream = null;
  }
}
