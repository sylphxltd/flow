import { describe, it, expect } from 'vitest';
import {
  validateLimit,
  validateFileExtensions,
  validatePathPattern,
  buildSearchOptions,
  normalizeQuery,
  validateQuery,
} from './search-options.js';
import { isSuccess, isFailure } from '../../../core/functional/result.js';

describe('validateLimit', () => {
  it('should accept valid numbers', () => {
    const result = validateLimit(10);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe(10);
    }
  });

  it('should parse string numbers', () => {
    const result = validateLimit('25');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe(25);
    }
  });

  it('should default to 10 when undefined', () => {
    const result = validateLimit(undefined);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe(10);
    }
  });

  it('should reject negative numbers', () => {
    const result = validateLimit(-5);
    expect(isFailure(result)).toBe(true);
  });

  it('should reject zero', () => {
    const result = validateLimit(0);
    expect(isFailure(result)).toBe(true);
  });

  it('should reject numbers over 100', () => {
    const result = validateLimit(150);
    expect(isFailure(result)).toBe(true);
  });

  it('should reject invalid strings', () => {
    const result = validateLimit('abc');
    expect(isFailure(result)).toBe(true);
  });
});

describe('validateFileExtensions', () => {
  it('should return undefined for empty array', () => {
    const result = validateFileExtensions([]);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBeUndefined();
    }
  });

  it('should normalize extensions without dots', () => {
    const result = validateFileExtensions(['ts', 'js']);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual(['.ts', '.js']);
    }
  });

  it('should preserve extensions with dots', () => {
    const result = validateFileExtensions(['.tsx', '.jsx']);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual(['.tsx', '.jsx']);
    }
  });
});

describe('validatePathPattern', () => {
  it('should accept valid paths', () => {
    const result = validatePathPattern('src/components');
    expect(isSuccess(result)).toBe(true);
  });

  it('should return undefined for empty pattern', () => {
    const result = validatePathPattern(undefined);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBeUndefined();
    }
  });

  it('should reject paths with invalid characters', () => {
    expect(isFailure(validatePathPattern('src<>test'))).toBe(true);
    expect(isFailure(validatePathPattern('src|test'))).toBe(true);
    expect(isFailure(validatePathPattern('src"test'))).toBe(true);
  });
});

describe('buildSearchOptions', () => {
  it('should build options with defaults', () => {
    const result = buildSearchOptions({});
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.limit).toBe(10);
      expect(result.value.include_content).toBe(true);
    }
  });

  it('should build options with all parameters', () => {
    const result = buildSearchOptions({
      limit: 20,
      includeContent: false,
      extensions: ['ts', 'tsx'],
      path: 'src/components',
      exclude: ['node_modules', 'dist'],
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.limit).toBe(20);
      expect(result.value.include_content).toBe(false);
      expect(result.value.file_extensions).toEqual(['.ts', '.tsx']);
      expect(result.value.path_filter).toBe('src/components');
      expect(result.value.exclude_paths).toEqual(['node_modules', 'dist']);
    }
  });

  it('should propagate validation errors', () => {
    const result = buildSearchOptions({ limit: -1 });
    expect(isFailure(result)).toBe(true);
  });
});

describe('normalizeQuery', () => {
  it('should trim whitespace', () => {
    expect(normalizeQuery('  hello  ')).toBe('hello');
  });

  it('should preserve internal whitespace', () => {
    expect(normalizeQuery('  hello world  ')).toBe('hello world');
  });
});

describe('validateQuery', () => {
  it('should accept valid queries', () => {
    const result = validateQuery('search term');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe('search term');
    }
  });

  it('should trim and validate', () => {
    const result = validateQuery('  query  ');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe('query');
    }
  });

  it('should reject empty queries', () => {
    expect(isFailure(validateQuery(''))).toBe(true);
    expect(isFailure(validateQuery('   '))).toBe(true);
  });

  it('should reject queries over 500 characters', () => {
    const longQuery = 'a'.repeat(501);
    expect(isFailure(validateQuery(longQuery))).toBe(true);
  });
});
