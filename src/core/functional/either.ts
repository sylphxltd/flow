/**
 * Either type for representing values that can be one of two types
 * Commonly used for success/error, but more general than Result
 *
 * DESIGN RATIONALE:
 * - Generic sum type for two possibilities
 * - Left traditionally represents error/failure
 * - Right traditionally represents success/value
 * - Result is a specialized Either<Error, Value>
 */

export type Either<L, R> = Left<L> | Right<R>;

export interface Left<L> {
  readonly _tag: 'Left';
  readonly left: L;
}

export interface Right<R> {
  readonly _tag: 'Right';
  readonly right: R;
}

/**
 * Constructors
 */

export const left = <L>(value: L): Left<L> => ({
  _tag: 'Left',
  left: value,
});

export const right = <R>(value: R): Right<R> => ({
  _tag: 'Right',
  right: value,
});

/**
 * Type guards
 */

export const isLeft = <L, R>(either: Either<L, R>): either is Left<L> =>
  either._tag === 'Left';

export const isRight = <L, R>(either: Either<L, R>): either is Right<R> =>
  either._tag === 'Right';

/**
 * Transformations
 */

export const map = <L, R, R2>(fn: (value: R) => R2) => (either: Either<L, R>): Either<L, R2> => {
  if (isRight(either)) {
    return right(fn(either.right));
  }
  return either;
};

export const mapLeft = <L, L2, R>(fn: (value: L) => L2) => (either: Either<L, R>): Either<L2, R> => {
  if (isLeft(either)) {
    return left(fn(either.left));
  }
  return either;
};

export const flatMap =
  <L, R, R2>(fn: (value: R) => Either<L, R2>) =>
  (either: Either<L, R>): Either<L, R2> => {
    if (isRight(either)) {
      return fn(either.right);
    }
    return either;
  };

/**
 * Pattern matching
 */
export const match =
  <L, R, T>(onLeft: (left: L) => T, onRight: (right: R) => T) =>
  (either: Either<L, R>): T => {
    if (isLeft(either)) {
      return onLeft(either.left);
    }
    return onRight(either.right);
  };

/**
 * Extract value or provide default
 */
export const getOrElse =
  <R>(defaultValue: R) =>
  <L>(either: Either<L, R>): R => {
    if (isRight(either)) {
      return either.right;
    }
    return defaultValue;
  };

/**
 * Swap Left and Right
 */
export const swap = <L, R>(either: Either<L, R>): Either<R, L> => {
  if (isLeft(either)) {
    return right(either.left);
  }
  return left(either.right);
};
