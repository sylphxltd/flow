/**
 * Tests for Query Validation Utilities
 */

import { describe, expect, it } from 'bun:test';
import { normalizeQuery } from './query.js';

describe('normalizeQuery', () => {
  it('trims leading whitespace', () => {
    expect(normalizeQuery('  hello')).toBe('hello');
  });

  it('trims trailing whitespace', () => {
    expect(normalizeQuery('hello  ')).toBe('hello');
  });

  it('trims both leading and trailing whitespace', () => {
    expect(normalizeQuery('  hello  ')).toBe('hello');
  });

  it('preserves internal whitespace', () => {
    expect(normalizeQuery('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(normalizeQuery('')).toBe('');
  });

  it('handles string with only whitespace', () => {
    expect(normalizeQuery('   ')).toBe('');
  });

  it('handles tabs and newlines', () => {
    expect(normalizeQuery('\t\nhello\t\n')).toBe('hello');
  });

  it('handles already trimmed string', () => {
    expect(normalizeQuery('hello')).toBe('hello');
  });

  it('handles multi-line queries', () => {
    expect(normalizeQuery('  line1\nline2  ')).toBe('line1\nline2');
  });
});
