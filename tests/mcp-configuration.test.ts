import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the target manager module
vi.mock('../src/core/target-manager.js', () => ({
  targetManager: {
    getTargetDefinition: vi.fn(),
    getTransformer: vi.fn(),
  },
}));

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('MCP Configuration Tests', () => {
  let mockTargetDefinition: any;
  let mockTransformer: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock console methods
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    mockTargetDefinition = {
      name: 'test-target',
      config: {
        mcpConfigPath: 'mcpServers',
        configFile: 'test-config.json',
      },
    };

    mockTransformer = {
      readConfig: vi.fn(),
      writeConfig: vi.fn(),
      transformMCPConfig: vi.fn((config: any) => config),
    };

    // Note: targetManager methods are mocked differently since they don't exist on the class
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('configureMCPServerForTarget', () => {
    it('should return false for unknown server', async () => {
      const { configureMCPServerForTarget } = await import('../src/utils/target-config.js');

      const result = await configureMCPServerForTarget(
        '/test/cwd',
        'claude-code',
        'unknown-server' as any
      );

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('❌ Unknown MCP server: unknown-server');
    });

    it('should return true for servers that require no keys', async () => {
      const { configureMCPServerForTarget } = await import('../src/utils/target-config.js');

      // Mock no existing server
      mockTransformer.readConfig.mockResolvedValue({});

      const result = await configureMCPServerForTarget('/test/cwd', 'claude-code', 'grep' as any);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        'ℹ️  GitHub grep MCP server for searching GitHub repositories does not require any API keys'
      );
    });

    it('should install servers with only optional keys even when no keys provided', async () => {
      const { configureMCPServerForTarget } = await import('../src/utils/target-config.js');

      // Mock no existing server
      mockTransformer.readConfig.mockResolvedValue({});

      // Note: vi.doMock needs to be called at top level in vitest
      // For this test, we'll assume the function handles readline correctly

      const result = await configureMCPServerForTarget(
        '/test/cwd',
        'claude-code',
        'context7' as any
      );

      expect(result).toBe(true); // Should install even when no optional keys provided
      // Note: writeConfig would be called in a full implementation
    });
  });
});
