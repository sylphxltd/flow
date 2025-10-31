/**
 * Embeddings Service Error Types
 * Typed errors for embeddings operations
 */

/**
 * Error when embedding provider initialization fails
 */
export class EmbeddingInitError extends Error {
  constructor(public override readonly cause?: unknown) {
    super('Failed to initialize embedding provider');
    this.name = 'EmbeddingInitError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Error when embedding provider is not initialized
 */
export class EmbeddingNotInitializedError extends Error {
  constructor() {
    super('Embedding provider not initialized');
    this.name = 'EmbeddingNotInitializedError';
  }
}

/**
 * Error when vectors have incompatible dimensions
 */
export class VectorDimensionError extends Error {
  constructor(
    public readonly expectedLength: number,
    public readonly actualLength: number
  ) {
    super(`Vectors must have the same length. Expected: ${expectedLength}, got: ${actualLength}`);
    this.name = 'VectorDimensionError';
  }
}

/**
 * Error when embedding generation fails
 */
export class EmbeddingGenerationError extends Error {
  constructor(
    public readonly batchIndex: number,
    public readonly batchSize: number,
    public override readonly cause?: unknown
  ) {
    super(`Failed to generate embeddings for batch ${batchIndex}-${batchIndex + batchSize}`);
    this.name = 'EmbeddingGenerationError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Generic embeddings operation error
 */
export class EmbeddingsError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message);
    this.name = 'EmbeddingsError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Type alias for all embeddings errors
 */
export type EmbeddingsErrorType =
  | EmbeddingInitError
  | EmbeddingNotInitializedError
  | VectorDimensionError
  | EmbeddingGenerationError
  | EmbeddingsError;
