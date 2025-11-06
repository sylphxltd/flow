/**
 * Streaming Integration Tests
 * Tests the complete streaming flow: tRPC subscription → events → UI updates
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createInProcessClient } from '@sylphx/code-client';
import type { AppContext } from '@sylphx/code-server';
import { createAppContext } from '@sylphx/code-server';

describe('Streaming Integration', () => {
  let appContext: AppContext;
  let cleanup: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    // Create app context (database, services, etc.)
    const result = await createAppContext();
    appContext = result.context;
    cleanup = result.cleanup;
  });

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  it('should stream a complete AI response', async () => {
    // Create tRPC client
    const client = createInProcessClient({
      appContext,
    });

    // Track events
    const events: string[] = [];
    let sessionId: string | null = null;
    let output = '';
    const errors: string[] = [];

    // Subscribe to stream
    const result = await new Promise<{
      success: boolean;
      sessionId: string | null;
      events: string[];
      output: string;
      errors: string[];
    }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Test timeout after 30s'));
      }, 30000);

      client.message.streamResponse.subscribe(
        {
          sessionId: null,
          provider: 'openrouter',
          model: 'x-ai/grok-code-fast-1',
          userMessage: 'say hello',
        },
        {
          onData: (event: any) => {
            events.push(event.type);

            switch (event.type) {
              case 'session-created':
                sessionId = event.sessionId;
                break;
              case 'text-delta':
                output += event.text;
                break;
              case 'error':
                errors.push(event.error);
                break;
              case 'complete':
                clearTimeout(timeout);
                resolve({
                  success: errors.length === 0,
                  sessionId,
                  events,
                  output,
                  errors,
                });
                break;
            }
          },
          onError: (error: any) => {
            clearTimeout(timeout);
            errors.push(error.message || String(error));
            resolve({
              success: false,
              sessionId,
              events,
              output,
              errors,
            });
          },
        }
      );
    });

    // Assertions
    expect(result.success).toBe(true);
    expect(result.sessionId).toBeTruthy();
    expect(result.sessionId).toMatch(/^session-\d+$/);

    // Check event sequence
    expect(result.events).toContain('session-created');
    expect(result.events).toContain('assistant-message-created');
    expect(result.events).toContain('text-start');
    expect(result.events).toContain('text-end');
    expect(result.events).toContain('complete');

    // Check output
    expect(result.output).toBeTruthy();
    expect(result.output.length).toBeGreaterThan(0);

    // No errors
    expect(result.errors).toEqual([]);
  }, 60000); // 60s timeout for this test

  it('should handle errors gracefully', async () => {
    const client = createInProcessClient({ appContext });

    const events: string[] = [];
    const errors: string[] = [];

    const result = await new Promise<{
      success: boolean;
      events: string[];
      errors: string[];
    }>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          events,
          errors: ['Timeout'],
        });
      }, 10000);

      client.message.streamResponse.subscribe(
        {
          sessionId: null,
          provider: 'invalid-provider' as any,
          model: 'invalid-model',
          userMessage: 'test',
        },
        {
          onData: (event: any) => {
            events.push(event.type);
            if (event.type === 'error') {
              errors.push(event.error);
            }
            if (event.type === 'complete' || event.type === 'error') {
              clearTimeout(timeout);
              resolve({
                success: false,
                events,
                errors,
              });
            }
          },
          onError: (error: any) => {
            clearTimeout(timeout);
            errors.push(error.message || String(error));
            resolve({
              success: false,
              events,
              errors,
            });
          },
        }
      );
    });

    // Should have error
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  }, 15000);

  it('should reuse existing session', async () => {
    const client = createInProcessClient({ appContext });

    // First message - creates session
    let firstSessionId: string | null = null;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);

      client.message.streamResponse.subscribe(
        {
          sessionId: null,
          provider: 'openrouter',
          model: 'x-ai/grok-code-fast-1',
          userMessage: 'first message',
        },
        {
          onData: (event: any) => {
            if (event.type === 'session-created') {
              firstSessionId = event.sessionId;
            }
            if (event.type === 'complete') {
              clearTimeout(timeout);
              resolve();
            }
          },
          onError: (error) => {
            clearTimeout(timeout);
            reject(error);
          },
        }
      );
    });

    expect(firstSessionId).toBeTruthy();

    // Second message - reuses session
    let secondSessionId: string | null = null;
    const events: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);

      client.message.streamResponse.subscribe(
        {
          sessionId: firstSessionId,
          userMessage: 'second message',
        },
        {
          onData: (event: any) => {
            events.push(event.type);
            if (event.type === 'session-created') {
              secondSessionId = event.sessionId;
            }
            if (event.type === 'complete') {
              clearTimeout(timeout);
              resolve();
            }
          },
          onError: (error) => {
            clearTimeout(timeout);
            reject(error);
          },
        }
      );
    });

    // Should NOT create new session
    expect(events).not.toContain('session-created');
    expect(secondSessionId).toBeNull();
  }, 90000);
});
