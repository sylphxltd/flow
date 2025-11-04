/**
 * Option type for representing optional values
 * Eliminates null/undefined and makes optionality explicit
 *
 * DESIGN RATIONALE:
 * - Makes absence of value explicit at type level
 * - Eliminates null pointer errors
 * - Composable through map/flatMap
 * - Forces handling of missing values
 */

export type Option<T> = Some<T> | None;

export interface Some<T> {
  readonly _tag: 'Some';
  readonly value: T;
}

export interface None {
  readonly _tag: 'None';
}

/**
 * Constructors
 */

export const some = <T>(value: T): Some<T> => ({
  _tag: 'Some',
  value,
});

export const none: None = {
  _tag: 'None',
};

/**
 * Create Option from nullable value
 */
export const fromNullable = <T>(value: T | null | undefined): Option<T> => {
  if (value === null || value === undefined) {
    return none;
  }
  return some(value);
};

/**
 * Type guards
 */

export const isSome = <T>(option: Option<T>): option is Some<T> => option._tag === 'Some';

export const isNone = <T>(option: Option<T>): option is None => option._tag === 'None';

/**
 * Transformations
 */

export const map =
  <T, U>(fn: (value: T) => U) =>
  (option: Option<T>): Option<U> => {
    if (isSome(option)) {
      return some(fn(option.value));
    }
    return none;
  };

export const flatMap =
  <T, U>(fn: (value: T) => Option<U>) =>
  (option: Option<T>): Option<U> => {
    if (isSome(option)) {
      return fn(option.value);
    }
    return none;
  };

/**
 * Extract value or provide default
 */
export const getOrElse =
  <T>(defaultValue: T) =>
  (option: Option<T>): T => {
    if (isSome(option)) {
      return option.value;
    }
    return defaultValue;
  };

/**
 * Extract value or compute default
 */
export const getOrElseLazy =
  <T>(fn: () => T) =>
  (option: Option<T>): T => {
    if (isSome(option)) {
      return option.value;
    }
    return fn();
  };

/**
 * Pattern matching
 */
export const match =
  <T, U>(onSome: (value: T) => U, onNone: () => U) =>
  (option: Option<T>): U => {
    if (isSome(option)) {
      return onSome(option.value);
    }
    return onNone();
  };

/**
 * Filter based on predicate
 */
export const filter =
  <T>(predicate: (value: T) => boolean) =>
  (option: Option<T>): Option<T> => {
    if (isSome(option) && predicate(option.value)) {
      return option;
    }
    return none;
  };

/**
 * Convert to nullable
 */
export const toNullable = <T>(option: Option<T>): T | null => {
  if (isSome(option)) {
    return option.value;
  }
  return null;
};

/**
 * Convert to undefined
 */
export const toUndefined = <T>(option: Option<T>): T | undefined => {
  if (isSome(option)) {
    return option.value;
  }
  return undefined;
};
