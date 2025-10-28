/**
 * Tool Display Tests
 * Tests for tool parameter display formatting
 */

import { describe, expect, it } from 'vitest';
import { formatToolDisplay } from '../../src/utils/tool-display.js';

describe('Tool Display', () => {
  describe('formatToolDisplay', () => {
    describe('Write tool', () => {
      it('should format with file path', () => {
        const result = formatToolDisplay('Write', { file_path: '/path/to/file.txt' });
        expect(result).toContain('file.txt');
        expect(result).toContain('Write(');
      });

      it('should format with short content', () => {
        const result = formatToolDisplay('Write', {
          file_path: '/path/to/file.txt',
          content: 'Short text',
        });
        expect(result).toContain('file.txt');
        expect(result).toContain('Short text');
      });

      it('should not include content if longer than 50 chars', () => {
        const longContent = 'a'.repeat(100);
        const result = formatToolDisplay('Write', {
          file_path: '/path/to/file.txt',
          content: longContent,
        });
        expect(result).toContain('file.txt');
        expect(result).not.toContain('aaa'); // Content not included if > 50
      });

      it('should handle missing file_path', () => {
        const result = formatToolDisplay('Write', { content: 'test' });
        expect(result).toContain('Write(');
        expect(result).toContain('test');
      });

      it('should extract filename from path', () => {
        const result = formatToolDisplay('Write', { file_path: '/very/long/path/to/myfile.ts' });
        expect(result).toContain('myfile.ts');
        expect(result).not.toContain('/very/long/path');
      });
    });

    describe('Read tool', () => {
      it('should format with file path', () => {
        const result = formatToolDisplay('Read', { file_path: '/path/to/file.txt' });
        expect(result).toBe('Read(file.txt)');
      });

      it('should extract filename from path', () => {
        const result = formatToolDisplay('Read', { file_path: '/dir1/dir2/readme.md' });
        expect(result).toBe('Read(readme.md)');
      });

      it('should handle missing file_path', () => {
        const result = formatToolDisplay('Read', {});
        expect(result).toBe('Read()');
      });

      it('should handle empty file_path', () => {
        const result = formatToolDisplay('Read', { file_path: '' });
        expect(result).toBe('Read()');
      });
    });

    describe('Edit tool', () => {
      it('should format with file path', () => {
        const result = formatToolDisplay('Edit', { file_path: '/path/to/file.txt' });
        expect(result).toBe('Edit(file.txt)');
      });

      it('should extract filename from path', () => {
        const result = formatToolDisplay('Edit', { file_path: '/src/utils/helper.ts' });
        expect(result).toBe('Edit(helper.ts)');
      });

      it('should handle missing file_path', () => {
        const result = formatToolDisplay('Edit', {});
        expect(result).toBe('Edit()');
      });
    });

    describe('Bash tool', () => {
      it('should format with command', () => {
        const result = formatToolDisplay('Bash', { command: 'npm test' });
        expect(result).toBe('Bash(npm test)');
      });

      it('should truncate long commands', () => {
        const longCommand = 'a'.repeat(100);
        const result = formatToolDisplay('Bash', { command: longCommand });
        expect(result).toContain('...');
        expect(result.length).toBeLessThan(70);
      });

      it('should keep commands at 60 chars limit', () => {
        const command = 'a'.repeat(70);
        const result = formatToolDisplay('Bash', { command });
        expect(result).toMatch(/Bash\(a{57}\.\.\.\)/);
      });

      it('should handle missing command', () => {
        const result = formatToolDisplay('Bash', {});
        expect(result).toBe('Bash()');
      });

      it('should handle empty command', () => {
        const result = formatToolDisplay('Bash', { command: '' });
        expect(result).toBe('Bash()');
      });
    });

    describe('Grep tool', () => {
      it('should format with pattern', () => {
        const result = formatToolDisplay('Grep', { pattern: 'function' });
        expect(result).toBe('Grep(function)');
      });

      it('should format with pattern and file', () => {
        const result = formatToolDisplay('Grep', {
          pattern: 'function',
          file_path: '/path/to/file.ts',
        });
        expect(result).toBe('Grep(function in file.ts)');
      });

      it('should extract filename from path', () => {
        const result = formatToolDisplay('Grep', {
          pattern: 'test',
          file_path: '/src/tests/helper.test.ts',
        });
        expect(result).toBe('Grep(test in helper.test.ts)');
      });

      it('should handle missing pattern', () => {
        const result = formatToolDisplay('Grep', { file_path: '/path/file.ts' });
        expect(result).toContain('Grep(');
        expect(result).toContain('file.ts');
      });

      it('should handle missing file_path', () => {
        const result = formatToolDisplay('Grep', { pattern: 'search' });
        expect(result).toBe('Grep(search)');
      });
    });

    describe('Glob tool', () => {
      it('should format with pattern', () => {
        const result = formatToolDisplay('Glob', { pattern: '**/*.ts' });
        expect(result).toBe('Glob(**/*.ts)');
      });

      it('should handle missing pattern', () => {
        const result = formatToolDisplay('Glob', {});
        expect(result).toBe('Glob()');
      });

      it('should handle empty pattern', () => {
        const result = formatToolDisplay('Glob', { pattern: '' });
        expect(result).toBe('Glob()');
      });

      it('should handle complex patterns', () => {
        const result = formatToolDisplay('Glob', { pattern: 'src/**/*.{ts,tsx}' });
        expect(result).toBe('Glob(src/**/*.{ts,tsx})');
      });
    });

    describe('TodoWrite tool', () => {
      it('should format with todo count', () => {
        const todos = [
          { status: 'completed', content: 'Task 1', activeForm: 'Doing task 1' },
          { status: 'pending', content: 'Task 2', activeForm: 'Doing task 2' },
          { status: 'completed', content: 'Task 3', activeForm: 'Doing task 3' },
        ];
        const result = formatToolDisplay('TodoWrite', { todos });
        expect(result).toBe('TodoWrite(3 todos (2 completed))');
      });

      it('should handle empty todos array', () => {
        const result = formatToolDisplay('TodoWrite', { todos: [] });
        expect(result).toBe('TodoWrite(0 todos (0 completed))');
      });

      it('should handle missing todos', () => {
        const result = formatToolDisplay('TodoWrite', {});
        expect(result).toBe('TodoWrite(0 todos (0 completed))');
      });

      it('should count only completed todos', () => {
        const todos = [
          { status: 'pending', content: 'Task 1', activeForm: 'Doing 1' },
          { status: 'in_progress', content: 'Task 2', activeForm: 'Doing 2' },
          { status: 'pending', content: 'Task 3', activeForm: 'Doing 3' },
        ];
        const result = formatToolDisplay('TodoWrite', { todos });
        expect(result).toBe('TodoWrite(3 todos (0 completed))');
      });

      it('should handle all completed todos', () => {
        const todos = [
          { status: 'completed', content: 'Task 1', activeForm: 'Doing 1' },
          { status: 'completed', content: 'Task 2', activeForm: 'Doing 2' },
        ];
        const result = formatToolDisplay('TodoWrite', { todos });
        expect(result).toBe('TodoWrite(2 todos (2 completed))');
      });
    });

    describe('Unknown tools (default case)', () => {
      it('should format with file_path', () => {
        const result = formatToolDisplay('UnknownTool', { file_path: '/path/to/file.txt' });
        expect(result).toBe('UnknownTool(file.txt)');
      });

      it('should format with query', () => {
        const result = formatToolDisplay('SearchTool', { query: 'search term' });
        expect(result).toBe('SearchTool(search term)');
      });

      it('should truncate long query', () => {
        const longQuery = 'a'.repeat(100);
        const result = formatToolDisplay('SearchTool', { query: longQuery });
        expect(result).toContain('...');
        expect(result.length).toBeLessThan(60);
      });

      it('should format with command', () => {
        const result = formatToolDisplay('CustomTool', { command: 'custom command' });
        expect(result).toBe('CustomTool(custom command)');
      });

      it('should truncate long command', () => {
        const longCommand = 'b'.repeat(100);
        const result = formatToolDisplay('CustomTool', { command: longCommand });
        expect(result).toContain('...');
        expect(result.length).toBeLessThan(60);
      });

      it('should stringify other params', () => {
        const result = formatToolDisplay('GenericTool', { foo: 'bar', baz: 123 });
        expect(result).toContain('GenericTool(');
        expect(result).toContain('foo');
      });

      it('should truncate long JSON', () => {
        const largeObj = { data: 'x'.repeat(100) };
        const result = formatToolDisplay('GenericTool', largeObj);
        expect(result.length).toBeLessThan(60);
      });

      it('should handle empty params', () => {
        const result = formatToolDisplay('EmptyTool', {});
        expect(result).toContain('EmptyTool(');
      });
    });

    describe('Integration', () => {
      it('should format all tool types consistently', () => {
        const tools = [
          ['Write', { file_path: '/path/file.ts' }],
          ['Read', { file_path: '/path/file.ts' }],
          ['Edit', { file_path: '/path/file.ts' }],
          ['Bash', { command: 'npm test' }],
          ['Grep', { pattern: 'test' }],
          ['Glob', { pattern: '**/*.ts' }],
        ];

        for (const [tool, params] of tools) {
          const result = formatToolDisplay(tool as string, params);
          expect(result).toContain(`${tool}(`);
          expect(result).toContain(')');
        }
      });

      it('should handle mixed parameter types', () => {
        const params = {
          file_path: '/path/file.ts',
          query: 'search',
          command: 'test',
        };

        const result = formatToolDisplay('MixedTool', params);
        expect(result).toContain('MixedTool(');
        expect(result).toContain('file.ts');
      });

      it('should prioritize file_path in unknown tools', () => {
        const params = {
          file_path: '/path/specific.ts',
          query: 'should not appear',
        };

        const result = formatToolDisplay('UnknownTool', params);
        expect(result).toBe('UnknownTool(specific.ts)');
      });
    });
  });
});
