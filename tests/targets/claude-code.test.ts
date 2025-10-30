import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claudeCodeTarget } from '../../src/targets/claude-code.js';

// Mock fs module
const mockFs = {
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
};

vi.mock('node:fs', () => mockFs);

vi.mock('chalk', () => ({
  default: {
    yellow: vi.fn((str) => str),
    gray: vi.fn((str) => str),
    cyan: vi.fn((str) => str),
  },
}));

describe('claude-code target', () => {
  const testCwd = '/tmp/test-project';
  const claudeDir = path.join(testCwd, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mock functions
    Object.values(mockFs).forEach((fn) => {
      if (typeof fn === 'function') {
        fn.mockReset();
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setup method', () => {
    it('should setup Claude Code hooks successfully', async () => {
      // Mock successful file operations
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      const result = await claudeCodeTarget.setup?.(testCwd, {
        hookCommand: 'npx @sylphxltd/flow@latest sysinfo',
      });

      expect(result?.success).toBe(true);
      expect(result?.message).toContain('Claude Code hooks configured');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(claudeDir, { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        settingsPath,
        expect.stringContaining('npx @sylphxltd/flow@latest sysinfo')
      );
    });

    it('should use default hook command when none provided', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      const result = await claudeCodeTarget.setup?.(testCwd);

      expect(result?.success).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        settingsPath,
        expect.stringContaining('npx @sylphxltd/flow@latest sysinfo')
      );
    });

    it('should handle existing settings file correctly', async () => {
      const existingSettings = {
        existingConfig: 'value',
        hooks: {
          ExistingHook: 'should-be-preserved',
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingSettings));
      mockFs.writeFileSync.mockReturnValue(undefined);

      const result = await claudeCodeTarget.setup?.(testCwd);

      expect(result?.success).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        settingsPath,
        expect.stringContaining('"existingConfig": "value"')
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        settingsPath,
        expect.stringContaining('"UserPromptSubmit"')
      );
    });

    it('should handle errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await claudeCodeTarget.setup?.(testCwd);

      expect(result?.success).toBe(false);
      expect(result?.message).toContain('Could not setup Claude Code hooks');
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');
      mockFs.writeFileSync.mockReturnValue(undefined);

      const result = await claudeCodeTarget.setup?.(testCwd);

      expect(result?.success).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('setupClaudeCodeHooks method', () => {
    it('should return correct result format', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      const result = await (claudeCodeTarget as any).setupClaudeCodeHooks(testCwd, 'test-command');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('test-command');
    });

    it('should preserve existing hooks', async () => {
      const existingSettings = {
        hooks: {
          ExistingHook: [{ type: 'command', command: 'existing-command' }],
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingSettings));
      mockFs.writeFileSync.mockReturnValue(undefined);

      const result = await (claudeCodeTarget as any).setupClaudeCodeHooks(testCwd, 'new-command');

      expect(result.success).toBe(true);

      // Verify that both hooks are present
      const writtenData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);

      expect(writtenData.hooks.ExistingHook).toBeDefined();
      expect(writtenData.hooks.UserPromptSubmit).toBeDefined();
      expect(writtenData.hooks.UserPromptSubmit[0].command).toBe('new-command');
    });
  });
});
