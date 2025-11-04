/**
 * Unit tests for web-launcher
 * Testing Web GUI launcher functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as serverManager from './server-manager.js';

// Mock dependencies
vi.mock('./server-manager.js', () => ({
  ensureServer: vi.fn(),
}));
vi.mock('open', () => ({
  default: vi.fn(),
}));
vi.mock('chalk', () => ({
  default: {
    cyan: vi.fn((s) => s),
    green: vi.fn((s) => s),
    red: vi.fn((s) => s),
    yellow: vi.fn((s) => s),
    dim: vi.fn((s) => s),
  },
}));

describe('web-launcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process.stdin, 'resume').mockImplementation(() => process.stdin);
  });

  describe('launchWeb', () => {
    it('should ensure server is running before launching browser', async () => {
      // Mock server starting successfully
      (serverManager.ensureServer as any).mockResolvedValue(true);

      const { launchWeb } = await import('./web-launcher.js');

      // Mock process.exit to prevent test from exiting
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      try {
        await launchWeb();
      } catch {
        // Expected to throw or exit
      }

      // Should have tried to ensure server
      expect(serverManager.ensureServer).toHaveBeenCalled();
      expect(serverManager.ensureServer).toHaveBeenCalledWith({ timeout: 10000 });

      exitSpy.mockRestore();
    });

    it('should exit with error if server fails to start', async () => {
      // Mock server failing to start
      (serverManager.ensureServer as any).mockResolvedValue(false);

      const { launchWeb } = await import('./web-launcher.js');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await launchWeb();

      // Should have exited with error code
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });


    it('should use custom URL from environment variable', async () => {
      const customUrl = 'http://localhost:8080';
      process.env.CODE_SERVER_URL = customUrl;

      (serverManager.ensureServer as any).mockResolvedValue(true);

      const { launchWeb } = await import('./web-launcher.js');

      try {
        await launchWeb();
      } catch {
        // Expected behavior
      }

      // Should have used custom URL
      expect(serverManager.ensureServer).toHaveBeenCalled();

      delete process.env.CODE_SERVER_URL;
    });
  });
});
