import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MCPServerID } from '../src/config/servers.js';
import { Target } from '../src/types.js';

// Mock the target manager
vi.mock('../src/core/target-manager.js', () => ({
  targetManager: {
    getTarget: vi.fn(),
  },
}));

// Import after mocking
import { targetManager } from '../src/core/target-manager.js';
import { configureMCPServerForTarget } from '../src/utils/target-config.js';

// Mock secret utils
vi.mock('../src/utils/secret-utils.js', () => ({
  secretUtils: {
    convertSecretsToFileReferences: vi.fn().mockResolvedValue({}),
    addToGitignore: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock readline for user input
vi.mock('node:readline', () => ({
  createInterface: vi.fn().mockReturnValue({
    question: vi.fn((prompt, callback) => {
      // Simulate user pressing Enter (no input)
      callback('');
    }),
    close: vi.fn(),
  }),
}));

// Create a mock target class
class MockTarget extends Target {
  readConfig = vi.fn().mockResolvedValue({});
  writeConfig = vi.fn().mockResolvedValue(undefined);
  transformMCPConfig = vi.fn((config) => config);
  getHelpText = vi.fn().mockReturnValue('Test help');
  validateRequirements = vi.fn().mockResolvedValue(undefined);
  getConfigPath = vi.fn().mockResolvedValue('.claude/settings.local.json');
  transformAgentContent = vi.fn().mockResolvedValue('test');

  constructor() {
    super(
      'opencode',
      'OpenCode',
      'Test OpenCode target',
      {
        agentDir: '.claude/agents',
        agentExtension: '.md',
        agentFormat: 'yaml-frontmatter',
        stripYaml: true,
        flatten: false,
        configFile: '.claude/settings.local.json',
        configSchema: null,
        mcpConfigPath: 'enabledMcpjsonServers',
        installation: {
          createAgentDir: true,
          createConfigFile: true,
          supportedMcpServers: true,
          useSecretFiles: true,
        },
      },
      'ide',
      true,
      true
    );
  }
}

describe('MCP Required Environment Variables', () => {
  const mockTarget = new MockTarget();

  beforeEach(() => {
    vi.clearAllMocks();
    (targetManager.getTarget as any).mockReturnValue(mockTarget);
  });

  it('should skip gemini-google-search when GEMINI_API_KEY is not provided', async () => {
    // Mock that server is not installed
    (mockTarget.readConfig as any).mockResolvedValue({
      enabledMcpjsonServers: [],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await configureMCPServerForTarget(
      process.cwd(),
      'opencode',
      'gemini-search' as MCPServerID
    );

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping gemini-google-search')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('required API keys not provided')
    );

    consoleSpy.mockRestore();
  });

  it('should install servers without required environment variables', async () => {
    // Mock that server is not installed
    (mockTarget.readConfig as any).mockResolvedValue({
      enabledMcpjsonServers: [],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await configureMCPServerForTarget(
      process.cwd(),
      'opencode',
      'grep' as MCPServerID
    );

    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('does not require any API keys')
    );

    consoleSpy.mockRestore();
  });

  it('should keep existing server with valid API keys when user provides no input', async () => {
    // Mock that server is already installed with valid API key
    (mockTarget.readConfig as any).mockResolvedValue({
      enabledMcpjsonServers: {
        'gemini-google-search': {
          type: 'local',
          command: ['npx', '-y', 'mcp-gemini-google-search'],
          environment: {
            GEMINI_API_KEY: 'valid-key-123',
            GEMINI_MODEL: 'gemini-2.5-flash',
          },
        },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await configureMCPServerForTarget(
      process.cwd(),
      'opencode',
      'gemini-search' as MCPServerID
    );

    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Keeping gemini-google-search')
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('existing API keys are valid'));

    consoleSpy.mockRestore();
  });

  it('should remove existing server with invalid API keys when user provides no input', async () => {
    // Mock that server is already installed but with empty API key
    (mockTarget.readConfig as any).mockResolvedValue({
      enabledMcpjsonServers: {
        'gemini-google-search': {
          type: 'local',
          command: ['npx', '-y', 'mcp-gemini-google-search'],
          environment: {
            GEMINI_API_KEY: '', // Empty key
            GEMINI_MODEL: 'gemini-2.5-flash',
          },
        },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await configureMCPServerForTarget(
      process.cwd(),
      'opencode',
      'gemini-search' as MCPServerID
    );

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Removing gemini-google-search')
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('no API keys provided'));

    // Verify that writeConfig was called to remove the server
    expect(mockTarget.writeConfig).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
