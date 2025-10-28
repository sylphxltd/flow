/**
 * JSONC Tests
 * Tests for JSON with Comments utilities
 */

import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  parseJSONC,
  stringifyJSONC,
  readJSONCFile,
  writeJSONCFile,
} from '../../src/utils/jsonc.js';

describe('JSONC', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'jsonc-test-'));
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('parseJSONC', () => {
    it('should parse valid JSON', () => {
      const json = '{"name": "John", "age": 30}';
      const result = parseJSONC(json);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse JSON with single-line comments', () => {
      const jsonc = `{
        "name": "John", // This is a comment
        "age": 30 // Another comment
      }`;
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse JSON with multi-line comments', () => {
      const jsonc = `{
        /* This is a
           multi-line comment */
        "name": "John",
        "age": 30 /* Another multi-line comment */
      }`;
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse JSON with trailing commas', () => {
      const jsonc = `{
        "name": "John",
        "age": 30,
      }`;
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse JSON with array trailing commas', () => {
      const jsonc = `{
        "items": [1, 2, 3,]
      }`;
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ items: [1, 2, 3] });
    });

    it('should preserve strings with comment-like content', () => {
      const jsonc = '{"url": "http://example.com"}';
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ url: 'http://example.com' });
    });

    it('should preserve strings with slashes', () => {
      const jsonc = '{"path": "folder/file.txt"}';
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ path: 'folder/file.txt' });
    });

    it('should handle escaped quotes in strings', () => {
      const jsonc = '{"quote": "He said \\"hello\\""}';
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ quote: 'He said "hello"' });
    });

    it('should handle empty object', () => {
      const jsonc = '{}';
      const result = parseJSONC(jsonc);
      expect(result).toEqual({});
    });

    it('should handle empty array', () => {
      const jsonc = '[]';
      const result = parseJSONC(jsonc);
      expect(result).toEqual([]);
    });

    it('should handle nested objects', () => {
      const jsonc = `{
        "user": {
          "name": "John",
          "age": 30
        }
      }`;
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ user: { name: 'John', age: 30 } });
    });

    it('should handle arrays of objects', () => {
      const jsonc = `{
        "users": [
          {"name": "John"},
          {"name": "Jane"}
        ]
      }`;
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ users: [{ name: 'John' }, { name: 'Jane' }] });
    });

    it('should handle boolean values', () => {
      const jsonc = '{"active": true, "disabled": false}';
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ active: true, disabled: false });
    });

    it('should handle null values', () => {
      const jsonc = '{"value": null}';
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ value: null });
    });

    it('should handle number values', () => {
      const jsonc = '{"count": 0, "total": 100, "pi": 3.14}';
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ count: 0, total: 100, pi: 3.14 });
    });

    it('should throw on invalid JSON', () => {
      const invalid = '{"name": "John"';
      expect(() => parseJSONC(invalid)).toThrow('Failed to parse JSONC');
    });

    it('should handle comments at end of file', () => {
      const jsonc = `{
        "name": "John"
      }
      // Comment at end`;
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ name: 'John' });
    });

    it('should handle multiple trailing commas', () => {
      const jsonc = `{
        "items": [1, 2,],
        "other": [3, 4,],
      }`;
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ items: [1, 2], other: [3, 4] });
    });

    it('should not remove // from URLs', () => {
      const jsonc = '{"url": "https://example.com"}';
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ url: 'https://example.com' });
    });

    it('should handle mixed comment styles', () => {
      const jsonc = `{
        // Single line comment
        "name": "John",
        /* Multi-line
           comment */
        "age": 30
      }`;
      const result = parseJSONC(jsonc);
      expect(result).toEqual({ name: 'John', age: 30 });
    });
  });

  describe('stringifyJSONC', () => {
    it('should stringify object', () => {
      const obj = { name: 'John', age: 30 };
      const result = stringifyJSONC(obj);
      expect(result).toContain('"name": "John"');
      expect(result).toContain('"age": 30');
    });

    it('should add schema if provided', () => {
      const obj = { name: 'John' };
      const schema = 'https://example.com/schema.json';
      const result = stringifyJSONC(obj, schema);
      expect(result).toContain('"$schema": "https://example.com/schema.json"');
    });

    it('should not add schema if already present', () => {
      const obj = { $schema: 'existing-schema', name: 'John' };
      const schema = 'new-schema';
      const result = stringifyJSONC(obj, schema);
      expect(result).toContain('"$schema": "existing-schema"');
      expect(result).not.toContain('new-schema');
    });

    it('should use custom indentation', () => {
      const obj = { name: 'John' };
      const result = stringifyJSONC(obj, undefined, 4);
      expect(result).toContain('    "name"');
    });

    it('should add MCP comments when mcp section exists', () => {
      const obj = { mcp: { server1: {} } };
      const result = stringifyJSONC(obj);
      expect(result).toContain('// MCP (Model Context Protocol)');
      expect(result).toContain('modelcontextprotocol.io');
    });

    it('should not add MCP comments when mcp section is empty', () => {
      const obj = { mcp: {} };
      const result = stringifyJSONC(obj);
      expect(result).not.toContain('// MCP');
    });

    it('should not add MCP comments when no mcp section', () => {
      const obj = { name: 'John' };
      const result = stringifyJSONC(obj);
      expect(result).not.toContain('// MCP');
    });

    it('should handle nested objects', () => {
      const obj = { user: { name: 'John', age: 30 } };
      const result = stringifyJSONC(obj);
      expect(result).toContain('"user"');
      expect(result).toContain('"name": "John"');
    });

    it('should handle arrays', () => {
      const obj = { items: [1, 2, 3] };
      const result = stringifyJSONC(obj);
      expect(result).toContain('[');
      expect(result).toContain('1,');
      expect(result).toContain('2,');
      expect(result).toContain('3');
    });

    it('should handle boolean values', () => {
      const obj = { active: true, disabled: false };
      const result = stringifyJSONC(obj);
      expect(result).toContain('true');
      expect(result).toContain('false');
    });

    it('should handle null values', () => {
      const obj = { value: null };
      const result = stringifyJSONC(obj);
      expect(result).toContain('null');
    });
  });

  describe('readJSONCFile', () => {
    it('should read and parse JSONC file', async () => {
      const filePath = join(testDir, 'test.jsonc');
      const content = '{"name": "John", "age": 30}';
      writeFileSync(filePath, content, 'utf8');

      const result = await readJSONCFile(filePath);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should read file with comments', async () => {
      const filePath = join(testDir, 'test.jsonc');
      const content = `{
        "name": "John", // Name field
        "age": 30 // Age field
      }`;
      writeFileSync(filePath, content, 'utf8');

      const result = await readJSONCFile(filePath);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should read file with trailing commas', async () => {
      const filePath = join(testDir, 'test.jsonc');
      const content = '{"name": "John", "age": 30,}';
      writeFileSync(filePath, content, 'utf8');

      const result = await readJSONCFile(filePath);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should throw error for non-existent file', async () => {
      const filePath = join(testDir, 'nonexistent.jsonc');
      await expect(readJSONCFile(filePath)).rejects.toThrow();
    });

    it('should throw error for invalid JSONC', async () => {
      const filePath = join(testDir, 'invalid.jsonc');
      writeFileSync(filePath, '{"name": "John"', 'utf8');

      await expect(readJSONCFile(filePath)).rejects.toThrow('Failed to parse JSONC');
    });
  });

  describe('writeJSONCFile', () => {
    it('should write object to file', async () => {
      const filePath = join(testDir, 'output.jsonc');
      const obj = { name: 'John', age: 30 };

      await writeJSONCFile(filePath, obj);

      const content = readFileSync(filePath, 'utf8');
      expect(content).toContain('"name": "John"');
      expect(content).toContain('"age": 30');
    });

    it('should write with schema', async () => {
      const filePath = join(testDir, 'output.jsonc');
      const obj = { name: 'John' };
      const schema = 'https://example.com/schema.json';

      await writeJSONCFile(filePath, obj, schema);

      const content = readFileSync(filePath, 'utf8');
      expect(content).toContain('"$schema"');
      expect(content).toContain('example.com/schema.json');
    });

    it('should write with custom indentation', async () => {
      const filePath = join(testDir, 'output.jsonc');
      const obj = { name: 'John' };

      await writeJSONCFile(filePath, obj, undefined, 4);

      const content = readFileSync(filePath, 'utf8');
      expect(content).toContain('    "name"');
    });

    it('should write file that can be read back', async () => {
      const filePath = join(testDir, 'roundtrip.jsonc');
      const obj = { name: 'John', age: 30, active: true };

      await writeJSONCFile(filePath, obj);
      const result = await readJSONCFile(filePath);

      expect(result).toEqual(obj);
    });

    it('should write MCP config with comments', async () => {
      const filePath = join(testDir, 'mcp.jsonc');
      const obj = { mcp: { server1: { enabled: true } } };

      await writeJSONCFile(filePath, obj);

      const content = readFileSync(filePath, 'utf8');
      expect(content).toContain('// MCP');
    });
  });

  describe('Integration', () => {
    it('should support round-trip conversion', async () => {
      const original = {
        name: 'John',
        age: 30,
        active: true,
        items: [1, 2, 3],
        nested: { key: 'value' },
      };

      const filePath = join(testDir, 'roundtrip.jsonc');
      await writeJSONCFile(filePath, original);
      const restored = await readJSONCFile(filePath);

      expect(restored).toEqual(original);
    });

    it('should handle complex nested structures', async () => {
      const complex = {
        app: {
          config: {
            database: { host: 'localhost', port: 5432 },
            cache: { enabled: true, ttl: 3600 },
          },
        },
      };

      const filePath = join(testDir, 'complex.jsonc');
      await writeJSONCFile(filePath, complex);
      const restored = await readJSONCFile(filePath);

      expect(restored).toEqual(complex);
    });

    it('should preserve data types through round-trip', async () => {
      const typed = {
        string: 'text',
        number: 42,
        float: 3.14,
        boolean: true,
        nullValue: null,
        array: [1, 2, 3],
        object: { key: 'value' },
      };

      const filePath = join(testDir, 'types.jsonc');
      await writeJSONCFile(filePath, typed);
      const restored = await readJSONCFile(filePath);

      expect(restored).toEqual(typed);
    });
  });
});
