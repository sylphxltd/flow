/**
 * Knowledge URI Parsing Utilities
 * Pure functions for parsing and extracting information from knowledge URIs
 */

import type { Result } from '../../../core/functional/result.js';
import { success, failure } from '../../../core/functional/result.js';
import type { AppError } from '../../../core/functional/error-types.js';
import { validationError } from '../../../core/functional/error-types.js';

// ===== Types =====

export interface ParsedURI {
  protocol: string;
  category: string;
  name: string;
  fullURI: string;
}

export type KnowledgeCategory = 'stacks' | 'guides' | 'universal' | 'data' | 'unknown';

// ===== URI Validation =====

/**
 * Validate knowledge URI format
 * Pure - string validation
 */
export function validateKnowledgeURI(uri: string): Result<string, AppError> {
  if (!uri || uri.trim().length === 0) {
    return failure(validationError('Knowledge URI cannot be empty', 'uri', uri));
  }

  if (!uri.startsWith('knowledge://')) {
    return failure(
      validationError('Knowledge URI must start with "knowledge://"', 'uri', uri)
    );
  }

  return success(uri);
}

// ===== URI Parsing =====

/**
 * Extract category from knowledge URI
 * Pure - string extraction
 */
export function extractCategory(uri: string): KnowledgeCategory {
  const parts = uri.split('/');
  if (parts.length >= 3) {
    const category = parts[2];
    if (
      category === 'stacks' ||
      category === 'guides' ||
      category === 'universal' ||
      category === 'data'
    ) {
      return category;
    }
  }
  return 'unknown';
}

/**
 * Extract name from knowledge URI
 * Pure - string extraction
 */
export function extractName(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] || 'Unknown';
}

/**
 * Parse knowledge URI into components
 * Pure - string parsing
 */
export function parseKnowledgeURI(uri: string): Result<ParsedURI, AppError> {
  const validationResult = validateKnowledgeURI(uri);
  if (validationResult._tag === 'Failure') {
    return validationResult;
  }

  const category = extractCategory(uri);
  const name = extractName(uri);
  const protocol = uri.split('://')[0] || 'unknown';

  return success({
    protocol,
    category,
    name,
    fullURI: uri,
  });
}

// ===== URI Filtering =====

/**
 * Filter URIs by category
 * Pure - array filtering
 */
export function filterByCategory(uris: string[], category: string): string[] {
  return uris.filter((uri) => uri.includes(`/${category}/`));
}

/**
 * Group URIs by category
 * Pure - array grouping
 */
export function groupByCategory(uris: string[]): Record<string, string[]> {
  return uris.reduce(
    (acc, uri) => {
      const category = extractCategory(uri);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(uri);
      return acc;
    },
    {} as Record<string, string[]>
  );
}

// ===== URI Sorting =====

/**
 * Sort URIs alphabetically
 * Pure - array sorting
 */
export function sortURIs(uris: string[]): string[] {
  return [...uris].sort((a, b) => a.localeCompare(b));
}

/**
 * Sort categories by priority
 * Pure - array sorting
 */
export function sortCategories(categories: string[]): string[] {
  const priority: Record<string, number> = {
    stacks: 1,
    guides: 2,
    universal: 3,
    data: 4,
    unknown: 5,
  };

  return [...categories].sort((a, b) => {
    const priorityA = priority[a] ?? 999;
    const priorityB = priority[b] ?? 999;
    return priorityA - priorityB;
  });
}

// ===== Category Formatting =====

/**
 * Capitalize category name
 * Pure - string formatting
 */
export function capitalizeCategoryName(category: string): string {
  if (!category || category.length === 0) {
    return 'Unknown';
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
}
