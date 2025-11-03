/**
 * Memory Filtering Utilities
 * Pure functions for filtering and searching memory entries
 */

import type { Result } from '../../../core/functional/result.js';
import { success, failure } from '../../../core/functional/result.js';
import type { AppError } from '../../../core/functional/error-types.js';
import { validationError } from '../../../core/functional/error-types.js';

// ===== Types =====

export interface MemoryEntry {
  key: string;
  namespace: string;
  value: unknown;
  timestamp: number;
  created_at: string;
  updated_at: string;
}

// ===== Namespace Filtering =====

/**
 * Filter entries by namespace
 * Pure - array filtering
 */
export function filterByNamespace(
  entries: MemoryEntry[],
  namespace: string
): MemoryEntry[] {
  if (namespace === 'all') {
    return entries;
  }

  return entries.filter((entry) => entry.namespace === namespace);
}

/**
 * Get unique namespaces from entries
 * Pure - array transformation
 */
export function getUniqueNamespaces(entries: MemoryEntry[]): string[] {
  const namespaces = new Set(entries.map((entry) => entry.namespace));
  return Array.from(namespaces).sort();
}

/**
 * Count entries per namespace
 * Pure - aggregation
 */
export function countEntriesPerNamespace(entries: MemoryEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const entry of entries) {
    counts[entry.namespace] = (counts[entry.namespace] || 0) + 1;
  }

  return counts;
}

// ===== Pattern Matching =====

/**
 * Check if key matches pattern
 * Pure - pattern matching
 */
export function keyMatchesPattern(key: string, pattern: string): boolean {
  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
    .replace(/\\\*/g, '.*') // Convert * to .*
    .replace(/\\_/g, '.'); // Convert _ to .

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(key);
}

/**
 * Search entries by key pattern
 * Pure - array filtering
 */
export function searchByPattern(
  entries: MemoryEntry[],
  pattern: string,
  namespace?: string
): MemoryEntry[] {
  let filtered = entries;

  // Filter by namespace first if specified
  if (namespace && namespace !== 'all') {
    filtered = filterByNamespace(filtered, namespace);
  }

  // Filter by pattern
  return filtered.filter((entry) => keyMatchesPattern(entry.key, pattern));
}

// ===== Limiting & Pagination =====

/**
 * Validate limit parameter
 * Pure - validation
 */
export function validateLimit(limit: string | number | undefined): Result<number, AppError> {
  if (limit === undefined) {
    return success(50); // Default limit
  }

  const numLimit = typeof limit === 'string' ? Number.parseInt(limit, 10) : limit;

  if (Number.isNaN(numLimit) || numLimit < 1) {
    return failure(validationError('Limit must be a positive number', 'limit', limit));
  }

  if (numLimit > 1000) {
    return failure(validationError('Limit cannot exceed 1000', 'limit', limit));
  }

  return success(numLimit);
}

/**
 * Apply limit to entries
 * Pure - array slicing
 */
export function applyLimit(entries: MemoryEntry[], limit: number): MemoryEntry[] {
  return entries.slice(0, limit);
}

/**
 * Paginate entries
 * Pure - pagination logic
 */
export function paginateEntries(
  entries: MemoryEntry[],
  page: number,
  pageSize: number
): {
  items: MemoryEntry[];
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(entries.length / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: entries.slice(start, end),
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
}

// ===== Sorting =====

/**
 * Sort entries by timestamp (newest first)
 * Pure - array sorting
 */
export function sortByTimestampDesc(entries: MemoryEntry[]): MemoryEntry[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Sort entries by timestamp (oldest first)
 * Pure - array sorting
 */
export function sortByTimestampAsc(entries: MemoryEntry[]): MemoryEntry[] {
  return [...entries].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Sort entries by key alphabetically
 * Pure - array sorting
 */
export function sortByKey(entries: MemoryEntry[]): MemoryEntry[] {
  return [...entries].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Sort entries by namespace then key
 * Pure - array sorting
 */
export function sortByNamespaceAndKey(entries: MemoryEntry[]): MemoryEntry[] {
  return [...entries].sort((a, b) => {
    const nsCompare = a.namespace.localeCompare(b.namespace);
    if (nsCompare !== 0) {
      return nsCompare;
    }
    return a.key.localeCompare(b.key);
  });
}

// ===== Stats =====

/**
 * Calculate memory statistics
 * Pure - stats calculation
 */
export function calculateMemoryStats(entries: MemoryEntry[]): {
  total: number;
  namespaces: number;
  oldest?: string;
  newest?: string;
} {
  if (entries.length === 0) {
    return {
      total: 0,
      namespaces: 0,
    };
  }

  const sorted = sortByTimestampAsc(entries);
  const uniqueNamespaces = getUniqueNamespaces(entries);

  return {
    total: entries.length,
    namespaces: uniqueNamespaces.length,
    oldest: sorted[0].created_at,
    newest: sorted[sorted.length - 1].created_at,
  };
}
