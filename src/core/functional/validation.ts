/**
 * Validation utilities for accumulating errors
 * Unlike Result which short-circuits on first error,
 * Validation accumulates all errors
 *
 * DESIGN RATIONALE:
 * - Form validation needs all errors, not just first
 * - Applicative functor for combining validations
 * - Errors accumulated in array
 * - Success only if all validations pass
 */

import type { Result } from './result.js';
import { failure, isSuccess, success } from './result.js';

/**
 * Validation result with accumulated errors
 */
export type Validation<T, E = string> = Result<T, E[]>;

/**
 * Create a successful validation
 */
export const valid = <T, E = string>(value: T): Validation<T, E> => success(value);

/**
 * Create a failed validation with one or more errors
 */
export const invalid = <T, E = string>(...errors: E[]): Validation<T, E> => failure(errors);

/**
 * Combine multiple validations
 * Collects all errors if any validation fails
 */
export const combine = <T, E = string>(validations: Validation<T, E>[]): Validation<T[], E> => {
  const values: T[] = [];
  const errors: E[] = [];

  for (const validation of validations) {
    if (isSuccess(validation)) {
      values.push(validation.value);
    } else {
      errors.push(...validation.error);
    }
  }

  if (errors.length > 0) {
    return invalid(...errors);
  }

  return valid(values);
};

/**
 * Validate a value against multiple validators
 * Returns first error or success
 */
export const validateAll =
  <T, E = string>(...validators: Array<(value: T) => Validation<T, E>>) =>
  (value: T): Validation<T, E> => {
    const errors: E[] = [];

    for (const validator of validators) {
      const result = validator(value);
      if (!isSuccess(result)) {
        errors.push(...result.error);
      }
    }

    if (errors.length > 0) {
      return invalid(...errors);
    }

    return valid(value);
  };

/**
 * Common validators
 */

export const nonEmpty =
  (message: string) =>
  (value: string): Validation<string, string> => {
    if (value.trim().length === 0) {
      return invalid(message);
    }
    return valid(value);
  };

export const minLength =
  (min: number, message: string) =>
  (value: string): Validation<string, string> => {
    if (value.length < min) {
      return invalid(message);
    }
    return valid(value);
  };

export const maxLength =
  (max: number, message: string) =>
  (value: string): Validation<string, string> => {
    if (value.length > max) {
      return invalid(message);
    }
    return valid(value);
  };

export const matches =
  (pattern: RegExp, message: string) =>
  (value: string): Validation<string, string> => {
    if (!pattern.test(value)) {
      return invalid(message);
    }
    return valid(value);
  };

export const isEmail = (message: string) => matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);

export const isUrl = (message: string) => matches(/^https?:\/\/.+/, message);

export const isNumber =
  (message: string) =>
  (value: string): Validation<number, string> => {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return invalid(message);
    }
    return valid(num);
  };

export const range =
  (min: number, max: number, message: string) =>
  (value: number): Validation<number, string> => {
    if (value < min || value > max) {
      return invalid(message);
    }
    return valid(value);
  };
