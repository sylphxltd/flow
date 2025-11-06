#!/usr/bin/env bun
/**
 * Test Harness for Non-Interactive Testing
 *
 * 呢個 script 用嚟做自動化測試，唔需要 interactive TUI
 * 所有 output 會去 log file，你可以 programmatically 檢查結果
 *
 * Usage:
 *   bun ./packages/code/src/test-harness.ts "test message"
 *   bun ./packages/code/src/test-harness.ts --input test-input.txt
 *
 * Environment Variables:
 *   DEBUG=* - Enable debug logging
 *   DEBUG_FILE=test.log - Write logs to file (default: ~/.sylphx-code/logs/test-{timestamp}.log)
 *   TEST_TIMEOUT=30000 - Timeout in ms (default: 30000)
 */

import { getTRPCClient } from '@sylphx/code-client';
import { createLogger } from '@sylphx/code-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const log = createLogger('test-harness');

interface TestResult {
  success: boolean;
  sessionId: string | null;
  events: string[];
  errors: string[];
  duration: number;
  output: string;
}

/**
 * Run a test with the given message
 */
async function runTest(message: string, timeout: number = 30000): Promise<TestResult> {
  const startTime = Date.now();
  const events: string[] = [];
  const errors: string[] = [];
  let sessionId: string | null = null;
  let output = '';

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeout}ms`));
    }, timeout);

    try {
      log('Starting test with message:', message);

      // Get tRPC client
      const client = getTRPCClient();

      // Subscribe to streaming response
      const subscription = client.message.streamResponse.subscribe({
        sessionId: null,
        provider: 'openrouter',
        model: 'x-ai/grok-code-fast-1',
        userMessage: message,
      }, {
        onData: (event: any) => {
          events.push(event.type);
          log('Event:', event.type);

          switch (event.type) {
            case 'session-created':
              sessionId = event.sessionId;
              log('Session created:', sessionId);
              break;

            case 'text-delta':
              output += event.text;
              break;

            case 'error':
              errors.push(event.error);
              log('Error:', event.error);
              break;

            case 'complete':
              clearTimeout(timeoutId);
              const duration = Date.now() - startTime;
              log('Test completed in', duration, 'ms');

              resolve({
                success: errors.length === 0,
                sessionId,
                events,
                errors,
                duration,
                output,
              });
              break;
          }
        },
        onError: (error: any) => {
          clearTimeout(timeoutId);
          errors.push(error.message || String(error));
          log('Subscription error:', error);

          resolve({
            success: false,
            sessionId,
            events,
            errors,
            duration: Date.now() - startTime,
            output,
          });
        },
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Write test result to file
 */
function writeTestResult(result: TestResult, outputFile: string) {
  const report = {
    timestamp: new Date().toISOString(),
    ...result,
  };

  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  console.log(`✓ Test result written to: ${outputFile}`);
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: bun test-harness.ts "message" [--output result.json]');
    process.exit(1);
  }

  // Parse arguments
  let message = args[0];
  let outputFile = '';

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && i + 1 < args.length) {
      outputFile = args[i + 1];
      i++;
    } else if (args[i] === '--input' && i + 1 < args.length) {
      message = fs.readFileSync(args[i + 1], 'utf-8').trim();
      i++;
    }
  }

  // Set default output file
  if (!outputFile) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logsDir = path.join(os.homedir(), '.sylphx-code', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    outputFile = path.join(logsDir, `test-result-${timestamp}.json`);
  }

  // Set default debug file if not set
  if (process.env.DEBUG && !process.env.DEBUG_FILE) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logsDir = path.join(os.homedir(), '.sylphx-code', 'logs');
    process.env.DEBUG_FILE = path.join(logsDir, `test-debug-${timestamp}.log`);
    console.log(`Debug logs will be written to: ${process.env.DEBUG_FILE}`);
  }

  const timeout = parseInt(process.env.TEST_TIMEOUT || '30000', 10);

  console.log('Running test...');
  console.log('Message:', message);
  console.log('Timeout:', timeout, 'ms');
  console.log('');

  try {
    const result = await runTest(message, timeout);

    // Print summary
    console.log('');
    console.log('========== TEST RESULT ==========');
    console.log('Success:', result.success);
    console.log('Session ID:', result.sessionId);
    console.log('Duration:', result.duration, 'ms');
    console.log('Events:', result.events.length);
    console.log('Errors:', result.errors.length);
    console.log('Output length:', result.output.length, 'chars');
    console.log('=================================');

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    // Write result to file
    writeTestResult(result, outputFile);

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error: any) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runTest };
