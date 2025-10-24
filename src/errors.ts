/**
 * Effect-based error types for Sylphx Flow
 * Replaces custom CLIError with Effect's tagged error system
 */

import { Schema } from '@effect/schema';
import { Data } from 'effect';

/**
 * Base CLI error type
 */
export class CLIError extends Data.TaggedError('CLIError')<{
  readonly message: string;
  readonly code?: string;
}> {}

/**
 * Database-related errors
 */
export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  readonly message: string;
  readonly operation?: string;
  readonly cause?: unknown;
}> {}

/**
 * File system errors
 */
export class FileSystemError extends Data.TaggedError('FileSystemError')<{
  readonly message: string;
  readonly path?: string;
  readonly operation?: string;
  readonly cause?: unknown;
}> {}

/**
 * Configuration errors
 */
export class ConfigurationError extends Data.TaggedError('ConfigurationError')<{
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}> {}

/**
 * MCP server errors
 */
export class MCPError extends Data.TaggedError('MCPError')<{
  readonly message: string;
  readonly tool?: string;
  readonly cause?: unknown;
}> {}

/**
 * AI/LLM errors
 */
export class AIError extends Data.TaggedError('AIError')<{
  readonly message: string;
  readonly provider?: string;
  readonly model?: string;
  readonly cause?: unknown;
}> {}

/**
 * Validation errors
 */
export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}> {}

/**
 * Network errors
 */
export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly message: string;
  readonly url?: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

/**
 * Error schemas for validation
 */
export const CLIErrorSchema = Schema.Struct({
  _tag: Schema.Literal('CLIError'),
  message: Schema.String,
  code: Schema.optional(Schema.String),
});

export const DatabaseErrorSchema = Schema.Struct({
  _tag: Schema.Literal('DatabaseError'),
  message: Schema.String,
  operation: Schema.optional(Schema.String),
  cause: Schema.Unknown,
});

export const FileSystemErrorSchema = Schema.Struct({
  _tag: Schema.Literal('FileSystemError'),
  message: Schema.String,
  path: Schema.optional(Schema.String),
  operation: Schema.optional(Schema.String),
  cause: Schema.Unknown,
});

export const ConfigurationErrorSchema = Schema.Struct({
  _tag: Schema.Literal('ConfigurationError'),
  message: Schema.String,
  field: Schema.optional(Schema.String),
  value: Schema.Unknown,
});

export const MCPErrorSchema = Schema.Struct({
  _tag: Schema.Literal('MCPError'),
  message: Schema.String,
  tool: Schema.optional(Schema.String),
  cause: Schema.Unknown,
});

export const AIErrorSchema = Schema.Struct({
  _tag: Schema.Literal('AIError'),
  message: Schema.String,
  provider: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  cause: Schema.Unknown,
});

export const ValidationErrorSchema = Schema.Struct({
  _tag: Schema.Literal('ValidationError'),
  message: Schema.String,
  field: Schema.optional(Schema.String),
  value: Schema.Unknown,
});

export const NetworkErrorSchema = Schema.Struct({
  _tag: Schema.Literal('NetworkError'),
  message: Schema.String,
  url: Schema.optional(Schema.String),
  statusCode: Schema.optional(Schema.Number),
  cause: Schema.Unknown,
});
