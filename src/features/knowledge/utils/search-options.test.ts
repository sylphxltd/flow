import { describe, it, expect } from 'vitest';
import {
  validateLimit,
  validateQuery,
  buildSearchOptions,
  normalizeQuery,
  validateAndNormalizeQuery,
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

describe('validateQuery', () => {
  it('should accept valid queries', () => {
    const result = validateQuery('react hooks');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe('react hooks');
    }
  });

  it('should trim and validate', () => {
    const result = validateQuery('  typescript  ');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe('typescript');
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
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.limit).toBe(20);
      expect(result.value.include_content).toBe(false);
    }
  });

  it('should parse string limit', () => {
    const result = buildSearchOptions({
      limit: '15',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.limit).toBe(15);
    }
  });

  it('should propagate validation errors', () => {
    const result = buildSearchOptions({ limit: -1 });
    expect(isFailure(result)).toBe(true);
  });

  it('should default includeContent to true', () => {
    const result = buildSearchOptions({ limit: 10 });
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.include_content).toBe(true);
    }
  });
});

describe('normalizeQuery', () => {
  it('should trim whitespace', () => {
    expect(normalizeQuery('  hello  ')).toBe('hello');
  });

  it('should preserve internal whitespace', () => {
    expect(normalizeQuery('  react native  ')).toBe('react native');
  });

  it('should handle already normalized', () => {
    expect(normalizeQuery('typescript')).toBe('typescript');
  });
});

describe('validateAndNormalizeQuery', () => {
  it('should normalize and validate', () => {
    const result = validateAndNormalizeQuery('  react hooks  ');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe('react hooks');
    }
  });

  it('should reject empty after normalization', () => {
    expect(isFailure(validateAndNormalizeQuery('   '))).toBe(true);
  });

  it('should reject too long after normalization', () => {
    const longQuery = ' ' + 'a'.repeat(501) + ' ';
    expect(isFailure(validateAndNormalizeQuery(longQuery))).toBe(true);
  });
});
