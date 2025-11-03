/**
 * Codebase Search Options Utilities
 * Pure functions for building and validating search options
 */

import type { Result } from '../../../core/functional/result.js';
import { success, failure } from '../../../core/functional/result.js';
import type { AppError } from '../../../core/functional/error-types.js';
import { validationError } from '../../../core/functional/error-types.js';
import { normalizeQuery as normalizeQueryCore } from '../../../core/validation/query.js';

// ===== Types =====

export interface SearchOptions {
  limit: number;
  include_content: boolean;
  file_extensions?: string[];
  path_filter?: string;
  exclude_paths?: string[];
}

export interface RawSearchOptions {
  limit?: string | number;
  includeContent?: boolean;
  extensions?: string[];
  path?: string;
  exclude?: string[];
}

// ===== Validation =====

/**
 * Validate limit parameter
 * Pure - number validation
 */
export function validateLimit(limit: string | number | undefined): Result<number, AppError> {
  // Default to 10 if not provided
  if (limit === undefined) {
    return success(10);
  }

  const numLimit = typeof limit === 'string' ? Number.parseInt(limit, 10) : limit;

  if (Number.isNaN(numLimit) || numLimit < 1) {
    return failure(validationError('Limit must be a positive number', 'limit', limit));
  }

  if (numLimit > 100) {
    return failure(
      validationError('Limit cannot exceed 100', 'limit', limit)
    );
  }

  return success(numLimit);
}

/**
 * Validate file extensions
 * Pure - array validation
 */
export function validateFileExtensions(
  extensions: string[] | undefined
): Result<string[] | undefined, AppError> {
  if (!extensions || extensions.length === 0) {
    return success(undefined);
  }

  // Ensure all extensions start with a dot
  const normalized = extensions.map((ext) => {
    if (ext.startsWith('.')) {
      return ext;
    }
    return `.${ext}`;
  });

  return success(normalized);
}

/**
 * Validate path pattern
 * Pure - string validation
 */
export function validatePathPattern(
  pattern: string | undefined
): Result<string | undefined, AppError> {
  if (!pattern) {
    return success(undefined);
  }

  // Check for invalid characters
  if (/[<>"|?*]/.test(pattern)) {
    return failure(
      validationError(
        'Path pattern contains invalid characters',
        'pathPattern',
        pattern
      )
    );
  }

  return success(pattern);
}

// ===== Building =====

/**
 * Build search options from raw CLI options
 * Pure - option transformation
 */
export function buildSearchOptions(raw: RawSearchOptions): Result<SearchOptions, AppError> {
  const limitResult = validateLimit(raw.limit);
  if (limitResult._tag === 'Failure') {
    return limitResult;
  }

  const extensionsResult = validateFileExtensions(raw.extensions);
  if (extensionsResult._tag === 'Failure') {
    return extensionsResult;
  }

  const pathResult = validatePathPattern(raw.path);
  if (pathResult._tag === 'Failure') {
    return pathResult;
  }

  return success({
    limit: limitResult.value,
    include_content: raw.includeContent !== false,
    file_extensions: extensionsResult.value,
    path_filter: pathResult.value,
    exclude_paths: raw.exclude,
  });
}

// ===== Query Processing =====

/**
 * Normalize search query for codebase searches
 * Pure - delegates to shared normalization
 */
export function normalizeQuery(query: string): string {
  return normalizeQueryCore(query);
}

/**
 * Validate search query
 * Pure - string validation
 */
export function validateQuery(query: string): Result<string, AppError> {
  const normalized = normalizeQuery(query);

  if (normalized.length === 0) {
    return failure(validationError('Search query cannot be empty', 'query', query));
  }

  if (normalized.length > 500) {
    return failure(
      validationError('Search query too long (max 500 characters)', 'query', query)
    );
  }

  return success(normalized);
}
