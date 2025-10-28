/**
 * Codebase Command Tests
 * Tests for the codebase CLI command
 */

import { describe, expect, it, vi } from 'vitest';
import {
  codebaseCommand,
  codebaseSearchCommand,
  codebaseReindexCommand,
  codebaseStatusCommand,
} from '../../src/commands/codebase-command.js';

// Mock search service
vi.mock('../../src/services/search/unified-search-service.js', () => {
  return {
    searchService: {
      initialize: vi.fn().mockResolvedValue(undefined),
      searchCodebase: vi.fn().mockResolvedValue({
        results: [],
        totalIndexed: 100,
      }),
      formatResultsForCLI: vi.fn().mockReturnValue('Search results'),
      getStatus: vi.fn().mockResolvedValue({
        codebase: {
          indexed: true,
          fileCount: 100,
          indexedAt: new Date().toISOString(),
        },
      }),
    },
  };
});

// Mock codebase indexer
vi.mock('../../src/services/search/codebase-indexer.js', () => {
  return {
    CodebaseIndexer: vi.fn().mockImplementation(() => ({
      indexCodebase: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock embeddings
vi.mock('../../src/services/search/embeddings.js', () => {
  return {
    getDefaultEmbeddingProvider: vi.fn().mockResolvedValue({
      embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    }),
  };
});

// Mock ora spinner
vi.mock('ora', () => {
  return {
    default: vi.fn().mockReturnValue({
      start: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
    }),
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

describe('Codebase Command', () => {
  describe('Main Command', () => {
    it('should register codebase command', () => {
      expect(codebaseCommand.name()).toBe('codebase');
    });

    it('should have description', () => {
      expect(codebaseCommand.description()).toBeTruthy();
      expect(codebaseCommand.description()).toContain('codebase');
    });

    it('should have 3 subcommands', () => {
      expect(codebaseCommand.commands.length).toBe(3);
    });

    it('should register all subcommands', () => {
      const subcommands = codebaseCommand.commands.map((cmd) => cmd.name());
      expect(subcommands).toContain('search');
      expect(subcommands).toContain('reindex');
      expect(subcommands).toContain('status');
    });
  });

  describe('Search Subcommand', () => {
    it('should register search command', () => {
      expect(codebaseSearchCommand.name()).toBe('search');
    });

    it('should have description', () => {
      expect(codebaseSearchCommand.description()).toBeTruthy();
      expect(codebaseSearchCommand.description()).toContain('Search');
    });

    it('should require query argument', () => {
      expect(codebaseSearchCommand._args.length).toBe(1);
      expect(codebaseSearchCommand._args[0].name()).toBe('query');
    });

    it('should have limit option', () => {
      const limitOption = codebaseSearchCommand.options.find((opt) => opt.long === '--limit');
      expect(limitOption).toBeDefined();
    });

    it('should have include-content option', () => {
      const includeContentOption = codebaseSearchCommand.options.find(
        (opt) => opt.long === '--include-content'
      );
      expect(includeContentOption).toBeDefined();
    });

    it('should have extensions option', () => {
      const extensionsOption = codebaseSearchCommand.options.find(
        (opt) => opt.long === '--extensions'
      );
      expect(extensionsOption).toBeDefined();
    });

    it('should have path option', () => {
      const pathOption = codebaseSearchCommand.options.find((opt) => opt.long === '--path');
      expect(pathOption).toBeDefined();
    });

    it('should have exclude option', () => {
      const excludeOption = codebaseSearchCommand.options.find((opt) => opt.long === '--exclude');
      expect(excludeOption).toBeDefined();
    });

    it('should have all 5 options', () => {
      expect(codebaseSearchCommand.options.length).toBe(5);
    });

    it('should have default limit of 10', () => {
      const limitOption = codebaseSearchCommand.options.find((opt) => opt.long === '--limit');
      expect(limitOption?.defaultValue).toBe('10');
    });

    it('should include content by default', () => {
      const includeContentOption = codebaseSearchCommand.options.find(
        (opt) => opt.long === '--include-content'
      );
      expect(includeContentOption?.defaultValue).toBe(true);
    });

    it('should describe query argument', () => {
      const queryArg = codebaseSearchCommand._args[0];
      expect(queryArg.description).toBeTruthy();
      expect(queryArg.description).toContain('query');
    });

    it('should mention natural language in query description', () => {
      const queryArg = codebaseSearchCommand._args[0];
      expect(queryArg.description).toContain('natural language');
    });
  });

  describe('Reindex Subcommand', () => {
    it('should register reindex command', () => {
      expect(codebaseReindexCommand.name()).toBe('reindex');
    });

    it('should have description', () => {
      expect(codebaseReindexCommand.description()).toBeTruthy();
      expect(codebaseReindexCommand.description()).toContain('Reindex');
    });

    it('should not have arguments', () => {
      expect(codebaseReindexCommand._args.length).toBe(0);
    });

    it('should not have options', () => {
      expect(codebaseReindexCommand.options.length).toBe(0);
    });

    it('should have action handler', () => {
      expect(codebaseReindexCommand._actionHandler).toBeDefined();
    });
  });

  describe('Status Subcommand', () => {
    it('should register status command', () => {
      expect(codebaseStatusCommand.name()).toBe('status');
    });

    it('should have description', () => {
      expect(codebaseStatusCommand.description()).toBeTruthy();
      expect(codebaseStatusCommand.description()).toContain('status');
    });

    it('should not have arguments', () => {
      expect(codebaseStatusCommand._args.length).toBe(0);
    });

    it('should not have options', () => {
      expect(codebaseStatusCommand.options.length).toBe(0);
    });

    it('should have action handler', () => {
      expect(codebaseStatusCommand._actionHandler).toBeDefined();
    });
  });

  describe('Command Structure', () => {
    it('should have all required properties', () => {
      expect(codebaseCommand).toHaveProperty('name');
      expect(codebaseCommand).toHaveProperty('description');
      expect(codebaseCommand).toHaveProperty('commands');
    });

    it('should export as named exports', () => {
      expect(codebaseCommand).toBeDefined();
      expect(codebaseSearchCommand).toBeDefined();
      expect(codebaseReindexCommand).toBeDefined();
      expect(codebaseStatusCommand).toBeDefined();
    });

    it('should have action handlers for all subcommands', () => {
      codebaseCommand.commands.forEach((cmd) => {
        expect(cmd._actionHandler).toBeDefined();
      });
    });

    it('should have descriptions for all subcommands', () => {
      codebaseCommand.commands.forEach((cmd) => {
        expect(cmd.description()).toBeTruthy();
      });
    });
  });

  describe('Option Descriptions', () => {
    it('should describe limit option', () => {
      const limitOption = codebaseSearchCommand.options.find((opt) => opt.long === '--limit');
      expect(limitOption?.description).toBeTruthy();
      expect(limitOption?.description).toContain('number of results');
    });

    it('should describe include-content option', () => {
      const includeContentOption = codebaseSearchCommand.options.find(
        (opt) => opt.long === '--include-content'
      );
      expect(includeContentOption?.description).toBeTruthy();
      expect(includeContentOption?.description).toContain('content');
    });

    it('should describe extensions option', () => {
      const extensionsOption = codebaseSearchCommand.options.find(
        (opt) => opt.long === '--extensions'
      );
      expect(extensionsOption?.description).toBeTruthy();
      expect(extensionsOption?.description).toContain('extension');
    });

    it('should describe path option', () => {
      const pathOption = codebaseSearchCommand.options.find((opt) => opt.long === '--path');
      expect(pathOption?.description).toBeTruthy();
      expect(pathOption?.description).toContain('path');
    });

    it('should describe exclude option', () => {
      const excludeOption = codebaseSearchCommand.options.find((opt) => opt.long === '--exclude');
      expect(excludeOption?.description).toBeTruthy();
      expect(excludeOption?.description).toContain('Exclude');
    });
  });

  describe('Integration', () => {
    it('should be a valid Commander.js command', () => {
      expect(codebaseCommand.name()).toBeTruthy();
      expect(codebaseCommand.description()).toBeTruthy();
      expect(codebaseCommand.commands).toBeDefined();
    });

    it('should be importable', async () => {
      const module = await import('../../src/commands/codebase-command.js');
      expect(module.codebaseCommand).toBeDefined();
      expect(module.codebaseSearchCommand).toBeDefined();
      expect(module.codebaseReindexCommand).toBeDefined();
      expect(module.codebaseStatusCommand).toBeDefined();
    });

    it('should have correct command name', () => {
      expect(codebaseCommand.name()).toBe('codebase');
    });

    it('should have subcommand names', () => {
      const subcommandNames = codebaseCommand.commands.map((cmd) => cmd.name());
      expect(subcommandNames).toContain('search');
      expect(subcommandNames).toContain('reindex');
      expect(subcommandNames).toContain('status');
    });
  });

  describe('Command Design', () => {
    it('should support searching codebase', () => {
      const hasSearchCommand = codebaseCommand.commands.some((cmd) => cmd.name() === 'search');
      expect(hasSearchCommand).toBe(true);
    });

    it('should support reindexing', () => {
      const hasReindexCommand = codebaseCommand.commands.some((cmd) => cmd.name() === 'reindex');
      expect(hasReindexCommand).toBe(true);
    });

    it('should support checking status', () => {
      const hasStatusCommand = codebaseCommand.commands.some((cmd) => cmd.name() === 'status');
      expect(hasStatusCommand).toBe(true);
    });

    it('should allow filtering by file extensions', () => {
      const hasExtensionsOption = codebaseSearchCommand.options.some(
        (opt) => opt.long === '--extensions'
      );
      expect(hasExtensionsOption).toBe(true);
    });

    it('should allow filtering by path', () => {
      const hasPathOption = codebaseSearchCommand.options.some((opt) => opt.long === '--path');
      expect(hasPathOption).toBe(true);
    });

    it('should allow excluding paths', () => {
      const hasExcludeOption = codebaseSearchCommand.options.some(
        (opt) => opt.long === '--exclude'
      );
      expect(hasExcludeOption).toBe(true);
    });
  });

  describe('Option Short Flags', () => {
    it('should have short flag for limit', () => {
      const limitOption = codebaseSearchCommand.options.find((opt) => opt.long === '--limit');
      expect(limitOption?.short).toBe('-l');
    });

    it('should have correct option flags', () => {
      const limitOpt = codebaseSearchCommand.options.find((opt) => opt.long === '--limit');
      expect(limitOpt?.flags).toContain('-l');
      expect(limitOpt?.flags).toContain('--limit');
    });
  });

  describe('Argument Requirements', () => {
    it('should require query for search', () => {
      const queryArg = codebaseSearchCommand._args[0];
      expect(queryArg.required).toBe(true);
    });

    it('should have descriptive query argument', () => {
      const queryArg = codebaseSearchCommand._args[0];
      expect(queryArg.description).toContain('function names');
    });
  });
});
