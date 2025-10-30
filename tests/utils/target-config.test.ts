/**
 * Target Config Tests
 * Comprehensive tests for target-specific MCP configuration utilities
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as readline from 'node:readline';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MCP_SERVER_REGISTRY } from '../../src/config/servers.js';
import { targetManager } from '../../src/core/target-manager.js';
import * as mcpService from '../../src/services/mcp-service.js';
import { secretUtils } from '../../src/utils/secret-utils.js';
import {
  addMCPServersToTarget,
  configureMCPServerForTarget,
  getAllTargetsHelpText,
  getTargetHelpText,
  getTargetsWithMCPSupport,
  listMCPServersForTarget,
  removeMCPServersFromTarget,
  targetSupportsMCPServers,
  validateTarget,
} from '../../src/utils/target-config.js';

// Mock readline module at the top level
let createInterfaceMock = vi.fn();

vi.mock('node:readline', () => ({
  createInterface: createInterfaceMock,
}));

describe('Target Config', () => {
  let testDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'target-config-test-'));
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('validateTarget', () => {
    it('should validate existing target', () => {
      const targetId = validateTarget('claude-code');
      expect(targetId).toBe('claude-code');
    });

    it('should throw for unknown target', () => {
      expect(() => validateTarget('unknown-target')).toThrow('Unknown target');
      expect(() => validateTarget('unknown-target')).toThrow('Available targets');
    });

    it('should throw for non-implemented target', () => {
      // Mock a non-implemented target
      const originalGet = targetManager.getTarget.bind(targetManager);
      vi.spyOn(targetManager, 'getTarget').mockReturnValue({
        ...originalGet('claude-code')!,
        isImplemented: false,
      } as any);

      expect(() => validateTarget('claude-code')).toThrow('not implemented');

      vi.restoreAllMocks();
    });
  });

  describe('targetSupportsMCPServers', () => {
    it('should return true for targets with MCP support', () => {
      expect(targetSupportsMCPServers('claude-code')).toBe(true);
    });

    it('should return false for targets without MCP support', () => {
      // Mock a target without MCP support (no setupMCP method)
      const originalGet = targetManager.getTarget.bind(targetManager);
      const mockTarget = {
        ...originalGet('claude-code')!,
      };
      // Remove setupMCP method to simulate target without MCP support
      delete (mockTarget as any).setupMCP;

      vi.spyOn(targetManager, 'getTarget').mockReturnValue(mockTarget as any);

      expect(targetSupportsMCPServers('test')).toBe(false);

      vi.restoreAllMocks();
    });

    it('should return false for non-existent target', () => {
      vi.spyOn(targetManager, 'getTarget').mockReturnValue(null);
      expect(targetSupportsMCPServers('nonexistent')).toBe(false);
      vi.restoreAllMocks();
    });
  });

  describe('getTargetsWithMCPSupport', () => {
    it('should return list of targets with MCP support', () => {
      const targets = getTargetsWithMCPSupport();
      expect(Array.isArray(targets)).toBe(true);
      expect(targets.length).toBeGreaterThan(0);
    });

    it('should include claude-code', () => {
      const targets = getTargetsWithMCPSupport();
      expect(targets).toContain('claude-code');
    });
  });

  describe('getTargetHelpText', () => {
    it('should return help text for valid target', () => {
      const helpText = getTargetHelpText('claude-code');
      expect(helpText).toBeTruthy();
      expect(typeof helpText).toBe('string');
    });

    it('should return empty string for invalid target', () => {
      const helpText = getTargetHelpText('nonexistent');
      expect(helpText).toBe('');
    });
  });

  describe('getAllTargetsHelpText', () => {
    it('should return help text for all targets', () => {
      const helpText = getAllTargetsHelpText();
      expect(helpText).toBeTruthy();
      expect(typeof helpText).toBe('string');
    });

    it('should contain multiple target sections', () => {
      const helpText = getAllTargetsHelpText();
      const sections = helpText.split('\n\n');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('addMCPServersToTarget', () => {
    let mockTarget: any;

    beforeEach(() => {
      // Create mock config file
      const configPath = join(testDir, 'claude_desktop_config.json');
      writeFileSync(configPath, JSON.stringify({ mcpServers: {} }), 'utf8');

      mockTarget = {
        name: 'Test Target',
        config: {
          configFile: 'claude_desktop_config.json',
          mcpConfigPath: 'mcpServers',
          installation: { createConfigFile: true, createAgentDir: true },
        },
        readConfig: vi.fn().mockResolvedValue({ mcpServers: {} }),
        writeConfig: vi.fn().mockResolvedValue(undefined),
        transformMCPConfig: vi.fn((config: any) => config),
        setupMCP: vi.fn().mockResolvedValue({ count: 1 }),
      };

      vi.spyOn(targetManager, 'getTarget').mockReturnValue(mockTarget);
      vi.spyOn(mcpService, 'resolveConfig').mockResolvedValue('resolved-value');
    });

    it('should throw if target not found', async () => {
      vi.spyOn(targetManager, 'getTarget').mockReturnValue(null);
      await expect(addMCPServersToTarget(testDir, 'invalid', ['context7'])).rejects.toThrow(
        'Target not found'
      );
    });

    it('should throw if target does not support MCP servers', async () => {
      delete (mockTarget as any).setupMCP;
      await expect(addMCPServersToTarget(testDir, 'test-target', ['context7'])).rejects.toThrow(
        'does not support MCP servers'
      );
    });

    it('should add new MCP server', async () => {
      await addMCPServersToTarget(testDir, 'test-target', ['context7']);

      expect(mockTarget.writeConfig).toHaveBeenCalled();
      // Check that the server was added to the config
      const writeCall = mockTarget.writeConfig.mock.calls[0][1];
      expect(writeCall.mcpServers['context7']).toBeDefined();
    });

    it('should skip existing MCP server', async () => {
      mockTarget.readConfig.mockResolvedValue({
        mcpServers: { context7: { type: 'http', url: 'test' } },
      });

      await addMCPServersToTarget(testDir, 'test-target', ['context7']);

      // Server should not be added again (count should be 0)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('with 0 new MCP server(s)')
      );
    });

    it('should warn for unknown server types', async () => {
      await addMCPServersToTarget(testDir, 'test-target', ['invalid-server' as any]);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown MCP server type')
      );
    });

    it('should handle multiple servers', async () => {
      await addMCPServersToTarget(testDir, 'test-target', ['context7', 'gemini-search']);

      expect(mockTarget.writeConfig).toHaveBeenCalled();
      const writeCall = mockTarget.writeConfig.mock.calls[0][1];
      const serverCount = Object.keys(writeCall.mcpServers).length;
      expect(serverCount).toBe(2);
    });

    it('should resolve dynamic command and args', async () => {
      const sylphxServer = MCP_SERVER_REGISTRY['sylphx-flow'];
      if (sylphxServer.config.command || sylphxServer.config.args) {
        await addMCPServersToTarget(testDir, 'test-target', ['sylphx-flow']);
        expect(mcpService.resolveConfig).toHaveBeenCalled();
      }
    });

    it('should initialize MCP section if missing', async () => {
      mockTarget.readConfig.mockResolvedValue({});

      await addMCPServersToTarget(testDir, 'test-target', ['context7']);

      const writeCall = mockTarget.writeConfig.mock.calls[0][1];
      expect(writeCall).toHaveProperty('mcpServers');
    });
  });

  describe('removeMCPServersFromTarget', () => {
    let mockTarget: any;

    beforeEach(() => {
      mockTarget = {
        name: 'Test Target',
        config: {
          configFile: 'claude_desktop_config.json',
          mcpConfigPath: 'mcpServers',
        },
        readConfig: vi.fn().mockResolvedValue({
          mcpServers: {
            context7: { type: 'http', url: 'test' },
            'gemini-search': { type: 'http', url: 'test2' },
          },
        }),
        writeConfig: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(targetManager, 'getTarget').mockReturnValue(mockTarget);
    });

    it('should throw if target not found', async () => {
      vi.spyOn(targetManager, 'getTarget').mockReturnValue(null);
      await expect(removeMCPServersFromTarget(testDir, 'invalid', ['context7'])).rejects.toThrow(
        'Target not found'
      );
    });

    it('should remove existing MCP server', async () => {
      await removeMCPServersFromTarget(testDir, 'test-target', ['context7']);

      expect(mockTarget.writeConfig).toHaveBeenCalled();
      const writeCall = mockTarget.writeConfig.mock.calls[0][1];
      // Server should be removed from config
      expect(writeCall.mcpServers['context7']).toBeUndefined();
    });

    it('should handle non-existent server', async () => {
      await removeMCPServersFromTarget(testDir, 'test-target', ['nonexistent' as any]);

      // Should indicate 0 servers removed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('removed 0 MCP server(s)')
      );
    });

    it('should remove MCP section if empty', async () => {
      mockTarget.readConfig.mockResolvedValue({
        mcpServers: { context7: { type: 'http', url: 'test' } },
        other: 'value',
      });

      await removeMCPServersFromTarget(testDir, 'test-target', ['context7']);

      const writeCall = mockTarget.writeConfig.mock.calls[0][1];
      expect(writeCall.mcpServers).toBeUndefined();
      expect(writeCall.other).toBe('value');
    });

    it('should handle missing MCP section', async () => {
      mockTarget.readConfig.mockResolvedValue({});

      await removeMCPServersFromTarget(testDir, 'test-target', ['context7']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No MCP servers configured')
      );
    });

    it('should warn for unknown server types', async () => {
      await removeMCPServersFromTarget(testDir, 'test-target', ['unknown-server' as any]);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown MCP server type')
      );
    });
  });

  describe('listMCPServersForTarget', () => {
    let mockTarget: any;

    beforeEach(() => {
      mockTarget = {
        name: 'Test Target',
        config: {
          configFile: 'claude_desktop_config.json',
          mcpConfigPath: 'mcpServers',
        },
        readConfig: vi.fn().mockResolvedValue({
          mcpServers: {
            context7: {
              type: 'remote',
              url: 'https://mcp.context7.com/mcp',
            },
            'gemini-search': {
              type: 'remote',
              url: 'https://example.com',
            },
          },
        }),
      };

      vi.spyOn(targetManager, 'getTarget').mockReturnValue(mockTarget);
    });

    it('should throw if target not found', async () => {
      vi.spyOn(targetManager, 'getTarget').mockReturnValue(null);
      await expect(listMCPServersForTarget(testDir, 'invalid')).rejects.toThrow('Target not found');
    });

    it('should list configured MCP servers', async () => {
      await listMCPServersForTarget(testDir, 'test-target');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Currently configured MCP servers')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('context7'));
    });

    it('should handle no configured servers', async () => {
      mockTarget.readConfig.mockResolvedValue({ mcpServers: {} });

      await listMCPServersForTarget(testDir, 'test-target');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No MCP servers configured')
      );
    });

    it('should handle missing MCP section', async () => {
      mockTarget.readConfig.mockResolvedValue({});

      await listMCPServersForTarget(testDir, 'test-target');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No MCP servers configured')
      );
    });

    it('should display remote server with URL', async () => {
      await listMCPServersForTarget(testDir, 'test-target');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTP: https://example.com')
      );
    });

    it('should show server descriptions when available', async () => {
      await listMCPServersForTarget(testDir, 'test-target');

      // Should show description for known servers
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('context7'));
    });
  });

  describe('configureMCPServerForTarget', () => {
    let mockTarget: any;
    let readlineInterface: any;
    let readline: any;

    beforeEach(async () => {
      // Import readline after it's been mocked
      readline = await import('node:readline');

      mockTarget = {
        name: 'Test Target',
        config: {
          configFile: 'claude_desktop_config.json',
          mcpConfigPath: 'mcpServers',
          installation: { createConfigFile: true, createAgentDir: true, useSecretFiles: true },
        },
        readConfig: vi.fn().mockResolvedValue({ mcpServers: {} }),
        writeConfig: vi.fn().mockResolvedValue(undefined),
        transformMCPConfig: vi.fn((config: any) => config),
        setupMCP: vi.fn().mockResolvedValue({ count: 1 }),
      };

      readlineInterface = {
        question: vi.fn((prompt: string, callback: any) => {
          // Default: return empty string
          callback('');
        }),
        close: vi.fn(),
      };

      vi.spyOn(targetManager, 'getTarget').mockReturnValue(mockTarget);
      createInterfaceMock.mockReturnValue(readlineInterface as any);
      vi.spyOn(secretUtils, 'convertSecretsToFileReferences').mockResolvedValue({});
      vi.spyOn(secretUtils, 'addToGitignore').mockResolvedValue(undefined);
    });

    it('should throw if target not found', async () => {
      vi.spyOn(targetManager, 'getTarget').mockReturnValue(null);
      await expect(configureMCPServerForTarget(testDir, 'invalid', 'context7')).rejects.toThrow(
        'Target not found'
      );
    });

    it('should return false for unknown server', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await configureMCPServerForTarget(testDir, 'test-target', 'unknown' as any);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown MCP server'));
      consoleErrorSpy.mockRestore();
    });

    it('should return true for servers without required env vars', async () => {
      // Use a server with no required env vars
      const result = await configureMCPServerForTarget(testDir, 'test-target', 'context7');

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('does not require any API keys')
      );
    });

    it('should prompt for API keys for servers with env vars', async () => {
      // Mock user input with actual API key
      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        callback('test-api-key');
      });

      const result = await configureMCPServerForTarget(testDir, 'test-target', 'perplexity');

      expect(readlineInterface.question).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should keep existing valid keys when user skips input', async () => {
      mockTarget.readConfig.mockResolvedValue({
        mcpServers: {
          'perplexity-ask': {
            type: 'stdio',
            command: 'npx',
            args: ['-y', 'server-perplexity-ask'],
            env: { PERPLEXITY_API_KEY: 'existing-token' },
          },
        },
      });

      // Mock empty user input (press Enter to keep current)
      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        callback('');
      });

      const result = await configureMCPServerForTarget(testDir, 'test-target', 'perplexity');

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Keeping perplexity-ask (existing API keys are valid)')
      );
    });

    it('should remove server if no keys provided and not installed', async () => {
      // Mock empty user input for required keys
      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        callback('');
      });

      const result = await configureMCPServerForTarget(testDir, 'test-target', 'perplexity');

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping perplexity-ask (required API keys not provided)')
      );
    });

    it('should delete server if installed without valid keys and user skips', async () => {
      mockTarget.readConfig.mockResolvedValue({
        mcpServers: {
          'perplexity-ask': { type: 'local', environment: {} },
        },
      });

      // Mock empty user input
      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        callback('');
      });

      const result = await configureMCPServerForTarget(testDir, 'test-target', 'perplexity');

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removing perplexity-ask')
      );
    });

    it('should use environment variables if available', async () => {
      const originalEnv = process.env.PERPLEXITY_API_KEY;
      process.env.PERPLEXITY_API_KEY = 'env-token';

      // Mock user pressing Enter to use existing
      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        callback('');
      });

      await configureMCPServerForTarget(testDir, 'test-target', 'perplexity');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found existing API keys')
      );

      if (originalEnv) {
        process.env.PERPLEXITY_API_KEY = originalEnv;
      } else {
        delete process.env.PERPLEXITY_API_KEY;
      }
    });

    it('should convert secrets to file references', async () => {
      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        callback('test-secret-key');
      });

      vi.spyOn(secretUtils, 'convertSecretsToFileReferences').mockResolvedValue({
        PERPLEXITY_API_KEY: '{file:.secrets/PERPLEXITY_API_KEY}',
      });

      await configureMCPServerForTarget(testDir, 'test-target', 'perplexity');

      expect(secretUtils.convertSecretsToFileReferences).toHaveBeenCalled();
      expect(secretUtils.addToGitignore).toHaveBeenCalled();
    });

    it('should handle servers with only optional env vars', async () => {
      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        callback('optional-value');
      });

      const result = await configureMCPServerForTarget(testDir, 'test-target', 'sylphx-flow');

      expect(result).toBe(true);
    });

    it('should skip secret conversion when useSecretFiles is false', async () => {
      mockTarget.config.installation.useSecretFiles = false;

      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        callback('test-key');
      });

      await configureMCPServerForTarget(testDir, 'test-target', 'grep');

      expect(secretUtils.convertSecretsToFileReferences).not.toHaveBeenCalled();
    });

    it('should update existing local server config', async () => {
      mockTarget.readConfig.mockResolvedValue({
        mcpServers: {
          'perplexity-ask': {
            type: 'stdio',
            command: 'npx',
            args: ['-y', 'server-perplexity-ask'],
            env: { OLD_KEY: 'old-value' },
          },
        },
      });

      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        callback('new-key');
      });

      await configureMCPServerForTarget(testDir, 'test-target', 'perplexity');

      const writeCall = mockTarget.writeConfig.mock.calls[0][1];
      expect(writeCall.mcpServers['perplexity-ask'].env).toHaveProperty('PERPLEXITY_API_KEY');
    });

    it('should create new config with API keys', async () => {
      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        callback('new-api-key');
      });

      await configureMCPServerForTarget(testDir, 'test-target', 'gpt-image');

      expect(mockTarget.writeConfig).toHaveBeenCalled();
      const writeCall = mockTarget.writeConfig.mock.calls[0][1];
      expect(writeCall.mcpServers['gpt-image-1-mcp']).toBeDefined();
    });

    it('should handle default values for optional env vars', async () => {
      // Mock readline to return empty string (use default)
      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        if (prompt.includes('default:')) {
          callback(''); // Use default
        } else {
          callback('test-value');
        }
      });

      await configureMCPServerForTarget(testDir, 'test-target', 'sylphx-flow');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should display existing values in prompts', async () => {
      mockTarget.readConfig.mockResolvedValue({
        mcpServers: {
          'perplexity-ask': {
            type: 'stdio',
            command: 'npx',
            args: ['-y', 'server-perplexity-ask'],
            env: { PERPLEXITY_API_KEY: 'existing-long-token-value' },
          },
        },
      });

      readlineInterface.question.mockImplementation((prompt: string, callback: any) => {
        expect(prompt).toContain('current:');
        expect(prompt).toContain('existing-');
        callback('');
      });

      await configureMCPServerForTarget(testDir, 'test-target', 'perplexity');

      expect(readlineInterface.question).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const mockTarget = {
        name: 'Test Target',
        config: {
          configFile: 'claude_desktop_config.json',
          mcpConfigPath: 'mcpServers',
          installation: { createConfigFile: true, createAgentDir: true },
        },
        readConfig: vi.fn().mockRejectedValue(new Error('File read error')),
        writeConfig: vi.fn(),
        transformMCPConfig: vi.fn((config: any) => config),
        setupMCP: vi.fn().mockResolvedValue({ count: 1 }),
      };

      vi.spyOn(targetManager, 'getTarget').mockReturnValue(mockTarget);

      await expect(addMCPServersToTarget(testDir, 'test', ['context7'])).rejects.toThrow(
        'File read error'
      );
    });

    it('should handle write errors gracefully', async () => {
      const mockTarget = {
        name: 'Test Target',
        config: {
          configFile: 'claude_desktop_config.json',
          mcpConfigPath: 'mcpServers',
          installation: { createConfigFile: true, createAgentDir: true },
        },
        readConfig: vi.fn().mockResolvedValue({ mcpServers: {} }),
        writeConfig: vi.fn().mockRejectedValue(new Error('File write error')),
        transformMCPConfig: vi.fn((config: any) => config),
        setupMCP: vi.fn().mockResolvedValue({ count: 1 }),
      };

      vi.spyOn(targetManager, 'getTarget').mockReturnValue(mockTarget);
      vi.spyOn(mcpService, 'resolveConfig').mockResolvedValue('resolved');

      await expect(addMCPServersToTarget(testDir, 'test', ['context7'])).rejects.toThrow(
        'File write error'
      );
    });
  });

  describe('Integration Tests', () => {
    let mockTarget: any;

    beforeEach(() => {
      mockTarget = {
        name: 'Test Target',
        config: {
          configFile: 'claude_desktop_config.json',
          mcpConfigPath: 'mcpServers',
          installation: { createConfigFile: true, createAgentDir: true, useSecretFiles: true },
        },
        readConfig: vi.fn().mockResolvedValue({ mcpServers: {} }),
        writeConfig: vi.fn().mockResolvedValue(undefined),
        transformMCPConfig: vi.fn((config: any) => config),
        getHelpText: vi.fn().mockReturnValue('Help text for test target'),
        setupMCP: vi.fn().mockResolvedValue({ count: 1 }),
      };

      vi.spyOn(targetManager, 'getTarget').mockReturnValue(mockTarget);
      vi.spyOn(mcpService, 'resolveConfig').mockResolvedValue('resolved-value');
    });

    it('should complete add-list-remove workflow', async () => {
      // Add servers
      await addMCPServersToTarget(testDir, 'test-target', ['context7', 'gemini-search']);
      expect(mockTarget.writeConfig).toHaveBeenCalledTimes(1);

      // Update mock to return added servers
      mockTarget.readConfig.mockResolvedValue({
        mcpServers: {
          context7: { type: 'http', url: 'test1' },
          'gemini-search': { type: 'http', url: 'test2' },
        },
      });

      // List servers
      await listMCPServersForTarget(testDir, 'test-target');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('context7'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('gemini-search'));

      // Remove one server
      await removeMCPServersFromTarget(testDir, 'test-target', ['context7']);
      expect(mockTarget.writeConfig).toHaveBeenCalledTimes(2);
    });

    it('should validate and add servers with proper configuration', async () => {
      // Use test-target instead of real target
      const targetId = 'test-target';
      expect(targetSupportsMCPServers(targetId)).toBe(true);

      await addMCPServersToTarget(testDir, targetId, ['context7']);
      expect(mockTarget.writeConfig).toHaveBeenCalled();
    });
  });
});
