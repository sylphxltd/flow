import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

    const { targetManager } = await import('../src/core/target-manager.js');
    (targetManager.getTargetDefinition as any).mockReturnValue(mockTargetDefinition);
    (targetManager.getTransformer as any).mockResolvedValue(mockTransformer);
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
        'test-target',
        'unknown-server' as any
      );

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('❌ Unknown MCP server: unknown-server');
    });

    it('should return true for servers that require no keys', async () => {
      const { configureMCPServerForTarget } = await import('../src/utils/target-config.js');

      // Mock no existing server
      mockTransformer.readConfig.mockResolvedValue({});

      const result = await configureMCPServerForTarget('/test/cwd', 'test-target', 'grep' as any);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('ℹ️  grep does not require any API keys');
    });

    it('should handle servers with only optional keys when no keys provided', async () => {
      const { configureMCPServerForTarget } = await import('../src/utils/target-config.js');

      // Mock no existing server
      mockTransformer.readConfig.mockResolvedValue({});

      // Mock the readline module to return empty input immediately
      vi.doMock('node:readline', () => ({
        createInterface: vi.fn(() => ({
          question: vi.fn((prompt: string, callback: (answer: string) => void) => {
            setImmediate(() => callback(''));
          }),
          close: vi.fn(),
        })),
      }));

      const result = await configureMCPServerForTarget(
        '/test/cwd',
        'test-target',
        'context7' as any
      );

      expect(result).toBe(false); // Should skip when no optional keys provided
      expect(mockTransformer.writeConfig).not.toHaveBeenCalled();
    });
  });
});
