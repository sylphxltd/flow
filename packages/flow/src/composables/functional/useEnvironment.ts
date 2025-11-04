/**
 * Functional composable for environment variables
 * Type-safe access to environment with validation
 *
 * DESIGN RATIONALE:
 * - Explicit handling of missing variables
 * - Type-safe environment access
 * - Validation support
 * - Option type for optional values
 */

import type { ConfigError } from '../../core/functional/error-types.js';
import { configError } from '../../core/functional/error-types.js';
import type { Option } from '../../core/functional/option.js';
import { fromNullable } from '../../core/functional/option.js';
import type { Result } from '../../core/functional/result.js';
import { failure, success } from '../../core/functional/result.js';

/**
 * Get environment variable as Option
 * Returns Some(value) if exists, None otherwise
 */
export const getEnvOpt = (key: string): Option<string> => {
  return fromNullable(process.env[key]);
};

/**
 * Get environment variable or default
 */
export const getEnvOrElse = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

/**
 * Get required environment variable
 * Returns Result with error if missing
 */
export const getEnvRequired = (key: string): Result<string, ConfigError> => {
  const value = process.env[key];

  if (value === undefined || value === '') {
    return failure(
      configError(`Required environment variable is missing: ${key}`, { configKey: key })
    );
  }

  return success(value);
};

/**
 * Get multiple required environment variables
 * Returns Result with all errors if any are missing
 */
export const getEnvRequiredAll = (keys: string[]): Result<Record<string, string>, ConfigError> => {
  const missing: string[] = [];
  const values: Record<string, string> = {};

  for (const key of keys) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      missing.push(key);
    } else {
      values[key] = value;
    }
  }

  if (missing.length > 0) {
    return failure(
      configError(`Required environment variables are missing: ${missing.join(', ')}`, {
        context: { missing },
      })
    );
  }

  return success(values);
};

/**
 * Parse environment variable as number
 */
export const getEnvNumber = (key: string): Result<number, ConfigError> => {
  const value = process.env[key];

  if (value === undefined || value === '') {
    return failure(configError(`Environment variable is missing: ${key}`, { configKey: key }));
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return failure(
      configError(`Environment variable is not a valid number: ${key}`, {
        configKey: key,
        context: { value },
      })
    );
  }

  return success(parsed);
};

/**
 * Parse environment variable as boolean
 * Accepts: true, false, 1, 0, yes, no (case insensitive)
 */
export const getEnvBoolean = (key: string): Result<boolean, ConfigError> => {
  const value = process.env[key]?.toLowerCase();

  if (value === undefined || value === '') {
    return failure(configError(`Environment variable is missing: ${key}`, { configKey: key }));
  }

  const trueValues = ['true', '1', 'yes'];
  const falseValues = ['false', '0', 'no'];

  if (trueValues.includes(value)) {
    return success(true);
  }

  if (falseValues.includes(value)) {
    return success(false);
  }

  return failure(
    configError(`Environment variable is not a valid boolean: ${key}`, {
      configKey: key,
      context: { value },
    })
  );
};

/**
 * Parse environment variable as enum
 */
export const getEnvEnum = <T extends string>(
  key: string,
  allowedValues: readonly T[]
): Result<T, ConfigError> => {
  const value = process.env[key];

  if (value === undefined || value === '') {
    return failure(configError(`Environment variable is missing: ${key}`, { configKey: key }));
  }

  if (!allowedValues.includes(value as T)) {
    return failure(
      configError(`Environment variable has invalid value: ${key}`, {
        configKey: key,
        context: {
          value,
          allowedValues: allowedValues as unknown as string[],
        },
      })
    );
  }

  return success(value as T);
};

/**
 * Get all environment variables
 */
export const getAllEnv = (): NodeJS.ProcessEnv => {
  return process.env;
};

/**
 * Check if environment variable is set
 */
export const hasEnv = (key: string): boolean => {
  return key in process.env && process.env[key] !== undefined && process.env[key] !== '';
};
