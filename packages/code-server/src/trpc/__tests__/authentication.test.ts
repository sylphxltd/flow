/**
 * Authentication Middleware Tests
 * SECURITY: OWASP API2 (Broken Authentication)
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { CodeServer } from '../../server.js';
import type { AppRouter } from '../routers/index.js';
import { createTRPCClient, TRPCClientError } from '@trpc/client';
import { inProcessLink } from '@sylphx/code-client';

describe('Authentication Middleware (OWASP API2)', () => {
  let server: CodeServer;
  let client: ReturnType<typeof createTRPCClient<AppRouter>>;

  beforeAll(async () => {
    // Initialize server
    server = new CodeServer({
      dbPath: ':memory:', // In-memory database for testing
    });
    await server.initialize();

    // Create in-process tRPC client
    client = createTRPCClient<AppRouter>({
      links: [
        inProcessLink({
          router: server.getRouter(),
          createContext: server.getContext(),
        }),
      ],
    });
  });

  describe('In-process calls (trusted)', () => {
    test('should allow session creation (protected mutation)', async () => {
      const session = await client.session.create.mutate({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.provider).toBe('anthropic');
      expect(session.model).toBe('claude-3-5-sonnet-20241022');
    });

    test('should allow session queries (public)', async () => {
      const sessions = await client.session.getRecent.query({
        limit: 10,
      });

      expect(sessions).toBeDefined();
      expect(Array.isArray(sessions.sessions)).toBe(true);
    });

    test('should allow message creation (protected mutation)', async () => {
      // First create a session
      const session = await client.session.create.mutate({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      });

      // Add a message - Note: addMessage returns string (messageId), not full message
      // This is a pre-existing API design, not related to authentication
      const messageId = await client.message.add.mutate({
        sessionId: session.id,
        role: 'user',
        content: [{ type: 'text', content: 'Test message' }],
      });

      // Verify we got a message ID (authentication worked)
      expect(messageId).toBeDefined();
      expect(typeof messageId).toBe('string');
    });

    test('should allow config updates (protected mutation)', async () => {
      const result = await client.config.updateDefaultProvider.mutate({
        provider: 'anthropic',
      });

      expect(result.success).toBe(true);
    });

    test('should allow todo updates (protected mutation)', async () => {
      // First create a session
      const session = await client.session.create.mutate({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      });

      // Update todos
      await client.todo.update.mutate({
        sessionId: session.id,
        todos: [
          {
            id: 1,
            content: 'Test todo',
            activeForm: 'Testing todo',
            status: 'in_progress',
            ordering: 0,
          },
        ],
        nextTodoId: 2,
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Authentication context', () => {
    test('in-process calls should have authenticated context', async () => {
      // This is implicit - if mutations work, context.auth.isAuthenticated = true
      const session = await client.session.create.mutate({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      });

      expect(session).toBeDefined();
    });
  });
});
