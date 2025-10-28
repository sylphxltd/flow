import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { claudeCodeTarget } from './claude-code.js';

// Mock dependencies
vi.mock('node:fs/promises');
vi.mock('node:fs');

// Mock the dynamic import of child_process
const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: mockSpawn,
}));

// Mock the CLIError
const mockCLIError = class extends Error {
  constructor(message: string, code: string) {
    super(message);
    this.name = 'CLIError';
    this.code = code;
  }
};

vi.mock('../utils/error-handler.js', () => ({
  CLIError: mockCLIError,
}));

describe('Claude Code @file Implementation', () => {
  const mockFsPromises = vi.mocked(fsPromises);

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockFsPromises.mkdtemp.mockResolvedValue('/tmp/claude-system-prompt-abc123');
    mockFsPromises.writeFile.mockResolvedValue();
    mockFsPromises.rm.mockResolvedValue();
    mockFsPromises.mkdir.mockResolvedValue();
    mockFsPromises.readFile.mockResolvedValue('{"enabledMcpjsonServers": []}');

    // Default spawn mock that resolves successfully
    const mockChildProcess = {
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          // Simulate successful completion
          setTimeout(() => callback(0), 0);
        }
        return mockChildProcess;
      }),
    };
    mockSpawn.mockReturnValue(mockChildProcess as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeCommand with @file syntax', () => {
    it('should create temporary file for system prompt', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt);

      // Assert
      expect(mockFsPromises.mkdtemp).toHaveBeenCalledWith(
        expect.stringContaining('claude-system-prompt-')
      );
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('system-prompt.txt'),
        expect.stringContaining('Test system prompt'),
        'utf8'
      );
    });

    it('should use @file syntax in command arguments', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt);

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining([
          '--dangerously-skip-permissions',
          '--system-prompt',
          expect.stringMatching(/^@\/tmp\/claude-system-prompt-.*\/system-prompt\.txt$/),
          'Test user prompt',
        ]),
        expect.objectContaining({
          stdio: 'inherit',
          shell: false,
        })
      );
    });

    it('should enhance system prompt with summary request', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';

      mockFsPromises.writeFile.mockImplementation(async (filePath, content) => {
        expect(content).toContain('Test system prompt');
        expect(content).toContain('Please begin your response with a comprehensive summary');
      });

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt);
    });

    it('should clean up temporary file after execution', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt);

      // Assert
      expect(mockFsPromises.rm).toHaveBeenCalledWith(
        expect.stringContaining('claude-system-prompt-'),
        expect.objectContaining({
          recursive: true,
          force: true,
        })
      );
    });

    it('should handle empty user prompt', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = '';
      const mockChildProcess = {
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockChildProcess as any);

      // Mock the child process to resolve successfully
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(
          ([event]) => event === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 0);

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt);

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining([
          '--dangerously-skip-permissions',
          '--system-prompt',
          expect.stringMatching(/^@/),
        ]),
        expect.any(Object)
      );
    });

    it('should handle user prompt with only whitespace', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = '   ';
      const mockChildProcess = {
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockChildProcess as any);

      // Mock the child process to resolve successfully
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(
          ([event]) => event === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 0);

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt);

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining([
          '--dangerously-skip-permissions',
          '--system-prompt',
          expect.stringMatching(/^@/),
        ]),
        expect.any(Object)
      );
    });
  });

  describe('dry run mode', () => {
    it('should not execute command in dry run mode', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt, { dryRun: true });

      // Assert
      expect(mockSpawn).not.toHaveBeenCalled();
      expect(mockFsPromises.mkdtemp).not.toHaveBeenCalled();
      expect(mockFsPromises.writeFile).not.toHaveBeenCalled();
    });

    it('should log dry run information', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt, { dryRun: true });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Dry run: Would execute Claude Code with --system-prompt');
      expect(consoleSpy).toHaveBeenCalledWith('System prompt to append length:', expect.any(Number), 'characters');
      expect(consoleSpy).toHaveBeenCalledWith('User prompt length:', expect.any(Number), 'characters');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Dry run completed successfully');

      consoleSpy.mockRestore();
    });
  });

  describe('verbose mode', () => {
    it('should log verbose information during execution', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';
      const mockChildProcess = {
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockChildProcess as any);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      // Mock the child process to resolve successfully
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(
          ([event]) => event === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 0);

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt, { verbose: true });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('🚀 Executing Claude Code with file-based system prompt');
      expect(consoleSpy).toHaveBeenCalledWith('📝 System prompt length:', expect.any(Number), 'characters');
      expect(consoleSpy).toHaveBeenCalledWith('📝 System prompt saved to:', expect.stringContaining('system-prompt.txt'));
      expect(consoleSpy).toHaveBeenCalledWith('📝 User prompt length:', expect.any(Number), 'characters');

      consoleSpy.mockRestore();
    });

    it('should log warning on cleanup error in verbose mode', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';
      const mockChildProcess = {
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockChildProcess as any);
      mockFsPromises.rm.mockRejectedValue(new Error('Cleanup failed'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      // Mock the child process to resolve successfully
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(
          ([event]) => event === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 0);

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt, { verbose: true });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('⚠️  Warning: Failed to clean up temporary file:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle spawn error', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';
      const mockError = new Error('Spawn failed');

      mockSpawn.mockImplementation(() => {
        setTimeout(() => {
          const errorCallback = mockChildProcess.on.mock.calls.find(
            ([event]) => event === 'error'
          )?.[1];
          if (errorCallback) errorCallback(mockError);
        }, 0);
        return mockChildProcess;
      });

      const mockChildProcess = {
        on: vi.fn(),
      };

      // Act & Assert
      await expect(claudeCodeTarget.executeCommand(systemPrompt, userPrompt)).rejects.toThrow('Failed to execute Claude Code: Spawn failed');
    });

    it('should handle non-zero exit code', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';
      const mockChildProcess = {
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockChildProcess as any);

      // Mock the child process to exit with code 1
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(
          ([event]) => event === 'close'
        )?.[1];
        if (closeCallback) closeCallback(1);
      }, 0);

      // Act & Assert
      await expect(claudeCodeTarget.executeCommand(systemPrompt, userPrompt)).rejects.toThrow('Claude Code exited with code 1');
    });

    it('should handle ENOENT error (Claude Code not found)', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';
      const mockError = new Error('Command not found') as any;
      mockError.code = 'ENOENT';

      mockSpawn.mockImplementation(() => {
        setTimeout(() => {
          const errorCallback = mockChildProcess.on.mock.calls.find(
            ([event]) => event === 'error'
          )?.[1];
          if (errorCallback) errorCallback(mockError);
        }, 0);
        return mockChildProcess;
      });

      const mockChildProcess = {
        on: vi.fn(),
      };

      // Act & Assert
      await expect(claudeCodeTarget.executeCommand(systemPrompt, userPrompt)).rejects.toThrow('Claude Code not found. Please install it first.');
    });

    it('should still attempt cleanup on spawn error', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';
      const mockError = new Error('Spawn failed');

      mockSpawn.mockImplementation(() => {
        setTimeout(() => {
          const errorCallback = mockChildProcess.on.mock.calls.find(
            ([event]) => event === 'error'
          )?.[1];
          if (errorCallback) errorCallback(mockError);
        }, 0);
        return mockChildProcess;
      });

      const mockChildProcess = {
        on: vi.fn(),
      };

      // Act & Assert
      await expect(claudeCodeTarget.executeCommand(systemPrompt, userPrompt)).rejects.toThrow();

      // Assert that cleanup was attempted
      expect(mockFsPromises.rm).toHaveBeenCalled();
    });
  });

  describe('file path handling', () => {
    it('should use OS temp directory for temporary files', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';
      const mockChildProcess = {
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockChildProcess as any);
      const osTmpdirSpy = vi.spyOn(os, 'tmpdir').mockReturnValue('/custom/tmp');

      // Mock the child process to resolve successfully
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(
          ([event]) => event === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 0);

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt);

      // Assert
      expect(mockFsPromises.mkdtemp).toHaveBeenCalledWith(
        expect.stringContaining('/custom/tmp/claude-system-prompt-')
      );

      osTmpdirSpy.mockRestore();
    });

    it('should create unique temporary directory for each execution', async () => {
      // Arrange
      const systemPrompt = 'Test system prompt';
      const userPrompt = 'Test user prompt';
      const mockChildProcess = {
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockChildProcess as any);

      // Mock mkdtemp to return different paths
      mockFsPromises.mkdtemp
        .mockResolvedValueOnce('/tmp/claude-system-prompt-abc123')
        .mockResolvedValueOnce('/tmp/claude-system-prompt-def456');

      // Mock the child process to resolve successfully
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(
          ([event]) => event === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 0);

      // Act
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt);
      await claudeCodeTarget.executeCommand(systemPrompt, userPrompt);

      // Assert
      expect(mockFsPromises.mkdtemp).toHaveBeenCalledTimes(2);
      expect(mockFsPromises.mkdtemp).toHaveBeenNthCalledWith(1, expect.stringContaining('claude-system-prompt-'));
      expect(mockFsPromises.mkdtemp).toHaveBeenNthCalledWith(2, expect.stringContaining('claude-system-prompt-'));
    });
  });

  describe('large system prompt handling', () => {
    it('should handle very large system prompts', async () => {
      // Arrange
      const largeSystemPrompt = 'x'.repeat(100000); // 100KB prompt
      const userPrompt = 'Test user prompt';
      const mockChildProcess = {
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockChildProcess as any);
      mockFsPromises.writeFile.mockImplementation(async (filePath, content) => {
        expect(content.length).toBeGreaterThan(100000);
      });

      // Mock the child process to resolve successfully
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(
          ([event]) => event === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 0);

      // Act
      await claudeCodeTarget.executeCommand(largeSystemPrompt, userPrompt);

      // Assert
      expect(mockFsPromises.writeFile).toHaveBeenCalled();
    });
  });
});