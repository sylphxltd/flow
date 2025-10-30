/**
 * Knowledge Command Tests
 * Tests for the knowledge CLI command
 */

import { describe, expect, it, vi } from 'vitest';
import {
  knowledgeCommand,
  knowledgeGetCommand,
  knowledgeListCommand,
  knowledgeSearchCommand,
  knowledgeStatusCommand,
} from '../../src/commands/knowledge-command.js';

// Mock search service
vi.mock('../../src/services/search/unified-search-service.js', () => {
  return {
    searchService: {
      initialize: vi.fn().mockResolvedValue(undefined),
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [],
        totalIndexed: 50,
      }),
      formatResultsForCLI: vi.fn().mockReturnValue('Search results'),
      getAvailableKnowledgeURIs: vi
        .fn()
        .mockResolvedValue([
          'knowledge://stacks/react-app',
          'knowledge://guides/architecture',
          'knowledge://universal/security',
        ]),
      getStatus: vi.fn().mockResolvedValue({
        knowledge: {
          indexed: true,
          documentCount: 50,
        },
      }),
    },
  };
});

// Mock knowledge resources
vi.mock('../../src/resources/knowledge-resources.js', () => {
  return {
    getKnowledgeContent: vi.fn().mockResolvedValue('Knowledge content here'),
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

describe('Knowledge Command', () => {
  describe('Main Command', () => {
    it('should register knowledge command', () => {
      expect(knowledgeCommand.name()).toBe('knowledge');
    });

    it('should have description', () => {
      expect(knowledgeCommand.description()).toBeTruthy();
      expect(knowledgeCommand.description()).toContain('Knowledge');
    });

    it('should have 4 subcommands', () => {
      expect(knowledgeCommand.commands.length).toBe(4);
    });

    it('should register all subcommands', () => {
      const subcommands = knowledgeCommand.commands.map((cmd) => cmd.name());
      expect(subcommands).toContain('search');
      expect(subcommands).toContain('get');
      expect(subcommands).toContain('list');
      expect(subcommands).toContain('status');
    });
  });

  describe('Search Subcommand', () => {
    it('should register search command', () => {
      expect(knowledgeSearchCommand.name()).toBe('search');
    });

    it('should have description', () => {
      expect(knowledgeSearchCommand.description()).toBeTruthy();
      expect(knowledgeSearchCommand.description()).toContain('Search');
    });

    it('should require query argument', () => {
      expect(knowledgeSearchCommand._args.length).toBe(1);
      expect(knowledgeSearchCommand._args[0].name()).toBe('query');
    });

    it('should have limit option', () => {
      const limitOption = knowledgeSearchCommand.options.find((opt) => opt.long === '--limit');
      expect(limitOption).toBeDefined();
    });

    it('should have include-content option', () => {
      const includeContentOption = knowledgeSearchCommand.options.find(
        (opt) => opt.long === '--include-content'
      );
      expect(includeContentOption).toBeDefined();
    });

    it('should have 2 options', () => {
      expect(knowledgeSearchCommand.options.length).toBe(2);
    });

    it('should have default limit of 10', () => {
      const limitOption = knowledgeSearchCommand.options.find((opt) => opt.long === '--limit');
      expect(limitOption?.defaultValue).toBe('10');
    });

    it('should include content by default', () => {
      const includeContentOption = knowledgeSearchCommand.options.find(
        (opt) => opt.long === '--include-content'
      );
      expect(includeContentOption?.defaultValue).toBe(true);
    });

    it('should describe query argument', () => {
      const queryArg = knowledgeSearchCommand._args[0];
      expect(queryArg.description).toBeTruthy();
      expect(queryArg.description).toContain('query');
    });

    it('should mention natural language in query description', () => {
      const queryArg = knowledgeSearchCommand._args[0];
      expect(queryArg.description).toContain('natural language');
    });
  });

  describe('Get Subcommand', () => {
    it('should register get command', () => {
      expect(knowledgeGetCommand.name()).toBe('get');
    });

    it('should have description', () => {
      expect(knowledgeGetCommand.description()).toBeTruthy();
      expect(knowledgeGetCommand.description()).toContain('Get');
    });

    it('should require uri argument', () => {
      expect(knowledgeGetCommand._args.length).toBe(1);
      expect(knowledgeGetCommand._args[0].name()).toBe('uri');
    });

    it('should not have options', () => {
      expect(knowledgeGetCommand.options.length).toBe(0);
    });

    it('should have action handler', () => {
      expect(knowledgeGetCommand._actionHandler).toBeDefined();
    });

    it('should describe uri argument', () => {
      const uriArg = knowledgeGetCommand._args[0];
      expect(uriArg.description).toBeTruthy();
      expect(uriArg.description).toContain('URI');
    });

    it('should show example URI in description', () => {
      const uriArg = knowledgeGetCommand._args[0];
      expect(uriArg.description).toContain('knowledge://');
    });
  });

  describe('List Subcommand', () => {
    it('should register list command', () => {
      expect(knowledgeListCommand.name()).toBe('list');
    });

    it('should have description', () => {
      expect(knowledgeListCommand.description()).toBeTruthy();
      expect(knowledgeListCommand.description()).toContain('List');
    });

    it('should not have arguments', () => {
      expect(knowledgeListCommand._args.length).toBe(0);
    });

    it('should have category option', () => {
      const categoryOption = knowledgeListCommand.options.find((opt) => opt.long === '--category');
      expect(categoryOption).toBeDefined();
    });

    it('should have 1 option', () => {
      expect(knowledgeListCommand.options.length).toBe(1);
    });

    it('should describe category option', () => {
      const categoryOption = knowledgeListCommand.options.find((opt) => opt.long === '--category');
      expect(categoryOption?.description).toBeTruthy();
      expect(categoryOption?.description).toContain('category');
    });

    it('should list valid categories in option description', () => {
      const categoryOption = knowledgeListCommand.options.find((opt) => opt.long === '--category');
      expect(categoryOption?.description).toContain('stacks');
      expect(categoryOption?.description).toContain('guides');
      expect(categoryOption?.description).toContain('universal');
    });
  });

  describe('Status Subcommand', () => {
    it('should register status command', () => {
      expect(knowledgeStatusCommand.name()).toBe('status');
    });

    it('should have description', () => {
      expect(knowledgeStatusCommand.description()).toBeTruthy();
      expect(knowledgeStatusCommand.description()).toContain('status');
    });

    it('should not have arguments', () => {
      expect(knowledgeStatusCommand._args.length).toBe(0);
    });

    it('should not have options', () => {
      expect(knowledgeStatusCommand.options.length).toBe(0);
    });

    it('should have action handler', () => {
      expect(knowledgeStatusCommand._actionHandler).toBeDefined();
    });
  });

  describe('Command Structure', () => {
    it('should have all required properties', () => {
      expect(knowledgeCommand).toHaveProperty('name');
      expect(knowledgeCommand).toHaveProperty('description');
      expect(knowledgeCommand).toHaveProperty('commands');
    });

    it('should export as named exports', () => {
      expect(knowledgeCommand).toBeDefined();
      expect(knowledgeSearchCommand).toBeDefined();
      expect(knowledgeGetCommand).toBeDefined();
      expect(knowledgeListCommand).toBeDefined();
      expect(knowledgeStatusCommand).toBeDefined();
    });

    it('should have action handlers for all subcommands', () => {
      knowledgeCommand.commands.forEach((cmd) => {
        expect(cmd._actionHandler).toBeDefined();
      });
    });

    it('should have descriptions for all subcommands', () => {
      knowledgeCommand.commands.forEach((cmd) => {
        expect(cmd.description()).toBeTruthy();
      });
    });
  });

  describe('Option Descriptions', () => {
    it('should describe limit option', () => {
      const limitOption = knowledgeSearchCommand.options.find((opt) => opt.long === '--limit');
      expect(limitOption?.description).toBeTruthy();
      expect(limitOption?.description).toContain('number of results');
    });

    it('should describe include-content option', () => {
      const includeContentOption = knowledgeSearchCommand.options.find(
        (opt) => opt.long === '--include-content'
      );
      expect(includeContentOption?.description).toBeTruthy();
      expect(includeContentOption?.description).toContain('content');
    });
  });

  describe('Integration', () => {
    it('should be a valid Commander.js command', () => {
      expect(knowledgeCommand.name()).toBeTruthy();
      expect(knowledgeCommand.description()).toBeTruthy();
      expect(knowledgeCommand.commands).toBeDefined();
    });

    it('should be importable', async () => {
      const module = await import('../../src/commands/knowledge-command.js');
      expect(module.knowledgeCommand).toBeDefined();
      expect(module.knowledgeSearchCommand).toBeDefined();
      expect(module.knowledgeGetCommand).toBeDefined();
      expect(module.knowledgeListCommand).toBeDefined();
      expect(module.knowledgeStatusCommand).toBeDefined();
    });

    it('should have correct command name', () => {
      expect(knowledgeCommand.name()).toBe('knowledge');
    });

    it('should have subcommand names', () => {
      const subcommandNames = knowledgeCommand.commands.map((cmd) => cmd.name());
      expect(subcommandNames).toContain('search');
      expect(subcommandNames).toContain('get');
      expect(subcommandNames).toContain('list');
      expect(subcommandNames).toContain('status');
    });
  });

  describe('Command Design', () => {
    it('should support searching knowledge base', () => {
      const hasSearchCommand = knowledgeCommand.commands.some((cmd) => cmd.name() === 'search');
      expect(hasSearchCommand).toBe(true);
    });

    it('should support getting specific documents', () => {
      const hasGetCommand = knowledgeCommand.commands.some((cmd) => cmd.name() === 'get');
      expect(hasGetCommand).toBe(true);
    });

    it('should support listing all resources', () => {
      const hasListCommand = knowledgeCommand.commands.some((cmd) => cmd.name() === 'list');
      expect(hasListCommand).toBe(true);
    });

    it('should support checking status', () => {
      const hasStatusCommand = knowledgeCommand.commands.some((cmd) => cmd.name() === 'status');
      expect(hasStatusCommand).toBe(true);
    });

    it('should allow filtering by category', () => {
      const hasCategoryOption = knowledgeListCommand.options.some(
        (opt) => opt.long === '--category'
      );
      expect(hasCategoryOption).toBe(true);
    });
  });

  describe('Option Short Flags', () => {
    it('should have short flag for limit', () => {
      const limitOption = knowledgeSearchCommand.options.find((opt) => opt.long === '--limit');
      expect(limitOption?.short).toBe('-l');
    });

    it('should have correct option flags', () => {
      const limitOpt = knowledgeSearchCommand.options.find((opt) => opt.long === '--limit');
      expect(limitOpt?.flags).toContain('-l');
      expect(limitOpt?.flags).toContain('--limit');
    });
  });

  describe('Argument Requirements', () => {
    it('should require query for search', () => {
      const queryArg = knowledgeSearchCommand._args[0];
      expect(queryArg.required).toBe(true);
    });

    it('should require uri for get', () => {
      const uriArg = knowledgeGetCommand._args[0];
      expect(uriArg.required).toBe(true);
    });

    it('should have descriptive search query argument', () => {
      const queryArg = knowledgeSearchCommand._args[0];
      expect(queryArg.description).toContain('technology names');
    });
  });

  describe('Subcommand Validation', () => {
    it('should validate search command structure', () => {
      expect(knowledgeSearchCommand.name()).toBe('search');
      expect(knowledgeSearchCommand._args.length).toBe(1);
      expect(knowledgeSearchCommand.options.length).toBe(2);
    });

    it('should validate get command structure', () => {
      expect(knowledgeGetCommand.name()).toBe('get');
      expect(knowledgeGetCommand._args.length).toBe(1);
      expect(knowledgeGetCommand.options.length).toBe(0);
    });

    it('should validate list command structure', () => {
      expect(knowledgeListCommand.name()).toBe('list');
      expect(knowledgeListCommand._args.length).toBe(0);
      expect(knowledgeListCommand.options.length).toBe(1);
    });

    it('should validate status command structure', () => {
      expect(knowledgeStatusCommand.name()).toBe('status');
      expect(knowledgeStatusCommand._args.length).toBe(0);
      expect(knowledgeStatusCommand.options.length).toBe(0);
    });
  });
});
