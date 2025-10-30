import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock readline before importing the module that uses it
vi.mock('node:readline', () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn((_prompt: string, callback: (answer: string) => void) => {
      setImmediate(() => callback(''));
    }),
    close: vi.fn(),
  })),
}));

// Mock the target manager module
vi.mock('../src/core/target-manager.js', () => ({
  targetManager: {
    getTarget: vi.fn(),
    getAllTargets: vi.fn(),
    getImplementedTargets: vi.fn(),
    resolveTarget: vi.fn(),
  },
}));

import { targetManager } from '../src/core/target-manager.js';
import { configureMCPServerForTarget } from '../src/utils/target-config.js';

const mockGetTarget = targetManager.getTarget as ReturnType<typeof vi.fn>;
const mockGetAllTargets = targetManager.getAllTargets as ReturnType<typeof vi.fn>;
const mockGetImplementedTargets = targetManager.getImplementedTargets as ReturnType<typeof vi.fn>;
const mockResolveTarget = targetManager.resolveTarget as ReturnType<typeof vi.fn>;

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('MCP Configuration Tests', () => {
  let mockTargetDefinition: any;
  let _mockTransformer: any;

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
        installation: {
          createAgentDir: true,
          createConfigFile: true,
          useSecretFiles: true,
        },
      },
      readConfig: vi.fn().mockResolvedValue({ mcpServers: {} }),
      writeConfig: vi.fn().mockResolvedValue(undefined),
      transformMCPConfig: vi.fn((config: any) => config),
      setupMCP: vi.fn().mockResolvedValue({ count: 1 }),
    };

    mockGetTarget.mockReturnValue(mockTargetDefinition);
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('configureMCPServerForTarget', () => {
    it('should return false for unknown server', async () => {
      const result = await configureMCPServerForTarget(
        '/test/cwd',
        'test-target',
        'unknown-server' as any
      );

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('✗ Unknown MCP server: unknown-server');
    });

    it('should return true for servers that require no keys', async () => {
      // Mock no existing server
      mockTargetDefinition.readConfig.mockResolvedValue({});

      const result = await configureMCPServerForTarget('/test/cwd', 'test-target', 'grep' as any);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('ℹ️  grep does not require any API keys');
    });

    it('should install servers with only optional keys even when no keys provided', async () => {
      // Mock no existing server
      mockTargetDefinition.readConfig.mockResolvedValue({});

      // Mock readline is already set up at the top level

      const result = await configureMCPServerForTarget(
        '/test/cwd',
        'test-target',
        'context7' as any
      );

      expect(result).toBe(true); // Should install even when no optional keys provided
      expect(mockTargetDefinition.writeConfig).toHaveBeenCalled();
    });
  });
});
