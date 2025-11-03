/**
 * Tests for attachment token management
 */

import { describe, it, expect } from 'vitest';
import {
  setTokenCount,
  getTokenCount,
  removeTokenCount,
  getTotalTokens,
  clearTokenCounts,
  setBatchTokenCounts,
} from './tokens.js';

describe('setTokenCount', () => {
  it('should set token count for path', () => {
    const tokens = new Map<string, number>();
    const result = setTokenCount(tokens, 'file.ts', 1500);
    expect(result.get('file.ts')).toBe(1500);
  });

  it('should update existing token count', () => {
    const tokens = new Map([['file.ts', 1000]]);
    const result = setTokenCount(tokens, 'file.ts', 1500);
    expect(result.get('file.ts')).toBe(1500);
  });

  it('should not mutate original map', () => {
    const tokens = new Map<string, number>();
    setTokenCount(tokens, 'file.ts', 1500);
    expect(tokens.size).toBe(0);
  });
});

describe('getTokenCount', () => {
  it('should get token count for path', () => {
    const tokens = new Map([['file.ts', 1500]]);
    expect(getTokenCount(tokens, 'file.ts')).toBe(1500);
  });

  it('should return undefined for missing path', () => {
    const tokens = new Map<string, number>();
    expect(getTokenCount(tokens, 'file.ts')).toBeUndefined();
  });
});

describe('removeTokenCount', () => {
  it('should remove token count for path', () => {
    const tokens = new Map([
      ['file1.ts', 1000],
      ['file2.ts', 2000],
    ]);
    const result = removeTokenCount(tokens, 'file1.ts');
    expect(result.size).toBe(1);
    expect(result.has('file1.ts')).toBe(false);
    expect(result.get('file2.ts')).toBe(2000);
  });

  it('should handle removing non-existent path', () => {
    const tokens = new Map([['file.ts', 1000]]);
    const result = removeTokenCount(tokens, 'missing.ts');
    expect(result.size).toBe(1);
  });

  it('should not mutate original map', () => {
    const tokens = new Map([['file.ts', 1000]]);
    removeTokenCount(tokens, 'file.ts');
    expect(tokens.size).toBe(1);
  });
});

describe('getTotalTokens', () => {
  it('should sum all token counts', () => {
    const tokens = new Map([
      ['file1.ts', 1000],
      ['file2.ts', 1500],
      ['file3.ts', 2000],
    ]);
    expect(getTotalTokens(tokens)).toBe(4500);
  });

  it('should return 0 for empty map', () => {
    const tokens = new Map<string, number>();
    expect(getTotalTokens(tokens)).toBe(0);
  });

  it('should handle single entry', () => {
    const tokens = new Map([['file.ts', 1500]]);
    expect(getTotalTokens(tokens)).toBe(1500);
  });
});

describe('clearTokenCounts', () => {
  it('should return empty map', () => {
    const result = clearTokenCounts();
    expect(result.size).toBe(0);
  });
});

describe('setBatchTokenCounts', () => {
  it('should set multiple token counts', () => {
    const tokens = new Map<string, number>();
    const counts = {
      'file1.ts': 1000,
      'file2.ts': 1500,
      'file3.ts': 2000,
    };
    const result = setBatchTokenCounts(tokens, counts);
    expect(result.size).toBe(3);
    expect(result.get('file1.ts')).toBe(1000);
    expect(result.get('file2.ts')).toBe(1500);
    expect(result.get('file3.ts')).toBe(2000);
  });

  it('should merge with existing counts', () => {
    const tokens = new Map([['existing.ts', 500]]);
    const counts = {
      'file1.ts': 1000,
      'file2.ts': 1500,
    };
    const result = setBatchTokenCounts(tokens, counts);
    expect(result.size).toBe(3);
    expect(result.get('existing.ts')).toBe(500);
    expect(result.get('file1.ts')).toBe(1000);
  });

  it('should override existing counts', () => {
    const tokens = new Map([['file.ts', 1000]]);
    const counts = { 'file.ts': 2000 };
    const result = setBatchTokenCounts(tokens, counts);
    expect(result.get('file.ts')).toBe(2000);
  });

  it('should not mutate original map', () => {
    const tokens = new Map<string, number>();
    const counts = { 'file.ts': 1000 };
    setBatchTokenCounts(tokens, counts);
    expect(tokens.size).toBe(0);
  });
});
