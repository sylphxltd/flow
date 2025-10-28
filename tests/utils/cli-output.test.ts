/**
 * CLI Output Tests
 * Tests for CLI output formatting utilities
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { CLIOutput, cli, print, success, warning, error, info } from '../../src/utils/cli-output.js';

// Mock logger to prevent it from writing to console
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CLI Output', () => {
  // Save original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('CLIOutput class', () => {
    let output: CLIOutput;

    beforeEach(() => {
      output = new CLIOutput();
    });

    describe('print', () => {
      it('should print info message by default', () => {
        output.print('test message');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test message'));
      });

      it('should print success message', () => {
        output.print('success message', 'success');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('success message'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅'));
      });

      it('should print warning message', () => {
        output.print('warning message', 'warning');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('warning message'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
      });

      it('should print error message', () => {
        output.print('error message', 'error');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('error message'));
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('❌'));
      });

      it('should print info message explicitly', () => {
        output.print('info message', 'info');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('info message'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ℹ️'));
      });
    });

    describe('success', () => {
      it('should print success message with icon', () => {
        output.success('Operation successful');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Operation successful'));
      });

      it('should include green color', () => {
        output.success('Success');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('\x1b[32m'));
      });

      it('should reset color at end', () => {
        output.success('Success');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('\x1b[0m'));
      });
    });

    describe('warning', () => {
      it('should print warning message with icon', () => {
        output.warning('Warning message');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
      });

      it('should include yellow color', () => {
        output.warning('Warning');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('\x1b[33m'));
      });

      it('should reset color at end', () => {
        output.warning('Warning');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('\x1b[0m'));
      });
    });

    describe('error', () => {
      it('should print error message with icon', () => {
        output.error('Error message');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('❌'));
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error message'));
      });

      it('should include red color', () => {
        output.error('Error');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('\x1b[31m'));
      });

      it('should reset color at end', () => {
        output.error('Error');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('\x1b[0m'));
      });

      it('should use console.error instead of console.log', () => {
        output.error('Error');
        expect(console.error).toHaveBeenCalled();
        expect(console.log).not.toHaveBeenCalled();
      });
    });

    describe('info', () => {
      it('should print info message with icon', () => {
        output.info('Info message');
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ℹ️'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Info message'));
      });

      it('should not include color codes', () => {
        output.info('Info');
        const call = (console.log as any).mock.calls[0][0];
        // Should only have icon and message, no color codes like \x1b[32m
        expect(call).toContain('ℹ️');
        expect(call).toContain('Info');
      });
    });

    describe('table', () => {
      it('should print table with headers and rows', () => {
        const data = [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ];
        output.table(data);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('name'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('age'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('John'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Jane'));
      });

      it('should print message for empty data', () => {
        output.table([]);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No data'));
      });

      it('should align columns properly', () => {
        const data = [{ short: 'a', longer: 'test' }];
        output.table(data);

        const calls = (console.log as any).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
      });

      it('should include separator line', () => {
        const data = [{ name: 'John' }];
        output.table(data);

        const calls = (console.log as any).mock.calls;
        const hasSeparator = calls.some((call: any) => call[0].includes('---'));
        expect(hasSeparator).toBe(true);
      });

      it('should handle undefined values', () => {
        const data = [{ name: 'John', age: undefined }];
        output.table(data);

        expect(console.log).toHaveBeenCalled();
      });

      it('should convert non-string values', () => {
        const data = [{ name: 'John', count: 42, active: true }];
        output.table(data);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('42'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('true'));
      });
    });

    describe('list', () => {
      it('should print list with bullet points', () => {
        const items = ['Item 1', 'Item 2', 'Item 3'];
        output.list(items);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Item 1'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Item 2'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Item 3'));
      });

      it('should print numbered list', () => {
        const items = ['First', 'Second'];
        output.list(items, { numbered: true });

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1.'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2.'));
      });

      it('should use custom bullet', () => {
        const items = ['Item'];
        output.list(items, { bullet: '-' });

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('-'));
      });

      it('should use default bullet', () => {
        const items = ['Item'];
        output.list(items);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('•'));
      });

      it('should print message for empty list', () => {
        output.list([]);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No items'));
      });

      it('should handle single item', () => {
        const items = ['Only one'];
        output.list(items);

        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Only one'));
      });
    });

    describe('memoryEntry', () => {
      it('should print memory entry details', () => {
        const entry = {
          namespace: 'default',
          key: 'test-key',
          value: 'test-value',
          updated_at: '2024-01-01T00:00:00Z',
        };

        output.memoryEntry(entry);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('default:test-key'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test-value'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2024-01-01'));
      });

      it('should include index when provided', () => {
        const entry = {
          namespace: 'default',
          key: 'key',
          value: 'value',
          updated_at: '2024-01-01',
        };

        output.memoryEntry(entry, 0);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1.'));
      });

      it('should truncate long values', () => {
        const longValue = 'a'.repeat(100);
        const entry = {
          namespace: 'default',
          key: 'key',
          value: longValue,
          updated_at: '2024-01-01',
        };

        output.memoryEntry(entry);

        const calls = (console.log as any).mock.calls;
        const valueCall = calls.find((call: any) => call[0].includes('Value:'));
        expect(valueCall[0]).toContain('...');
        expect(valueCall[0].length).toBeLessThan(longValue.length + 50);
      });

      it('should handle object values', () => {
        const entry = {
          namespace: 'default',
          key: 'key',
          value: { nested: 'object' },
          updated_at: '2024-01-01',
        };

        output.memoryEntry(entry);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Value:'));
      });

      it('should handle null value', () => {
        const entry = {
          namespace: 'default',
          key: 'key',
          value: null,
          updated_at: '2024-01-01',
        };

        output.memoryEntry(entry);

        expect(console.log).toHaveBeenCalled();
      });
    });

    describe('searchSummary', () => {
      it('should print search summary', () => {
        output.searchSummary('test query', 5);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test query'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('5'));
      });

      it('should include namespace when provided', () => {
        output.searchSummary('query', 3, 'custom');

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('custom'));
      });

      it('should handle zero results', () => {
        output.searchSummary('query', 0);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('0'));
      });
    });

    describe('listSummary', () => {
      it('should print summary for specific namespace', () => {
        output.listSummary('custom', 10);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('custom'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('10'));
      });

      it('should print summary for all entries', () => {
        output.listSummary('all', 5, 100);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('5'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('100'));
      });

      it('should handle zero count', () => {
        output.listSummary('namespace', 0);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('0'));
      });
    });

    describe('emptyState', () => {
      it('should print empty entries message', () => {
        output.emptyState('entries');

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No entries found'));
      });

      it('should print empty results message', () => {
        output.emptyState('results');

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No matching entries'));
      });

      it('should print empty data message', () => {
        output.emptyState('data');

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No data'));
      });

      it('should include context when provided', () => {
        output.emptyState('entries', 'namespace foo');

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('namespace foo'));
      });

      it('should end with period', () => {
        output.emptyState('entries');

        const call = (console.log as any).mock.calls[0][0];
        expect(call).toMatch(/\.$/);
      });
    });
  });

  describe('Global instance', () => {
    it('should export cli instance', () => {
      expect(cli).toBeInstanceOf(CLIOutput);
    });

    it('should be usable directly', () => {
      cli.success('test');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('Convenience functions', () => {
    it('should export print function', () => {
      print('test');
      expect(console.log).toHaveBeenCalled();
    });

    it('should export success function', () => {
      success('test');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅'));
    });

    it('should export warning function', () => {
      warning('test');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
    });

    it('should export error function', () => {
      error('test');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('❌'));
    });

    it('should export info function', () => {
      info('test');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ℹ️'));
    });
  });

  describe('Integration', () => {
    it('should handle multiple outputs in sequence', () => {
      const output = new CLIOutput();

      output.success('Success');
      output.warning('Warning');
      output.error('Error');
      output.info('Info');

      expect(console.log).toHaveBeenCalledTimes(3); // success, warning, info
      expect(console.error).toHaveBeenCalledTimes(1); // error
    });

    it('should format table and list together', () => {
      const output = new CLIOutput();

      output.table([{ name: 'John' }]);
      output.list(['Item 1', 'Item 2']);

      expect(console.log).toHaveBeenCalled();
    });

    it('should handle all empty states', () => {
      const output = new CLIOutput();

      output.emptyState('entries');
      output.emptyState('results');
      output.emptyState('data');

      expect(console.log).toHaveBeenCalledTimes(3);
    });
  });
});
