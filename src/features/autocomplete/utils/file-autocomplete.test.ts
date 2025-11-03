/**
 * Tests for file autocomplete
 */

import { describe, it, expect } from 'vitest';
import {
  detectFileTag,
  getFileAutocomplete,
  replaceFileTag,
} from './file-autocomplete.js';

const mockFiles = [
  { path: '/project/src/index.ts', relativePath: 'src/index.ts', size: 1000 },
  { path: '/project/src/utils.ts', relativePath: 'src/utils.ts', size: 500 },
  { path: '/project/tests/test.ts', relativePath: 'tests/test.ts', size: 200 },
  { path: '/project/README.md', relativePath: 'README.md', size: 100 },
];

describe('detectFileTag', () => {
  it('should detect @ at start', () => {
    const result = detectFileTag('@src/', 5);
    expect(result).toEqual({
      query: 'src/',
      hasAt: true,
      atIndex: 0,
    });
  });

  it('should detect @ after space', () => {
    const result = detectFileTag('hello @src/', 11);
    expect(result).toEqual({
      query: 'src/',
      hasAt: true,
      atIndex: 6,
    });
  });

  it('should detect @ after newline', () => {
    const result = detectFileTag('hello\n@src/', 12);
    expect(result).toEqual({
      query: 'src/',
      hasAt: true,
      atIndex: 6,
    });
  });

  it('should not detect @ in email', () => {
    const result = detectFileTag('user@example.com', 16);
    expect(result).toEqual({
      query: '',
      hasAt: false,
      atIndex: 4,
    });
  });

  it('should not detect @ when no @ present', () => {
    const result = detectFileTag('hello world', 11);
    expect(result).toEqual({
      query: '',
      hasAt: false,
      atIndex: -1,
    });
  });

  it('should not detect @ when query contains space', () => {
    const result = detectFileTag('@file test', 10);
    expect(result).toEqual({
      query: '',
      hasAt: false,
      atIndex: 0,
    });
  });

  it('should extract partial query', () => {
    const result = detectFileTag('attach @src/ind', 15);
    expect(result).toEqual({
      query: 'src/ind',
      hasAt: true,
      atIndex: 7,
    });
  });

  it('should handle cursor in middle of input', () => {
    const result = detectFileTag('attach @src/index.ts more', 20);
    expect(result).toEqual({
      query: 'src/index.ts',
      hasAt: true,
      atIndex: 7,
    });
  });

  it('should handle multiple @ symbols', () => {
    // Should use last @ before cursor
    const result = detectFileTag('@foo @bar', 9);
    expect(result).toEqual({
      query: 'bar',
      hasAt: true,
      atIndex: 5,
    });
  });

  it('should handle @ with no query', () => {
    const result = detectFileTag('hello @', 7);
    expect(result).toEqual({
      query: '',
      hasAt: true,
      atIndex: 6,
    });
  });
});

describe('getFileAutocomplete', () => {
  it('should return filtered files', () => {
    const result = getFileAutocomplete(mockFiles, '@src/', 5);
    expect(result.hasAt).toBe(true);
    expect(result.query).toBe('src/');
    expect(result.files).toHaveLength(2);
    expect(result.files[0].relativePath).toBe('src/index.ts');
    expect(result.files[1].relativePath).toBe('src/utils.ts');
  });

  it('should return all files for empty query', () => {
    const result = getFileAutocomplete(mockFiles, '@', 1);
    expect(result.hasAt).toBe(true);
    expect(result.query).toBe('');
    expect(result.files).toHaveLength(4);
  });

  it('should be case-insensitive', () => {
    const result = getFileAutocomplete(mockFiles, '@SRC/', 5);
    expect(result.files).toHaveLength(2);
  });

  it('should limit results', () => {
    const result = getFileAutocomplete(mockFiles, '@', 1, 2);
    expect(result.files).toHaveLength(2);
  });

  it('should return empty for email', () => {
    const result = getFileAutocomplete(mockFiles, 'user@example.com', 16);
    expect(result.hasAt).toBe(false);
    expect(result.files).toHaveLength(0);
  });

  it('should filter by partial filename', () => {
    const result = getFileAutocomplete(mockFiles, '@index', 6);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].relativePath).toBe('src/index.ts');
  });

  it('should return empty for query with space', () => {
    const result = getFileAutocomplete(mockFiles, '@file test', 10);
    expect(result.hasAt).toBe(false);
    expect(result.files).toHaveLength(0);
  });

  it('should handle multiple @ symbols', () => {
    const result = getFileAutocomplete(mockFiles, '@foo @src/', 10);
    expect(result.hasAt).toBe(true);
    expect(result.query).toBe('src/');
    expect(result.files).toHaveLength(2);
  });
});

describe('replaceFileTag', () => {
  it('should replace @ tag with file path', () => {
    const result = replaceFileTag('hello @src/', 11, 6, 'src/index.ts');
    expect(result).toEqual({
      text: 'hello @src/index.ts',
      cursor: 19, // atIndex(6) + 1 + selectedPath.length(12) = 19
    });
  });

  it('should handle @ at start', () => {
    const result = replaceFileTag('@src/', 5, 0, 'src/utils.ts');
    expect(result).toEqual({
      text: '@src/utils.ts',
      cursor: 13,
    });
  });

  it('should preserve text after cursor', () => {
    const result = replaceFileTag('hello @src/ world', 11, 6, 'src/index.ts');
    expect(result).toEqual({
      text: 'hello @src/index.ts world',
      cursor: 19, // atIndex(6) + 1 + selectedPath.length(12) = 19
    });
  });

  it('should handle partial query', () => {
    const result = replaceFileTag('attach @src/ind more', 15, 7, 'src/index.ts');
    expect(result).toEqual({
      text: 'attach @src/index.ts more',
      cursor: 20, // atIndex(7) + 1 + selectedPath.length(12) = 20
    });
  });

  it('should handle empty query', () => {
    const result = replaceFileTag('hello @ world', 7, 6, 'README.md');
    expect(result).toEqual({
      text: 'hello @README.md world',
      cursor: 16, // atIndex(6) + 1 + selectedPath.length(9) = 16
    });
  });
});
