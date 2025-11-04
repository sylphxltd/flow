/**
 * CLI-specific type definitions
 * Types for command-line interface operations
 */

/**
 * Application-specific options that extend Commander's built-in parsing
 * Aggregates all possible CLI options across different commands
 */
export interface CommandOptions {
  // Common CLI options
  target?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  mcp?: string[] | null | boolean;
  servers?: string[];
  server?: string;
  all?: boolean;

  // Init command skip flags (--no-X sets to false)
  // Note: 'agents' and 'rules' may also be strings in other commands
  rules?: boolean | string;
  outputStyles?: boolean;
  hooks?: boolean;

  // Memory command options
  namespace?: string;
  limit?: number;
  pattern?: string;
  key?: string;
  confirm?: boolean;

  // Benchmark-specific options
  agents?: string | boolean; // boolean for init command --no-agents
  task?: string;
  output?: string;
  context?: string;
  evaluate?: boolean;
  report?: string;
  concurrency?: number;
  delay?: number;

  // Codebase command options
  includeContent?: boolean;
  extensions?: string[];
  path?: string;
  exclude?: string[];
  query?: string;

  // Knowledge command options
  category?: string;
  uri?: string;

  // Allow dynamic properties - Commander.js already handles this
  [key: string]: unknown;
}

/**
 * Command configuration interface
 */
export interface CommandConfig {
  name: string;
  description: string;
  handler: CommandHandler;
  options?: Record<string, any>;
}

/**
 * Command handler function type
 * All CLI commands implement this signature
 */
export type CommandHandler = (options: CommandOptions) => Promise<void>;
