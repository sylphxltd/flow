import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claudeCodeTarget } from '../../src/targets/claude-code.js';

// Mock file system for dependency injection
const createMockFileSystem = () => ({
  pathExists: vi.fn(),
  createDirectory: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
});

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
  let mockFs: ReturnType<typeof createMockFileSystem>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs = createMockFileSystem();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setup method', () => {
    it('should setup Claude Code hooks successfully', async () => {
      // Mock successful file operations
      mockFs.pathExists.mockResolvedValue(false);
      mockFs.createDirectory.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await (claudeCodeTarget as any).setupClaudeCodeHooks(testCwd, mockFs);

      expect(result?.success).toBe(true);
      expect(result?.message).toContain('Claude Code hooks configured');
      expect(mockFs.pathExists).toHaveBeenCalledWith(claudeDir);
      expect(mockFs.createDirectory).toHaveBeenCalledWith(claudeDir);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should use default hook command when none provided', async () => {
      mockFs.pathExists.mockResolvedValue(false);
      mockFs.createDirectory.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await (claudeCodeTarget as any).setupClaudeCodeHooks(testCwd, mockFs);

      expect(result?.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();

      // Check that the written content includes the hook configuration
      const writeCall = mockFs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('SessionStart');
      expect(writeCall[1]).toContain('UserPromptSubmit');
    });

    it('should handle existing settings file correctly', async () => {
      const existingSettings = {
        existingConfig: 'value',
        hooks: {
          ExistingHook: 'should-be-preserved',
        },
      };

      mockFs.pathExists.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingSettings));
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await (claudeCodeTarget as any).setupClaudeCodeHooks(testCwd, mockFs);

      expect(result?.success).toBe(true);

      // Check that the written content preserves existing config and adds new hooks
      const writeCall = mockFs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('"existingConfig": "value"');
      expect(writeCall[1]).toContain('UserPromptSubmit');
    });

    it('should handle errors gracefully', async () => {
      mockFs.pathExists.mockResolvedValue(false);
      mockFs.createDirectory.mockRejectedValue(new Error('Permission denied'));

      try {
        await (claudeCodeTarget as any).setupClaudeCodeHooks(testCwd, mockFs);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Permission denied');
      }
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFs.pathExists.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
      mockFs.readFile.mockResolvedValue('invalid json');
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await (claudeCodeTarget as any).setupClaudeCodeHooks(testCwd, mockFs);

      expect(result?.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('setupClaudeCodeHooks method', () => {
    it('should return correct result format', async () => {
      mockFs.pathExists.mockResolvedValue(false);
      mockFs.createDirectory.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await (claudeCodeTarget as any).setupClaudeCodeHooks(testCwd, mockFs);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Claude Code hooks configured');
    });

    it('should preserve existing hooks', async () => {
      const existingSettings = {
        hooks: {
          ExistingHook: [{ type: 'command', command: 'existing-command' }],
        },
      };

      mockFs.pathExists.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingSettings));
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await (claudeCodeTarget as any).setupClaudeCodeHooks(testCwd, mockFs);

      expect(result.success).toBe(true);

      // Verify that both hooks are present
      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);

      expect(writtenData.hooks.ExistingHook).toBeDefined();
      expect(writtenData.hooks.UserPromptSubmit).toBeDefined();
      expect(writtenData.hooks.SessionStart).toBeDefined();
    });
  });
});
