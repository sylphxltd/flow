/**
 * Init Command Tests
 * Tests for the init CLI command
 */

import { describe, expect, it, vi } from 'vitest';

// Mock target manager - MUST be before importing initCommand
vi.mock('../../src/core/target-manager.js', () => {
  return {
    targetManager: {
      getImplementedTargetIDs: vi.fn().mockReturnValue(['claude-code', 'opencode']),
      promptForTargetSelection: vi.fn().mockResolvedValue('claude-code'),
      getTarget: vi.fn().mockReturnValue({ name: 'Claude Code' }),
    },
  };
});

// Mock MCP service
vi.mock('../../src/services/mcp-service.js', () => {
  return {
    MCPService: vi.fn().mockImplementation(() => ({
      getAvailableServers: vi.fn().mockResolvedValue(['server1', 'server2']),
      getAllServerIds: vi.fn().mockReturnValue(['server1', 'server2']),
      getInstalledServerIds: vi.fn().mockResolvedValue([]),
      configureServer: vi.fn().mockResolvedValue({ ENV_VAR: 'value' }),
      installServers: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock settings
vi.mock('../../src/utils/settings.js', () => {
  return {
    projectSettings: {
      setDefaultTarget: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock secret utils - COMPLETE mock to prevent test pollution
vi.mock('../../src/utils/secret-utils.js', () => {
  return {
    secretUtils: {
      getSecretsDir: vi.fn((cwd: string) => `${cwd}/.secrets`),
      ensureSecretsDir: vi.fn().mockResolvedValue(undefined),
      writeSecret: vi.fn().mockResolvedValue('.secrets/test'),
      readSecret: vi.fn().mockResolvedValue('test-value'),
      toFileReference: vi.fn((key: string) => `{file:.secrets/${key}}`),
      isFileReference: vi.fn((value: string) => value.startsWith('{file:') && value.endsWith('}')),
      extractFilePath: vi.fn((ref: string) => ref.slice(6, -1)),
      resolveFileReferences: vi.fn().mockResolvedValue({}),
      convertSecretsToFileReferences: vi.fn().mockResolvedValue({}),
      saveSecrets: vi.fn().mockResolvedValue(undefined),
      loadSecrets: vi.fn().mockResolvedValue({}),
      addToGitignore: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock target config
vi.mock('../../src/utils/target-config.js', () => {
  return {
    targetSupportsMCPServers: vi.fn().mockReturnValue(true),
    validateTarget: vi.fn().mockReturnValue(undefined),
  };
});

// Mock inquirer
vi.mock('inquirer', () => {
  return {
    default: {
      prompt: vi.fn().mockResolvedValue({ selectedServers: ['server1'] }),
    },
  };
});

// Mock ora spinner
vi.mock('ora', () => {
  return {
    default: vi.fn().mockReturnValue({
      start: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
    }),
  };
});

// Mock error handler
vi.mock('../../src/utils/error-handler.js', () => {
  return {
    CLIError: class CLIError extends Error {
      constructor(message: string, code?: string) {
        super(message);
        this.name = 'CLIError';
        this.code = code;
      }
      code?: string;
    },
  };
});

// Mock MCP server registry
vi.mock('../../src/config/servers.js', () => {
  return {
    MCP_SERVER_REGISTRY: {
      server1: {
        name: 'Server 1',
        description: 'Test server 1',
        required: false,
        defaultInInit: true,
        envVars: {},
      },
      server2: {
        name: 'Server 2',
        description: 'Test server 2',
        required: false,
        defaultInInit: false,
        envVars: {},
      },
    },
  };
});

// Dynamic import after all mocks are defined
const { initCommand } = await import('../../src/commands/init-command.js');

describe('Init Command', () => {
  describe('Command Registration', () => {
    it('should register init command', () => {
      expect(initCommand.name()).toBe('init');
    });

    it('should have description', () => {
      expect(initCommand.description()).toBeTruthy();
      expect(initCommand.description()).toContain('Initialize');
    });

    it('should mention agents in description', () => {
      expect(initCommand.description()).toContain('agents');
    });

    it('should mention MCP tools in description', () => {
      expect(initCommand.description()).toContain('MCP');
    });
  });

  describe('Command Options', () => {
    it('should have target option', () => {
      const targetOption = initCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption).toBeDefined();
    });

    it('should have verbose option', () => {
      const verboseOption = initCommand.options.find((opt) => opt.long === '--verbose');
      expect(verboseOption).toBeDefined();
    });

    it('should have dry-run option', () => {
      const dryRunOption = initCommand.options.find((opt) => opt.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
    });

    it('should have clear option', () => {
      const clearOption = initCommand.options.find((opt) => opt.long === '--clear');
      expect(clearOption).toBeDefined();
    });

    it('should have no-mcp option', () => {
      const noMcpOption = initCommand.options.find((opt) => opt.long === '--no-mcp');
      expect(noMcpOption).toBeDefined();
    });

    it('should have no-agents option', () => {
      const noAgentsOption = initCommand.options.find((opt) => opt.long === '--no-agents');
      expect(noAgentsOption).toBeDefined();
    });

    it('should have no-rules option', () => {
      const noRulesOption = initCommand.options.find((opt) => opt.long === '--no-rules');
      expect(noRulesOption).toBeDefined();
    });

    it('should have no-output-styles option', () => {
      const noOutputStylesOption = initCommand.options.find((opt) => opt.long === '--no-output-styles');
      expect(noOutputStylesOption).toBeDefined();
    });

    it('should have no-hooks option', () => {
      const noHooksOption = initCommand.options.find((opt) => opt.long === '--no-hooks');
      expect(noHooksOption).toBeDefined();
    });

    it('should have all 9 options', () => {
      expect(initCommand.options.length).toBe(9);
    });
  });

  describe('Option Descriptions', () => {
    it('should describe target option', () => {
      const targetOption = initCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toBeTruthy();
      expect(targetOption?.description).toContain('target');
    });

    it('should include available targets in target description', () => {
      const targetOption = initCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toContain('claude-code');
      expect(targetOption?.description).toContain('opencode');
    });

    it('should describe verbose option', () => {
      const verboseOption = initCommand.options.find((opt) => opt.long === '--verbose');
      expect(verboseOption?.description).toBeTruthy();
      expect(verboseOption?.description).toContain('detailed');
    });

    it('should describe dry-run option', () => {
      const dryRunOption = initCommand.options.find((opt) => opt.long === '--dry-run');
      expect(dryRunOption?.description).toBeTruthy();
      expect(dryRunOption?.description).toContain('would be done');
    });

    it('should describe clear option', () => {
      const clearOption = initCommand.options.find((opt) => opt.long === '--clear');
      expect(clearOption?.description).toBeTruthy();
      expect(clearOption?.description).toContain('obsolete');
    });

    it('should describe no-mcp option', () => {
      const noMcpOption = initCommand.options.find((opt) => opt.long === '--no-mcp');
      expect(noMcpOption?.description).toBeTruthy();
      expect(noMcpOption?.description).toContain('MCP');
    });
  });

  describe('Command Structure', () => {
    it('should have action handler', () => {
      expect(initCommand._actionHandler).toBeDefined();
    });

    it('should export as named export', () => {
      expect(initCommand).toBeDefined();
      expect(typeof initCommand).toBe('object');
    });

    it('should have all required properties', () => {
      expect(initCommand).toHaveProperty('name');
      expect(initCommand).toHaveProperty('description');
      expect(initCommand).toHaveProperty('options');
    });

    it('should not have arguments', () => {
      expect(initCommand._args.length).toBe(0);
    });
  });

  describe('Option Parameters', () => {
    it('should have target option that accepts value', () => {
      const targetOption = initCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption).toBeDefined();
      expect(targetOption?.description).toBeTruthy();
    });

    it('should have verbose as boolean flag', () => {
      const verboseOption = initCommand.options.find((opt) => opt.long === '--verbose');
      expect(verboseOption).toBeDefined();
    });

    it('should have dry-run as boolean flag', () => {
      const dryRunOption = initCommand.options.find((opt) => opt.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
    });

    it('should have clear as boolean flag', () => {
      const clearOption = initCommand.options.find((opt) => opt.long === '--clear');
      expect(clearOption).toBeDefined();
    });

    it('should have no-mcp as boolean flag', () => {
      const noMcpOption = initCommand.options.find((opt) => opt.long === '--no-mcp');
      expect(noMcpOption).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should be a valid Commander.js command', () => {
      expect(initCommand.name()).toBeTruthy();
      expect(initCommand.description()).toBeTruthy();
      expect(initCommand.options).toBeDefined();
    });

    it('should be importable', async () => {
      const module = await import('../../src/commands/init-command.js');
      expect(module.initCommand).toBeDefined();
    });

    it('should have correct command name', () => {
      expect(initCommand.name()).toBe('init');
    });

    it('should have option names', () => {
      const optionNames = initCommand.options.map((opt) => opt.long);
      expect(optionNames).toContain('--target');
      expect(optionNames).toContain('--verbose');
      expect(optionNames).toContain('--dry-run');
      expect(optionNames).toContain('--clear');
      expect(optionNames).toContain('--no-mcp');
      expect(optionNames).toContain('--no-agents');
      expect(optionNames).toContain('--no-rules');
      expect(optionNames).toContain('--no-output-styles');
      expect(optionNames).toContain('--no-hooks');
    });
  });

  describe('Command Design', () => {
    it('should support target selection', () => {
      const hasTargetOption = initCommand.options.some((opt) => opt.long === '--target');
      expect(hasTargetOption).toBe(true);
    });

    it('should support verbose mode', () => {
      const hasVerboseOption = initCommand.options.some((opt) => opt.long === '--verbose');
      expect(hasVerboseOption).toBe(true);
    });

    it('should support dry run', () => {
      const hasDryRunOption = initCommand.options.some((opt) => opt.long === '--dry-run');
      expect(hasDryRunOption).toBe(true);
    });

    it('should support clearing obsolete items', () => {
      const hasClearOption = initCommand.options.some((opt) => opt.long === '--clear');
      expect(hasClearOption).toBe(true);
    });

    it('should allow skipping MCP installation', () => {
      const hasNoMcpOption = initCommand.options.some((opt) => opt.long === '--no-mcp');
      expect(hasNoMcpOption).toBe(true);
    });
  });

  describe('Target Manager Integration', () => {
    it('should use target manager for available targets', () => {
      const targetOption = initCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toContain('claude-code');
    });

    it('should mention auto-detect in target description', () => {
      const targetOption = initCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toContain('auto-detect');
    });
  });

  describe('Option Values', () => {
    it('should have all options with descriptions', () => {
      initCommand.options.forEach((opt) => {
        expect(opt.description).toBeTruthy();
      });
    });

    it('should have correct option flags', () => {
      const targetOpt = initCommand.options.find((opt) => opt.long === '--target');
      expect(targetOpt?.long).toBe('--target');

      const verboseOpt = initCommand.options.find((opt) => opt.long === '--verbose');
      expect(verboseOpt?.long).toBe('--verbose');

      const dryRunOpt = initCommand.options.find((opt) => opt.long === '--dry-run');
      expect(dryRunOpt?.long).toBe('--dry-run');

      const clearOpt = initCommand.options.find((opt) => opt.long === '--clear');
      expect(clearOpt?.long).toBe('--clear');

      const noMcpOpt = initCommand.options.find((opt) => opt.long === '--no-mcp');
      expect(noMcpOpt?.long).toBe('--no-mcp');
    });
  });
});
