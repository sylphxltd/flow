import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Error from 'effect/Error';
import * as S from '@effect/schema/Schema';

export class InfraError extends Error.TaggedError('InfraError')<{ readonly message: string; readonly code?: string }>() {}
export class DomainError extends Error.TaggedError('DomainError')<{ readonly message: string; readonly field?: string }>() {}
export class AppError extends Error.TaggedError('AppError')<{ readonly message: string; readonly cause?: unknown }>() {}

// Schemas for validation
export const InfraErrorSchema = S.Struct({
  _tag: S.Literal('InfraError'),
  message: S.String,
  code: S.Optional(S.String)
});

export const DomainErrorSchema = S.Struct({
  _tag: S.Literal('DomainError'),
  message: S.String,
  field: S.Optional(S.String)
});

export const AppErrorSchema = S.Struct({
  _tag: S.Literal('AppError'),
  message: S.String,
  cause: S.Optional(S.Unknown)
});

export type ErrorUnion =
  | S.Schema.To<typeof InfraErrorSchema>
  | S.Schema.To<typeof DomainErrorSchema>
  | S.Schema.To<typeof AppErrorSchema>;

// Matcher for errors
export const matchError = (error: ErrorUnion) => pipe(
  error,
  ({ _tag, message, code, field }) => {
    switch (_tag) {
      case 'InfraError':
        return `Infrastructure issue: ${message}${code ? ` (Code: ${code})` : ''}`;
      case 'DomainError':
        return `Domain violation: ${message}${field ? ` (Field: ${field})` : ''}`;
      case 'AppError':
        return `Application error: ${message}`;
      default:
        return `Unknown error: ${message}`;
    }
  }
);
