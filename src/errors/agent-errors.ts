/**
 * Agent Service Error Types
 * Typed errors for agent operations
 */

/**
 * Error when an agent name is invalid
 */
export class AgentNotFoundError extends Error {
  constructor(
    public readonly agentName: string,
    public readonly availableAgents: string[]
  ) {
    super(`Invalid agent: ${agentName}. Available agents: ${availableAgents.join(', ')}`);
    this.name = 'AgentNotFoundError';
  }
}

/**
 * Error when agent loading fails
 */
export class AgentLoadError extends Error {
  constructor(
    public readonly agentName: string,
    public override readonly cause?: unknown
  ) {
    super(`Failed to load agent ${agentName}`);
    this.name = 'AgentLoadError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Error when agent times out
 */
export class AgentTimeoutError extends Error {
  constructor(
    public readonly agentName: string,
    public readonly timeoutSeconds: number
  ) {
    super(`Agent ${agentName} timed out after ${timeoutSeconds} seconds`);
    this.name = 'AgentTimeoutError';
  }
}

/**
 * Error when agent execution fails
 */
export class AgentExecutionError extends Error {
  constructor(
    public readonly agentName: string,
    public readonly exitCode: number,
    public override readonly cause?: unknown
  ) {
    super(`Agent ${agentName} failed with code ${exitCode}`);
    this.name = 'AgentExecutionError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Generic agent operation error
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AgentError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Type alias for all agent errors
 */
export type AgentErrorType =
  | AgentNotFoundError
  | AgentLoadError
  | AgentTimeoutError
  | AgentExecutionError
  | AgentError;
