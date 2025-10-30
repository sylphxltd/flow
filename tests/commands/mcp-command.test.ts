/**
 * MCP Command Tests
 * Tests for the MCP CLI command
 */

import { describe, expect, it, vi } from 'vitest';
import { mcpCommand } from '../../src/commands/mcp-command.js';

// Mock target manager
vi.mock('../../src/core/target-manager.js', () => {
  return {
    targetManager: {
      getImplementedTargetIDs: vi.fn().mockReturnValue(['claude-code', 'opencode']),
      resolveTarget: vi.fn().mockResolvedValue('claude-code'),
    },
  };
});

// Mock MCP service
vi.mock('../../src/services/mcp-service.js', () => {
  return {
    MCPService: vi.fn().mockImplementation(() => ({
      getAllServerIds: vi.fn().mockReturnValue(['server1', 'server2', 'server3']),
      getInstalledServerIds: vi.fn().mockReturnValue(['server1']),
      configureServer: vi.fn().mockResolvedValue({ ENV_VAR: 'value' }),
      installServers: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock MCP server registry
vi.mock('../../src/config/servers.js', () => {
  return {
    MCP_SERVER_REGISTRY: {
      server1: {
        name: 'Server 1',
        description: 'Test server 1',
        envVars: { API_KEY: { description: 'API key' } },
      },
      server2: {
        name: 'Server 2',
        description: 'Test server 2',
        envVars: {},
      },
      server3: {
        name: 'Server 3',
        description: 'Test server 3',
        envVars: {},
      },
    },
  };
});

// Mock target config
vi.mock('../../src/utils/target-config.js', () => {
  return {
    targetSupportsMCPServers: vi.fn().mockReturnValue(true),
    listMCPServersForTarget: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock MCP server start
vi.mock('../../src/servers/mcp-server.js', () => {
  return {
    startSylphxFlowMCPServer: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock inquirer
vi.mock('inquirer', () => {
  return {
    default: {
      prompt: vi.fn().mockResolvedValue({ server: 'server1' }),
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

describe('MCP Command', () => {
  describe('Main Command', () => {
    it('should register mcp command', () => {
      expect(mcpCommand.name()).toBe('mcp');
    });

    it('should have description', () => {
      expect(mcpCommand.description()).toBeTruthy();
      expect(mcpCommand.description()).toContain('MCP');
    });

    it('should mention Model Context Protocol', () => {
      const description = mcpCommand.description();
      expect(description).toContain('Model Context Protocol');
    });

    it('should have target option', () => {
      const targetOption = mcpCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption).toBeDefined();
    });

    it('should include available targets in target description', () => {
      const targetOption = mcpCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toContain('claude-code');
      expect(targetOption?.description).toContain('opencode');
    });

    it('should have 5 subcommands', () => {
      expect(mcpCommand.commands.length).toBe(5);
    });

    it('should register all subcommands', () => {
      const subcommands = mcpCommand.commands.map((cmd) => cmd.name());
      expect(subcommands).toContain('start');
      expect(subcommands).toContain('config');
      expect(subcommands).toContain('list');
      expect(subcommands).toContain('add');
      expect(subcommands).toContain('remove');
    });
  });

  describe('Start Subcommand', () => {
    it('should register start command', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      expect(startCmd).toBeDefined();
    });

    it('should have description', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      expect(startCmd?.description()).toBeTruthy();
      expect(startCmd?.description()).toContain('Start');
    });

    it('should have disable-memory option', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      const option = startCmd?.options.find((opt) => opt.long === '--disable-memory');
      expect(option).toBeDefined();
    });

    it('should have disable-time option', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      const option = startCmd?.options.find((opt) => opt.long === '--disable-time');
      expect(option).toBeDefined();
    });

    it('should have disable-project-startup option', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      const option = startCmd?.options.find((opt) => opt.long === '--disable-project-startup');
      expect(option).toBeDefined();
    });

    it('should have disable-knowledge option', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      const option = startCmd?.options.find((opt) => opt.long === '--disable-knowledge');
      expect(option).toBeDefined();
    });

    it('should have disable-codebase option', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      const option = startCmd?.options.find((opt) => opt.long === '--disable-codebase');
      expect(option).toBeDefined();
    });

    it('should have all 5 disable options', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      expect(startCmd?.options.length).toBe(5);
    });

    it('should describe all disable options', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      startCmd?.options.forEach((opt) => {
        expect(opt.description).toBeTruthy();
        expect(opt.description).toContain('Disable');
      });
    });
  });

  describe('Config Subcommand', () => {
    it('should register config command', () => {
      const configCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'config');
      expect(configCmd).toBeDefined();
    });

    it('should have description', () => {
      const configCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'config');
      expect(configCmd?.description()).toBeTruthy();
      expect(configCmd?.description()).toContain('Configure');
    });

    it('should have server option', () => {
      const configCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'config');
      const serverOption = configCmd?.options.find((opt) => opt.long === '--server');
      expect(serverOption).toBeDefined();
    });

    it('should describe server option', () => {
      const configCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'config');
      const serverOption = configCmd?.options.find((opt) => opt.long === '--server');
      expect(serverOption?.description).toBeTruthy();
      expect(serverOption?.description).toContain('server');
    });

    it('should have 1 option', () => {
      const configCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'config');
      expect(configCmd?.options.length).toBe(1);
    });

    it('should not have arguments', () => {
      const configCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'config');
      expect(configCmd?._args.length).toBe(0);
    });
  });

  describe('List Subcommand', () => {
    it('should register list command', () => {
      const listCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should have description', () => {
      const listCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'list');
      expect(listCmd?.description()).toBeTruthy();
      expect(listCmd?.description()).toContain('List');
    });

    it('should not have arguments', () => {
      const listCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'list');
      expect(listCmd?._args.length).toBe(0);
    });

    it('should not have options', () => {
      const listCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'list');
      expect(listCmd?.options.length).toBe(0);
    });

    it('should have action handler', () => {
      const listCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'list');
      expect(listCmd?._actionHandler).toBeDefined();
    });
  });

  describe('Add Subcommand', () => {
    it('should register add command', () => {
      const addCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'add');
      expect(addCmd).toBeDefined();
    });

    it('should have description', () => {
      const addCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'add');
      expect(addCmd?.description()).toBeTruthy();
      expect(addCmd?.description()).toContain('Add');
    });

    it('should require servers argument', () => {
      const addCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'add');
      expect(addCmd?._args.length).toBeGreaterThan(0);
      expect(addCmd?._args[0].name()).toBe('servers');
    });

    it('should describe servers argument', () => {
      const addCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'add');
      const serversArg = addCmd?._args[0];
      expect(serversArg?.description).toBeTruthy();
      expect(serversArg?.description).toContain('Server names');
    });

    it('should support variadic servers argument', () => {
      const addCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'add');
      const serversArg = addCmd?._args[0];
      expect(serversArg?.variadic).toBe(true);
    });

    it('should not have options', () => {
      const addCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'add');
      expect(addCmd?.options.length).toBe(0);
    });
  });

  describe('Remove Subcommand', () => {
    it('should register remove command', () => {
      const removeCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'remove');
      expect(removeCmd).toBeDefined();
    });

    it('should have description', () => {
      const removeCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'remove');
      expect(removeCmd?.description()).toBeTruthy();
      expect(removeCmd?.description()).toContain('Remove');
    });

    it('should require servers argument', () => {
      const removeCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'remove');
      expect(removeCmd?._args.length).toBeGreaterThan(0);
      expect(removeCmd?._args[0].name()).toBe('servers');
    });

    it('should describe servers argument', () => {
      const removeCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'remove');
      const serversArg = removeCmd?._args[0];
      expect(serversArg?.description).toBeTruthy();
      expect(serversArg?.description).toContain('Server names');
    });

    it('should support variadic servers argument', () => {
      const removeCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'remove');
      const serversArg = removeCmd?._args[0];
      expect(serversArg?.variadic).toBe(true);
    });

    it('should not have options', () => {
      const removeCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'remove');
      expect(removeCmd?.options.length).toBe(0);
    });
  });

  describe('Command Structure', () => {
    it('should have all required properties', () => {
      expect(mcpCommand).toHaveProperty('name');
      expect(mcpCommand).toHaveProperty('description');
      expect(mcpCommand).toHaveProperty('commands');
      expect(mcpCommand).toHaveProperty('options');
    });

    it('should export as named export', () => {
      expect(mcpCommand).toBeDefined();
      expect(typeof mcpCommand).toBe('object');
    });

    it('should have action handlers for all subcommands', () => {
      mcpCommand.commands.forEach((cmd) => {
        expect(cmd._actionHandler).toBeDefined();
      });
    });

    it('should have descriptions for all subcommands', () => {
      mcpCommand.commands.forEach((cmd) => {
        expect(cmd.description()).toBeTruthy();
      });
    });
  });

  describe('Integration', () => {
    it('should be a valid Commander.js command', () => {
      expect(mcpCommand.name()).toBeTruthy();
      expect(mcpCommand.description()).toBeTruthy();
      expect(mcpCommand.commands).toBeDefined();
    });

    it('should be importable', async () => {
      const module = await import('../../src/commands/mcp-command.js');
      expect(module.mcpCommand).toBeDefined();
    });

    it('should have correct command name', () => {
      expect(mcpCommand.name()).toBe('mcp');
    });

    it('should have subcommand names', () => {
      const subcommandNames = mcpCommand.commands.map((cmd) => cmd.name());
      expect(subcommandNames).toContain('start');
      expect(subcommandNames).toContain('config');
      expect(subcommandNames).toContain('list');
      expect(subcommandNames).toContain('add');
      expect(subcommandNames).toContain('remove');
    });
  });

  describe('Command Design', () => {
    it('should support starting MCP server', () => {
      const hasStartCommand = mcpCommand.commands.some((cmd) => cmd.name() === 'start');
      expect(hasStartCommand).toBe(true);
    });

    it('should support configuring servers', () => {
      const hasConfigCommand = mcpCommand.commands.some((cmd) => cmd.name() === 'config');
      expect(hasConfigCommand).toBe(true);
    });

    it('should support listing servers', () => {
      const hasListCommand = mcpCommand.commands.some((cmd) => cmd.name() === 'list');
      expect(hasListCommand).toBe(true);
    });

    it('should support adding servers', () => {
      const hasAddCommand = mcpCommand.commands.some((cmd) => cmd.name() === 'add');
      expect(hasAddCommand).toBe(true);
    });

    it('should support removing servers', () => {
      const hasRemoveCommand = mcpCommand.commands.some((cmd) => cmd.name() === 'remove');
      expect(hasRemoveCommand).toBe(true);
    });

    it('should allow disabling features on start', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      const disableOptions = startCmd?.options.filter((opt) => opt.long?.startsWith('--disable-'));
      expect(disableOptions?.length).toBe(5);
    });
  });

  describe('Subcommand Validation', () => {
    it('should validate start command structure', () => {
      const startCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'start');
      expect(startCmd?.name()).toBe('start');
      expect(startCmd?._args.length).toBe(0);
      expect(startCmd?.options.length).toBe(5);
    });

    it('should validate config command structure', () => {
      const configCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'config');
      expect(configCmd?.name()).toBe('config');
      expect(configCmd?._args.length).toBe(0);
      expect(configCmd?.options.length).toBe(1);
    });

    it('should validate list command structure', () => {
      const listCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'list');
      expect(listCmd?.name()).toBe('list');
      expect(listCmd?._args.length).toBe(0);
      expect(listCmd?.options.length).toBe(0);
    });

    it('should validate add command structure', () => {
      const addCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'add');
      expect(addCmd?.name()).toBe('add');
      expect(addCmd?._args.length).toBe(1);
      expect(addCmd?.options.length).toBe(0);
    });

    it('should validate remove command structure', () => {
      const removeCmd = mcpCommand.commands.find((cmd) => cmd.name() === 'remove');
      expect(removeCmd?.name()).toBe('remove');
      expect(removeCmd?._args.length).toBe(1);
      expect(removeCmd?.options.length).toBe(0);
    });
  });

  describe('Target Manager Integration', () => {
    it('should use target manager for available targets', () => {
      const targetOption = mcpCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toContain('claude-code');
    });

    it('should mention auto-detect in target description', () => {
      const targetOption = mcpCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toContain('auto-detect');
    });
  });
});
