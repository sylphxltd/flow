import { describe, it, expect } from 'vitest';
import {
  filterByNamespace,
  getUniqueNamespaces,
  countEntriesPerNamespace,
  keyMatchesPattern,
  searchByPattern,
  validateLimit,
  applyLimit,
  paginateEntries,
  sortByTimestampDesc,
  sortByKey,
  calculateMemoryStats,
  type MemoryEntry,
} from './filtering.js';
import { isSuccess, isFailure } from '../../../core/functional/result.js';

const createEntry = (key: string, namespace: string, timestamp: number): MemoryEntry => ({
  key,
  namespace,
  value: {},
  timestamp,
  created_at: new Date(timestamp).toISOString(),
  updated_at: new Date(timestamp).toISOString(),
});

describe('filterByNamespace', () => {
  const entries = [
    createEntry('key1', 'default', 1000),
    createEntry('key2', 'user', 2000),
    createEntry('key3', 'default', 3000),
  ];

  it('should return all entries for "all"', () => {
    expect(filterByNamespace(entries, 'all')).toHaveLength(3);
  });

  it('should filter by specific namespace', () => {
    const result = filterByNamespace(entries, 'default');
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.namespace === 'default')).toBe(true);
  });
});

describe('getUniqueNamespaces', () => {
  it('should return unique namespaces sorted', () => {
    const entries = [
      createEntry('k1', 'user', 1000),
      createEntry('k2', 'default', 2000),
      createEntry('k3', 'user', 3000),
    ];

    const result = getUniqueNamespaces(entries);
    expect(result).toEqual(['default', 'user']);
  });
});

describe('countEntriesPerNamespace', () => {
  it('should count entries per namespace', () => {
    const entries = [
      createEntry('k1', 'user', 1000),
      createEntry('k2', 'default', 2000),
      createEntry('k3', 'user', 3000),
    ];

    const result = countEntriesPerNamespace(entries);
    expect(result).toEqual({ user: 2, default: 1 });
  });
});

describe('keyMatchesPattern', () => {
  it('should match exact keys', () => {
    expect(keyMatchesPattern('test', 'test')).toBe(true);
  });

  it('should match wildcard patterns', () => {
    expect(keyMatchesPattern('test123', 'test*')).toBe(true);
    expect(keyMatchesPattern('testABC', 'test*')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(keyMatchesPattern('TEST', 'test')).toBe(true);
  });

  it('should not match different keys', () => {
    expect(keyMatchesPattern('other', 'test')).toBe(false);
  });
});

describe('searchByPattern', () => {
  const entries = [
    createEntry('user_1', 'default', 1000),
    createEntry('user_2', 'default', 2000),
    createEntry('admin_1', 'admin', 3000),
  ];

  it('should search by pattern', () => {
    const result = searchByPattern(entries, 'user*');
    expect(result).toHaveLength(2);
  });

  it('should filter by namespace and pattern', () => {
    const result = searchByPattern(entries, '*_1', 'default');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('user_1');
  });
});

describe('validateLimit', () => {
  it('should default to 50', () => {
    const result = validateLimit(undefined);
    expect(isSuccess(result) && result.value).toBe(50);
  });

  it('should accept valid numbers', () => {
    const result = validateLimit(25);
    expect(isSuccess(result) && result.value).toBe(25);
  });

  it('should reject invalid values', () => {
    expect(isFailure(validateLimit(-1))).toBe(true);
    expect(isFailure(validateLimit(2000))).toBe(true);
  });
});

describe('applyLimit', () => {
  it('should limit entries', () => {
    const entries = [
      createEntry('k1', 'default', 1000),
      createEntry('k2', 'default', 2000),
      createEntry('k3', 'default', 3000),
    ];

    expect(applyLimit(entries, 2)).toHaveLength(2);
  });
});

describe('paginateEntries', () => {
  const entries = Array.from({ length: 25 }, (_, i) => createEntry(`k${i}`, 'default', i));

  it('should paginate correctly', () => {
    const result = paginateEntries(entries, 1, 10);

    expect(result.items).toHaveLength(10);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(1);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  it('should handle last page', () => {
    const result = paginateEntries(entries, 3, 10);

    expect(result.items).toHaveLength(5);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });
});

describe('sortByTimestampDesc', () => {
  it('should sort newest first', () => {
    const entries = [
      createEntry('k1', 'default', 1000),
      createEntry('k2', 'default', 3000),
      createEntry('k3', 'default', 2000),
    ];

    const result = sortByTimestampDesc(entries);
    expect(result[0].timestamp).toBe(3000);
    expect(result[2].timestamp).toBe(1000);
  });
});

describe('sortByKey', () => {
  it('should sort alphabetically', () => {
    const entries = [
      createEntry('charlie', 'default', 1000),
      createEntry('alpha', 'default', 2000),
      createEntry('bravo', 'default', 3000),
    ];

    const result = sortByKey(entries);
    expect(result.map((e) => e.key)).toEqual(['alpha', 'bravo', 'charlie']);
  });
});

describe('calculateMemoryStats', () => {
  it('should calculate correct stats', () => {
    const entries = [
      createEntry('k1', 'user', 1000),
      createEntry('k2', 'default', 2000),
      createEntry('k3', 'user', 3000),
    ];

    const stats = calculateMemoryStats(entries);
    expect(stats.total).toBe(3);
    expect(stats.namespaces).toBe(2);
    expect(stats.oldest).toBeDefined();
    expect(stats.newest).toBeDefined();
  });

  it('should handle empty entries', () => {
    const stats = calculateMemoryStats([]);
    expect(stats.total).toBe(0);
    expect(stats.namespaces).toBe(0);
    expect(stats.oldest).toBeUndefined();
  });
});
