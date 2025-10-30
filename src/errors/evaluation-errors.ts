/**
 * Evaluation Service Error Types
 * Typed errors for evaluation operations
 */

/**
 * Error when evaluation template loading fails
 */
export class EvaluationTemplateError extends Error {
  constructor(
    public readonly templatePath: string,
    public override readonly cause?: unknown
  ) {
    super(
      `Failed to load evaluation template from ${templatePath}. ` +
        `Please ensure: 1) The file exists at: ${templatePath}, ` +
        `2) The file is readable (check permissions), ` +
        `3) The file contains valid markdown content`
    );
    this.name = 'EvaluationTemplateError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Error when evaluation process fails
 */
export class EvaluationProcessError extends Error {
  constructor(
    public readonly exitCode: number,
    public override readonly cause?: unknown
  ) {
    super(`Evaluation failed with code ${exitCode}`);
    this.name = 'EvaluationProcessError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Error when reading agent work fails
 */
export class AgentWorkReadError extends Error {
  constructor(
    public readonly agentName: string,
    public override readonly cause?: unknown
  ) {
    super(`Could not read work for agent: ${agentName}`);
    this.name = 'AgentWorkReadError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Generic evaluation operation error
 */
export class EvaluationError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message);
    this.name = 'EvaluationError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Type alias for all evaluation errors
 */
export type EvaluationErrorType =
  | EvaluationTemplateError
  | EvaluationProcessError
  | AgentWorkReadError
  | EvaluationError;
