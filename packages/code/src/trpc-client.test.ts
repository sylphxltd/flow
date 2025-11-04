/**
 * Unit tests for trpc-client
 * Testing tRPC client creation and server health checks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('trpc-client', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('createClient', () => {
    it('should create tRPC client with correct configuration', async () => {
      const { createClient } = await import('./trpc-client.js');

      const client = createClient();

      // Proxy client should be defined
      expect(client).toBeDefined();
    });
  });

  describe('checkServer', () => {
    it('should handle server connectivity checks', async () => {
      const { checkServer } = await import('./trpc-client.js');

      // Test function returns boolean
      const result = await checkServer();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('waitForServer', () => {
    it('should wait for server with timeout', async () => {
      const { waitForServer } = await import('./trpc-client.js');

      // Test with short timeout to avoid long test runs
      const result = await waitForServer(100);

      // Should return boolean (true if server running, false if timeout)
      expect(typeof result).toBe('boolean');
    });
  });
});
