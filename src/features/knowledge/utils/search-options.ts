/**
 * Knowledge Search Options Utilities
 * Pure functions for validating and building search options
 */

import type { Result } from '../../../core/functional/result.js';
import { success, failure } from '../../../core/functional/result.js';
import type { AppError } from '../../../core/functional/error-types.js';
import { validationError } from '../../../core/functional/error-types.js';
import { validateLimit as validateLimitCore } from '../../../core/validation/limit.js';

// ===== Types =====

export interface SearchOptions {
  limit: number;
  include_content: boolean;
}

export interface RawSearchOptions {
  limit?: string | number;
  includeContent?: boolean;
}

// ===== Validation =====

/**
 * Validate search limit for knowledge queries
 * Pure - delegates to shared validation with knowledge-specific defaults
 * Default: 10, Max: 100
 */
export function validateLimit(limit: string | number | undefined): Result<number, AppError> {
  return validateLimitCore(limit, 10, 100);
}

/**
 * Validate query string
 * Pure - string validation
 */
export function validateQuery(query: string): Result<string, AppError> {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return failure(validationError('Query cannot be empty', 'query', query));
  }

  if (trimmed.length > 500) {
    return failure(
      validationError('Query cannot exceed 500 characters', 'query', trimmed.substring(0, 50))
    );
  }

  return success(trimmed);
}

// ===== Option Building =====

/**
 * Build search options from raw input
 * Pure - object construction with validation
 */
export function buildSearchOptions(raw: RawSearchOptions): Result<SearchOptions, AppError> {
  const limitResult = validateLimit(raw.limit);

  if (limitResult._tag === 'Failure') {
    return limitResult;
  }

  return success({
    limit: limitResult.value,
    include_content: raw.includeContent !== false, // Default true
  });
}

// ===== Query Normalization =====

/**
 * Normalize query string
 * Pure - string transformation
 */
export function normalizeQuery(query: string): string {
  return query.trim();
}

/**
 * Validate and normalize query
 * Pure - composition of validation and normalization
 */
export function validateAndNormalizeQuery(query: string): Result<string, AppError> {
  const normalized = normalizeQuery(query);
  return validateQuery(normalized);
}
