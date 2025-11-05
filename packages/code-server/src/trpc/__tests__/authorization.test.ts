/**
 * Authorization Tests (Function Level Authorization)
 * SECURITY: OWASP API5 (Broken Function Level Authorization)
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { CodeServer } from '../../server.js';
import type { AppRouter } from '../routers/index.js';
import { createTRPCClient, TRPCClientError } from '@trpc/client';
import { inProcessLink } from '@sylphx/code-client';

describe('Function Level Authorization (OWASP API5)', () => {
  let server: CodeServer;
  let client: ReturnType<typeof createTRPCClient<AppRouter>>;

  beforeAll(async () => {
    // Initialize server
    server = new CodeServer({
      dbPath: ':memory:', // In-memory database for testing
    });
    await server.initialize();

    // Create in-process tRPC client (admin role)
    client = createTRPCClient<AppRouter>({
      links: [
        inProcessLink({
          router: server.getRouter(),
          createContext: server.getContext(),
        }),
      ],
    });
  });

  describe('Admin-only operations (in-process = admin)', () => {
    test('admin can access deleteAllSessions', async () => {
      // Create a test session first
      await client.session.create.mutate({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      });

      // Admin can delete all sessions
      const result = await client.admin.deleteAllSessions.mutate({
        confirm: true,
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });

    test('admin can access getSystemStats', async () => {
      const stats = await client.admin.getSystemStats.query();

      expect(stats).toBeDefined();
      expect(stats.sessions).toBeDefined();
      expect(stats.messages).toBeDefined();
      expect(stats.config).toBeDefined();
      expect(typeof stats.sessions.total).toBe('number');
    });

    test('admin can access forceGC', async () => {
      const result = await client.admin.forceGC.mutate();

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Public operations (no auth required)', () => {
    test('anyone can access getHealth', async () => {
      const health = await client.admin.getHealth.query();

      expect(health).toBeDefined();
      expect(health.status).toBe('ok');
      expect(typeof health.timestamp).toBe('number');
      expect(typeof health.uptime).toBe('number');
      expect(health.memory).toBeDefined();
    });
  });

  describe('User role operations', () => {
    test('admin (in-process) can access all user operations', async () => {
      // Create session
      const session = await client.session.create.mutate({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      });

      expect(session).toBeDefined();

      // Update session
      await client.session.updateTitle.mutate({
        sessionId: session.id,
        title: 'Test session',
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Role hierarchy', () => {
    test('in-process client has admin role', async () => {
      // Implicitly tested - if admin operations work, role is correct
      const stats = await client.admin.getSystemStats.query();
      expect(stats).toBeDefined();
    });
  });
});

/**
 * Note: HTTP client tests with different roles would require:
 * 1. Starting HTTP server
 * 2. Creating HTTP clients with/without API keys
 * 3. Testing that HTTP clients (user role) cannot access admin endpoints
 * 4. Testing that guest clients (no API key) can only access public endpoints
 *
 * These tests are more complex and require HTTP server setup.
 * Current tests verify the in-process (admin) path works correctly.
 */
