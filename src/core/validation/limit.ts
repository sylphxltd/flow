/**
 * Limit Validation Utilities
 * Shared validation for limit parameters across features
 */

import type { Result } from '../functional/result.js';
import { success, failure } from '../functional/result.js';
import type { AppError } from '../functional/error-types.js';
import { validationError } from '../functional/error-types.js';

/**
 * Validate limit parameter with configurable defaults and max
 * Pure - validation with explicit parameters
 *
 * @param limit - The limit value to validate (string, number, or undefined)
 * @param defaultLimit - Default limit if undefined (default: 50)
 * @param maxLimit - Maximum allowed limit (default: 1000)
 * @returns Result with validated limit number or validation error
 *
 * @example
 * validateLimit(undefined, 10, 100) // success(10)
 * validateLimit('50', 10, 100) // success(50)
 * validateLimit('150', 10, 100) // failure("Limit cannot exceed 100")
 * validateLimit('invalid', 10, 100) // failure("Limit must be a positive number")
 */
export function validateLimit(
  limit: string | number | undefined,
  defaultLimit: number = 50,
  maxLimit: number = 1000
): Result<number, AppError> {
  if (limit === undefined) {
    return success(defaultLimit);
  }

  const numLimit = typeof limit === 'string' ? Number.parseInt(limit, 10) : limit;

  if (Number.isNaN(numLimit) || numLimit < 1) {
    return failure(validationError('Limit must be a positive number', 'limit', limit));
  }

  if (numLimit > maxLimit) {
    return failure(validationError(`Limit cannot exceed ${maxLimit}`, 'limit', limit));
  }

  return success(numLimit);
}
