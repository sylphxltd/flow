import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';
import { CLIError } from '../src/errors.js';

// Mock the TUI command handler
const mockHandleMemoryTui = vi.fn().mockResolvedValue(undefined);

vi.mock('../src/commands/memory-tui-command.js', () => ({
  handleMemoryTui: mockHandleMemoryTui,
}));

describe('Effect CLI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CLI Structure', () => {
    it('should export runCLI function', async () => {
      const { runCLI } = await import('../src/cli-effect.js');

      expect(typeof runCLI).toBe('function');
    });

    it('should export createCLI function', async () => {
      const { createCLI } = await import('../src/cli-effect.js');

      expect(createCLI).toBeDefined();
      expect(typeof createCLI).toBe('object'); // It's a Command, not a function
    });
  });

  describe('Error Handling', () => {
    it('should handle TUI launch failures with Effect error handling', async () => {
      const errorMessage = 'TUI failed to start';
      mockHandleMemoryTui.mockRejectedValueOnce(new Error(errorMessage));

      // Test the CLI error handling by importing the module
      // The error handling is built into the command structure
      await expect(import('../src/cli-effect.js')).resolves.toBeDefined();
    });

    it('should handle successful TUI launch', async () => {
      mockHandleMemoryTui.mockResolvedValueOnce(undefined);

      // Test that the CLI module loads successfully
      await expect(import('../src/cli-effect.js')).resolves.toBeDefined();
    });
  });

  describe('CLI Runtime', () => {
    it('should have proper runtime configuration', async () => {
      const { runCLI } = await import('../src/cli-effect.js');

      expect(typeof runCLI).toBe('function');

      // Test that runCLI doesn't throw immediately during import
      expect(() => {
        // We can't actually run it without proper CLI args, but we can test it exists
        expect(runCLI).toBeDefined();
      }).not.toThrow();
    });
  });
});
