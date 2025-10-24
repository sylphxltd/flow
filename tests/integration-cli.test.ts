import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the paths module to avoid the dist directory check
vi.mock('../src/utils/paths.js', () => ({
  getDistDir: () => '/mock/dist',
  getAssetsDir: () => '/mock/dist/assets',
}));

describe('CLI Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Command Structure', () => {
    it('should have all required commands', async () => {
      // Test that commands can be imported individually
      const initModule = await import('../src/commands/init-command.js');
      const memoryModule = await import('../src/commands/memory-command.js');
      const runModule = await import('../src/commands/run-command.js');

      expect(initModule).toBeDefined();
      expect(memoryModule).toBeDefined();
      expect(runModule).toBeDefined();
    });

    it('should load init command', async () => {
      const { initCommand } = await import('../src/commands/init-command.js');

      expect(initCommand).toBeDefined();
      expect(initCommand.name).toBe('init');
      expect(initCommand.description).toBeDefined();
      expect(Array.isArray(initCommand.options)).toBe(true);
    });

    it('should load memory command', async () => {
      const { memoryCommand } = await import('../src/commands/memory-command.js');

      expect(memoryCommand).toBeDefined();
      expect(memoryCommand.name).toBe('memory');
      expect(memoryCommand.description).toBeDefined();
    });

    it('should load run command', async () => {
      const { runCommand } = await import('../src/commands/run-command.js');

      expect(runCommand).toBeDefined();
      expect(runCommand.name).toBe('run');
      expect(runCommand.description).toBeDefined();
    });
  });

  describe('Command Options', () => {
    it('should have proper init command options', async () => {
      const { initCommand } = await import('../src/commands/init-command.js');

      const optionFlags = initCommand.options.map((opt) => opt.flags);

      expect(optionFlags).toContain('--target <type>');
      expect(optionFlags).toContain('--verbose');
      expect(optionFlags).toContain('--dry-run');
      expect(optionFlags).toContain('--clear');
      expect(optionFlags).toContain('--no-mcp');
    });
  });

  describe('Command Handlers', () => {
    it('should have proper handler functions', async () => {
      const { initCommand } = await import('../src/commands/init-command.js');

      expect(typeof initCommand.handler).toBe('function');
    });
  });

  describe('CLI Builder', () => {
    it('should create CLI structure', async () => {
      const { createCLI } = await import('../src/cli-effect.js');

      expect(typeof createCLI).toBe('object'); // Command is an object, not a function
    });
  });

  describe('Error Handling', () => {
    it('should have CLIError available', async () => {
      const { CLIError } = await import('../src/utils/error-handler.js');

      expect(CLIError).toBeDefined();
      expect(typeof CLIError).toBe('function');
    });
  });
});
