/**
 * Memory Command Tests
 * Tests for the memory CLI command
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { memoryCommand } from '../../src/commands/memory-command.js';

// Mock the storage
vi.mock('../../src/services/storage/separated-storage.js', () => {
  return {
    SeparatedMemoryStorage: vi.fn().mockImplementation(() => ({
      getAll: vi.fn().mockResolvedValue([
        {
          key: 'test-key-1',
          value: 'test-value-1',
          namespace: 'default',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          timestamp: 1704067200000,
        },
        {
          key: 'test-key-2',
          value: 'test-value-2',
          namespace: 'custom',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          timestamp: 1704067200000,
        },
      ]),
      search: vi.fn().mockResolvedValue([
        {
          key: 'search-result',
          value: 'found-value',
          namespace: 'default',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          timestamp: 1704067200000,
        },
      ]),
      get: vi.fn().mockResolvedValue({
        key: 'test-key',
        value: { data: 'test' },
        namespace: 'default',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        timestamp: 1704067200000,
      }),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
      clear: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({
        totalEntries: 10,
        namespaces: ['default', 'custom'],
      }),
    })),
  };
});

// Mock CLI output
vi.mock('../../src/utils/cli-output.js', () => {
  return {
    cli: {
      listSummary: vi.fn(),
      emptyState: vi.fn(),
      memoryEntry: vi.fn(),
      searchSummary: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      list: vi.fn(),
    },
  };
});

// Mock error handler
vi.mock('../../src/utils/error-handler.js', () => {
  return {
    CLIError: class CLIError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CLIError';
      }
    },
  };
});

// Suppress console output during tests
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  vi.clearAllMocks();
});

describe('Memory Command', () => {
  describe('Command Registration', () => {
    it('should register memory command', () => {
      expect(memoryCommand.name()).toBe('memory');
      expect(memoryCommand.description()).toContain('Manage memory storage');
    });

    it('should have target option', () => {
      const targetOption = memoryCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption).toBeDefined();
    });

    it('should register all subcommands', () => {
      const subcommands = memoryCommand.commands.map((cmd) => cmd.name());
      expect(subcommands).toContain('list');
      expect(subcommands).toContain('search');
      expect(subcommands).toContain('delete');
      expect(subcommands).toContain('clear');
      expect(subcommands).toContain('stats');
      expect(subcommands).toContain('get');
      expect(subcommands).toContain('set');
    });
  });

  describe('List Subcommand', () => {
    it('should register list command', () => {
      const listCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'list');
      expect(listCmd).toBeDefined();
      expect(listCmd?.description()).toContain('List memory entries');
    });

    it('should have namespace option', () => {
      const listCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'list');
      const namespaceOpt = listCmd?.options.find((opt) => opt.long === '--namespace');
      expect(namespaceOpt).toBeDefined();
    });

    it('should have limit option', () => {
      const listCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'list');
      const limitOpt = listCmd?.options.find((opt) => opt.long === '--limit');
      expect(limitOpt).toBeDefined();
    });
  });

  describe('Search Subcommand', () => {
    it('should register search command', () => {
      const searchCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'search');
      expect(searchCmd).toBeDefined();
      expect(searchCmd?.description()).toContain('Search memory entries');
    });

    it('should require pattern argument', () => {
      const searchCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'search');
      expect(searchCmd?._args.length).toBeGreaterThan(0);
      expect(searchCmd?._args[0].name()).toBe('pattern');
    });

    it('should have namespace option', () => {
      const searchCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'search');
      const namespaceOpt = searchCmd?.options.find((opt) => opt.long === '--namespace');
      expect(namespaceOpt).toBeDefined();
    });
  });

  describe('Delete Subcommand', () => {
    it('should register delete command', () => {
      const deleteCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'delete');
      expect(deleteCmd).toBeDefined();
      expect(deleteCmd?.description()).toContain('Delete memory entry');
    });

    it('should require key argument', () => {
      const deleteCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'delete');
      expect(deleteCmd?._args.length).toBeGreaterThan(0);
      expect(deleteCmd?._args[0].name()).toBe('key');
    });

    it('should have namespace option with default', () => {
      const deleteCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'delete');
      const namespaceOpt = deleteCmd?.options.find((opt) => opt.long === '--namespace');
      expect(namespaceOpt).toBeDefined();
      expect(namespaceOpt?.defaultValue).toBe('default');
    });
  });

  describe('Clear Subcommand', () => {
    it('should register clear command', () => {
      const clearCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'clear');
      expect(clearCmd).toBeDefined();
      expect(clearCmd?.description()).toContain('Clear memory entries');
    });

    it('should have namespace option', () => {
      const clearCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'clear');
      const namespaceOpt = clearCmd?.options.find((opt) => opt.long === '--namespace');
      expect(namespaceOpt).toBeDefined();
    });

    it('should have confirm option', () => {
      const clearCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'clear');
      const confirmOpt = clearCmd?.options.find((opt) => opt.long === '--confirm');
      expect(confirmOpt).toBeDefined();
    });
  });

  describe('Stats Subcommand', () => {
    it('should register stats command', () => {
      const statsCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'stats');
      expect(statsCmd).toBeDefined();
      expect(statsCmd?.description()).toContain('Show memory statistics');
    });

    it('should have namespace option', () => {
      const statsCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'stats');
      const namespaceOpt = statsCmd?.options.find((opt) => opt.long === '--namespace');
      expect(namespaceOpt).toBeDefined();
    });
  });

  describe('Get Subcommand', () => {
    it('should register get command', () => {
      const getCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'get');
      expect(getCmd).toBeDefined();
      expect(getCmd?.description()).toContain('Get memory entry');
    });

    it('should require key argument', () => {
      const getCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'get');
      expect(getCmd?._args.length).toBeGreaterThan(0);
      expect(getCmd?._args[0].name()).toBe('key');
    });

    it('should have namespace option with default', () => {
      const getCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'get');
      const namespaceOpt = getCmd?.options.find((opt) => opt.long === '--namespace');
      expect(namespaceOpt).toBeDefined();
      expect(namespaceOpt?.defaultValue).toBe('default');
    });
  });

  describe('Set Subcommand', () => {
    it('should register set command', () => {
      const setCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'set');
      expect(setCmd).toBeDefined();
      expect(setCmd?.description()).toContain('Set memory entry');
    });

    it('should require key and value arguments', () => {
      const setCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'set');
      expect(setCmd?._args.length).toBeGreaterThanOrEqual(2);
      expect(setCmd?._args[0].name()).toBe('key');
      expect(setCmd?._args[1].name()).toBe('value');
    });

    it('should have namespace option with default', () => {
      const setCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'set');
      const namespaceOpt = setCmd?.options.find((opt) => opt.long === '--namespace');
      expect(namespaceOpt).toBeDefined();
      expect(namespaceOpt?.defaultValue).toBe('default');
    });
  });

  describe('Command Structure', () => {
    it('should have correct number of subcommands', () => {
      expect(memoryCommand.commands.length).toBe(7);
    });

    it('should have action handlers for all subcommands', () => {
      memoryCommand.commands.forEach((cmd) => {
        expect(cmd._actionHandler).toBeDefined();
      });
    });

    it('should have descriptions for all subcommands', () => {
      memoryCommand.commands.forEach((cmd) => {
        expect(cmd.description()).toBeTruthy();
      });
    });
  });

  describe('Option Defaults', () => {
    it('should have correct default for list namespace', () => {
      const listCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'list');
      const namespaceOpt = listCmd?.options.find((opt) => opt.long === '--namespace');
      expect(namespaceOpt?.defaultValue).toBe('all');
    });

    it('should have correct default for list limit', () => {
      const listCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'list');
      const limitOpt = listCmd?.options.find((opt) => opt.long === '--limit');
      expect(limitOpt?.defaultValue).toBe('50');
    });

    it('should have correct default for search namespace', () => {
      const searchCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'search');
      const namespaceOpt = searchCmd?.options.find((opt) => opt.long === '--namespace');
      expect(namespaceOpt?.defaultValue).toBe('all');
    });
  });

  describe('Command Validation', () => {
    it('should validate list command structure', () => {
      const listCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'list');
      expect(listCmd?.name()).toBe('list');
      expect(listCmd?.options.length).toBe(2); // namespace and limit
    });

    it('should validate search command structure', () => {
      const searchCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'search');
      expect(searchCmd?.name()).toBe('search');
      expect(searchCmd?._args.length).toBe(1); // pattern
      expect(searchCmd?.options.length).toBe(1); // namespace
    });

    it('should validate delete command structure', () => {
      const deleteCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'delete');
      expect(deleteCmd?.name()).toBe('delete');
      expect(deleteCmd?._args.length).toBe(1); // key
      expect(deleteCmd?.options.length).toBe(1); // namespace
    });

    it('should validate clear command structure', () => {
      const clearCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'clear');
      expect(clearCmd?.name()).toBe('clear');
      expect(clearCmd?.options.length).toBe(2); // namespace and confirm
    });

    it('should validate get command structure', () => {
      const getCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'get');
      expect(getCmd?.name()).toBe('get');
      expect(getCmd?._args.length).toBe(1); // key
      expect(getCmd?.options.length).toBe(1); // namespace
    });

    it('should validate set command structure', () => {
      const setCmd = memoryCommand.commands.find((cmd) => cmd.name() === 'set');
      expect(setCmd?.name()).toBe('set');
      expect(setCmd?._args.length).toBe(2); // key and value
      expect(setCmd?.options.length).toBe(1); // namespace
    });
  });

  describe('Integration', () => {
    it('should be a valid Commander.js command', () => {
      expect(memoryCommand.name()).toBeTruthy();
      expect(memoryCommand.description()).toBeTruthy();
      expect(memoryCommand.commands).toBeDefined();
    });

    it('should have all required properties', () => {
      expect(memoryCommand).toHaveProperty('name');
      expect(memoryCommand).toHaveProperty('description');
      expect(memoryCommand).toHaveProperty('commands');
      expect(memoryCommand).toHaveProperty('options');
    });

    it('should export as named export', () => {
      expect(memoryCommand).toBeDefined();
      expect(typeof memoryCommand).toBe('object');
    });
  });
});
