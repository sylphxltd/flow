/**
 * Tests for attachment parser
 */

import { describe, it, expect } from 'vitest';
import {
  extractFileReferences,
  hasFileReference,
  countFileReferences,
  getUniqueFileReferences,
} from './parser.js';

describe('extractFileReferences', () => {
  it('should extract single @ file reference', () => {
    const refs = extractFileReferences('Check @src/index.ts');
    expect(refs).toEqual(['src/index.ts']);
  });

  it('should extract multiple @ file references', () => {
    const refs = extractFileReferences('Check @src/index.ts and @README.md');
    expect(refs).toEqual(['src/index.ts', 'README.md']);
  });

  it('should return empty array for no references', () => {
    const refs = extractFileReferences('No file references here');
    expect(refs).toEqual([]);
  });

  it('should handle @ at start', () => {
    const refs = extractFileReferences('@src/index.ts is the entry');
    expect(refs).toEqual(['src/index.ts']);
  });

  it('should handle @ at end', () => {
    const refs = extractFileReferences('See file @README.md');
    expect(refs).toEqual(['README.md']);
  });

  it('should handle multiple spaces', () => {
    const refs = extractFileReferences('Files: @file1.ts  @file2.ts   @file3.ts');
    expect(refs).toEqual(['file1.ts', 'file2.ts', 'file3.ts']);
  });

  it('should handle newlines', () => {
    const refs = extractFileReferences('Files:\n@src/index.ts\n@test.ts');
    expect(refs).toEqual(['src/index.ts', 'test.ts']);
  });

  it('should extract domain from email (not full email)', () => {
    // Parser extracts @ followed by non-whitespace
    // For emails like user@example.com, it extracts @example.com
    // Email filtering should happen at autocomplete level, not parser level
    const refs = extractFileReferences('Contact user@example.com');
    expect(refs).toEqual(['example.com']);
  });

  it('should handle paths with dots', () => {
    const refs = extractFileReferences('Check @package.json and @.gitignore');
    expect(refs).toEqual(['package.json', '.gitignore']);
  });

  it('should handle paths with hyphens', () => {
    const refs = extractFileReferences('See @my-file.ts');
    expect(refs).toEqual(['my-file.ts']);
  });

  it('should handle duplicate references', () => {
    const refs = extractFileReferences('Check @file.ts and @file.ts again');
    expect(refs).toEqual(['file.ts', 'file.ts']); // Keeps duplicates
  });
});

describe('hasFileReference', () => {
  it('should return true when file is referenced', () => {
    expect(hasFileReference('Check @src/index.ts', 'src/index.ts')).toBe(true);
  });

  it('should return false when file is not referenced', () => {
    expect(hasFileReference('Check @src/index.ts', 'test.ts')).toBe(false);
  });

  it('should return false for empty text', () => {
    expect(hasFileReference('', 'src/index.ts')).toBe(false);
  });

  it('should handle multiple references', () => {
    const text = 'Files: @src/index.ts @test.ts @README.md';
    expect(hasFileReference(text, 'test.ts')).toBe(true);
    expect(hasFileReference(text, 'missing.ts')).toBe(false);
  });
});

describe('countFileReferences', () => {
  it('should count single reference', () => {
    expect(countFileReferences('Check @src/index.ts')).toBe(1);
  });

  it('should count multiple references', () => {
    expect(countFileReferences('Files: @a.ts @b.ts @c.ts')).toBe(3);
  });

  it('should return 0 for no references', () => {
    expect(countFileReferences('No references here')).toBe(0);
  });

  it('should count duplicates separately', () => {
    expect(countFileReferences('Check @file.ts and @file.ts again')).toBe(2);
  });
});

describe('getUniqueFileReferences', () => {
  it('should remove duplicate references', () => {
    const refs = getUniqueFileReferences('Check @file.ts and @file.ts again');
    expect(refs).toEqual(['file.ts']);
  });

  it('should preserve order of first occurrence', () => {
    const refs = getUniqueFileReferences('Files: @a.ts @b.ts @a.ts @c.ts @b.ts');
    expect(refs).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('should handle no duplicates', () => {
    const refs = getUniqueFileReferences('Files: @a.ts @b.ts @c.ts');
    expect(refs).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('should return empty array for no references', () => {
    const refs = getUniqueFileReferences('No references');
    expect(refs).toEqual([]);
  });
});
