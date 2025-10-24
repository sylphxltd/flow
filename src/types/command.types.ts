import { z } from 'zod';

// ============================================================================
// COMMAND OPTIONS AND CONFIGURATION INTERFACES
// ============================================================================

/**
 * Enhanced command options with proper typing
 */
export interface EnhancedCommandOptions {
  // Core options
  target?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  mcp?: string[] | null | boolean;
  servers?: string[];
  server?: string;
  all?: boolean;
  quiet?: boolean;
  agent?: string;

  // Memory command options
  namespace?: string;
  limit?: number;
  pattern?: string;
  key?: string;
  confirm?: boolean;

  // File and directory options
  output?: string;
  input?: string;
  config?: string;
  directory?: string;
  recursive?: boolean;

  // Content options
  format?: 'json' | 'yaml' | 'markdown' | 'text';
  encoding?: string;
  indent?: number;

  // Network and API options
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  token?: string;

  // Filtering and selection options
  include?: string[];
  exclude?: string[];
  tags?: string[];
  type?: string;

  // Action-specific options
  force?: boolean;
  interactive?: boolean;
  backup?: boolean;

  // Development options
  debug?: boolean;
  profile?: boolean;
  watch?: boolean;

  // Dynamic extension properties
  extensions?: Record<string, unknown>;
}

/**
 * Command execution context
 */
export interface CommandExecutionContext {
  /** Working directory */
  cwd: string;
  /** Environment variables */
  env: Record<string, string>;
  /** Command arguments */
  args: string[];
  /** Standard input stream */
  stdin?: NodeJS.ReadableStream;
  /** Standard output stream */
  stdout?: NodeJS.WritableStream;
  /** Standard error stream */
  stderr?: NodeJS.WritableStream;
  /** Execution start time */
  startTime: Date;
  /** Command metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  /** Success status */
  success: boolean;
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Result data */
  data?: unknown;
  /** Error information */
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  /** Execution metadata */
  metadata?: {
    command: string;
    args: string[];
    cwd: string;
    timestamp: string;
  };
}

/**
 * Command validation result
 */
export interface CommandValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validated options */
  options?: EnhancedCommandOptions;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Suggested fixes */
  suggestions?: string[];
}

/**
 * Command configuration with enhanced typing
 */
export interface EnhancedCommandConfig {
  /** Command name */
  name: string;
  /** Command description */
  description: string;
  /** Command category */
  category?: string;
  /** Command usage example */
  usage?: string;
  /** Command options definition */
  options: EnhancedCommandOption[];
  /** Command arguments definition */
  arguments?: EnhancedCommandArgument[];
  /** Command handler function */
  handler?: CommandHandler;
  /** Command validator function */
  validator?: CommandValidator;
  /** Subcommands configuration */
  subcommands?: EnhancedCommandConfig[];
  /** Command aliases */
  aliases?: string[];
  /** Command deprecation status */
  deprecated?: boolean;
  /** Deprecation message */
  deprecationMessage?: string;
  /** Command version */
  version?: string;
  /** Command constraints */
  constraints?: CommandConstraints;
}

/**
 * Enhanced command option definition
 */
export interface EnhancedCommandOption {
  /** Option flags (e.g., '-v, --verbose') */
  flags: string;
  /** Option description */
  description: string;
  /** Option value type */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Default value */
  defaultValue?: unknown;
  /** Whether option is required */
  required?: boolean;
  /** Possible choices for enum-like options */
  choices?: string[];
  /** Validation function */
  validator?: (value: unknown) => boolean | string;
  /** Option group for organization */
  group?: string;
  /** Whether option is hidden from help */
  hidden?: boolean;
  /** Environment variable to fallback to */
  env?: string;
  /** Option examples */
  examples?: string[];
}

/**
 * Enhanced command argument definition
 */
export interface EnhancedCommandArgument {
  /** Argument name */
  name: string;
  /** Argument description */
  description: string;
  /** Whether argument is required */
  required?: boolean;
  /** Argument value type */
  type?: 'string' | 'number' | 'boolean';
  /** Default value */
  defaultValue?: unknown;
  /** Possible choices */
  choices?: string[];
  /** Validation function */
  validator?: (value: unknown) => boolean | string;
  /** Argument examples */
  examples?: string[];
}

/**
 * Command constraints
 */
export interface CommandConstraints {
  /** Minimum Node.js version */
  nodeVersion?: string;
  /** Required environment variables */
  requiredEnv?: string[];
  /** Required permissions */
  permissions?: string[];
  /** Maximum execution time in milliseconds */
  maxExecutionTime?: number;
  /** Required dependencies */
  dependencies?: string[];
  /** Platform constraints */
  platform?: 'win32' | 'darwin' | 'linux' | 'all';
}

/**
 * Interactive prompt configuration
 */
export interface InteractivePromptConfig {
  /** Prompt type */
  type: 'input' | 'confirm' | 'list' | 'checkbox' | 'password' | 'editor';
  /** Prompt message */
  message: string;
  /** Default value */
  default?: unknown;
  /** Prompt choices (for list/checkbox) */
  choices?: Array<string | { name: string; value: unknown; short?: string }>;
  /** Validation function */
  validate?: (value: unknown) => boolean | string;
  /** Transform function */
  transform?: (value: unknown) => unknown;
  /** Filter function */
  filter?: (value: unknown) => unknown;
  /** Whether prompt is required */
  required?: boolean;
  /** Prompt size constraints */
  pageSize?: number;
  /** Help text */
  help?: string;
}

// ============================================================================
// ZOD SCHEMAS FOR RUNTIME VALIDATION
// ============================================================================

/**
 * Zod schema for EnhancedCommandOptions
 */
export const EnhancedCommandOptionsSchema = z.object({
  target: z.string().optional(),
  verbose: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  clear: z.boolean().optional(),
  mcp: z.union([z.array(z.string()), z.boolean(), z.null()]).optional(),
  servers: z.array(z.string()).optional(),
  server: z.string().optional(),
  all: z.boolean().optional(),
  quiet: z.boolean().optional(),
  agent: z.string().optional(),
  namespace: z.string().optional(),
  limit: z.number().optional(),
  pattern: z.string().optional(),
  key: z.string().optional(),
  confirm: z.boolean().optional(),
  output: z.string().optional(),
  input: z.string().optional(),
  config: z.string().optional(),
  directory: z.string().optional(),
  recursive: z.boolean().optional(),
  format: z.enum(['json', 'yaml', 'markdown', 'text']).optional(),
  encoding: z.string().optional(),
  indent: z.number().optional(),
  timeout: z.number().optional(),
  retries: z.number().optional(),
  headers: z.record(z.string()).optional(),
  token: z.string().optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  type: z.string().optional(),
  force: z.boolean().optional(),
  interactive: z.boolean().optional(),
  backup: z.boolean().optional(),
  debug: z.boolean().optional(),
  profile: z.boolean().optional(),
  watch: z.boolean().optional(),
  extensions: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for CommandExecutionContext
 */
export const CommandExecutionContextSchema = z.object({
  cwd: z.string(),
  env: z.record(z.string()),
  args: z.array(z.string()),
  stdin: z.any().optional(),
  stdout: z.any().optional(),
  stderr: z.any().optional(),
  startTime: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for CommandExecutionResult
 */
export const CommandExecutionResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  duration: z.number(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
  metadata: z
    .object({
      command: z.string(),
      args: z.array(z.string()),
      cwd: z.string(),
      timestamp: z.string(),
    })
    .optional(),
});

/**
 * Zod schema for CommandValidationResult
 */
export const CommandValidationResultSchema = z.object({
  isValid: z.boolean(),
  options: EnhancedCommandOptionsSchema.optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  suggestions: z.array(z.string()).optional(),
});

/**
 * Zod schema for EnhancedCommandOption
 */
export const EnhancedCommandOptionSchema = z.object({
  flags: z.string(),
  description: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']).optional(),
  defaultValue: z.unknown().optional(),
  required: z.boolean().optional(),
  choices: z.array(z.string()).optional(),
  validator: z.function().optional(),
  group: z.string().optional(),
  hidden: z.boolean().optional(),
  env: z.string().optional(),
  examples: z.array(z.string()).optional(),
});

/**
 * Zod schema for EnhancedCommandArgument
 */
export const EnhancedCommandArgumentSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean().optional(),
  type: z.enum(['string', 'number', 'boolean']).optional(),
  defaultValue: z.unknown().optional(),
  choices: z.array(z.string()).optional(),
  validator: z.function().optional(),
  examples: z.array(z.string()).optional(),
});

/**
 * Zod schema for CommandConstraints
 */
export const CommandConstraintsSchema = z.object({
  nodeVersion: z.string().optional(),
  requiredEnv: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  maxExecutionTime: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
  platform: z.enum(['win32', 'darwin', 'linux', 'all']).optional(),
});

/**
 * Zod schema for InteractivePromptConfig
 */
export const InteractivePromptConfigSchema = z.object({
  type: z.enum(['input', 'confirm', 'list', 'checkbox', 'password', 'editor']),
  message: z.string(),
  default: z.unknown().optional(),
  choices: z
    .array(
      z.union([
        z.string(),
        z.object({
          name: z.string(),
          value: z.unknown(),
          short: z.string().optional(),
        }),
      ])
    )
    .optional(),
  validate: z.function().optional(),
  transform: z.function().optional(),
  filter: z.function().optional(),
  required: z.boolean().optional(),
  pageSize: z.number().optional(),
  help: z.string().optional(),
});

// ============================================================================
// TYPE GUARDS FOR RUNTIME TYPE CHECKING
// ============================================================================

/**
 * Type guard to check if value is EnhancedCommandOptions
 */
export function isEnhancedCommandOptions(value: unknown): value is EnhancedCommandOptions {
  return EnhancedCommandOptionsSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is CommandExecutionContext
 */
export function isCommandExecutionContext(value: unknown): value is CommandExecutionContext {
  return CommandExecutionContextSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is CommandExecutionResult
 */
export function isCommandExecutionResult(value: unknown): value is CommandExecutionResult {
  return CommandExecutionResultSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is CommandValidationResult
 */
export function isCommandValidationResult(value: unknown): value is CommandValidationResult {
  return CommandValidationResultSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is EnhancedCommandOption
 */
export function isEnhancedCommandOption(value: unknown): value is EnhancedCommandOption {
  return EnhancedCommandOptionSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is CommandConstraints
 */
export function isCommandConstraints(value: unknown): value is CommandConstraints {
  return CommandConstraintsSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is InteractivePromptConfig
 */
export function isInteractivePromptConfig(value: unknown): value is InteractivePromptConfig {
  return InteractivePromptConfigSchema.safeParse(value).success;
}

// ============================================================================
// UTILITY TYPES AND FUNCTIONS
// ============================================================================

/**
 * Enhanced command handler function type
 */
export type CommandHandler = (
  options: EnhancedCommandOptions,
  context?: CommandExecutionContext
) => Promise<CommandExecutionResult>;

/**
 * Enhanced command validator function type
 */
export type CommandValidator = (
  options: EnhancedCommandOptions,
  context?: CommandExecutionContext
) => CommandValidationResult;

/**
 * Command builder result
 */
export interface CommandBuilderResult {
  /** Built command configuration */
  config: EnhancedCommandConfig;
  /** Builder validation errors */
  errors: string[];
  /** Builder warnings */
  warnings: string[];
}

/**
 * Create a successful command execution result
 */
export function createCommandResult(
  success: boolean,
  stdout = '',
  stderr = '',
  data?: unknown,
  error?: { code: string; message: string; stack?: string },
  metadata?: { command: string; args: string[]; cwd: string; timestamp: string }
): CommandExecutionResult {
  return {
    success,
    exitCode: success ? 0 : 1,
    stdout,
    stderr,
    duration: 0, // Will be set by executor
    data,
    error,
    metadata,
  };
}

/**
 * Create a command validation result
 */
export function createValidationResult(
  isValid: boolean,
  options?: EnhancedCommandOptions,
  errors: string[] = [],
  warnings: string[] = [],
  suggestions: string[] = []
): CommandValidationResult {
  return {
    isValid,
    options,
    errors,
    warnings,
    suggestions,
  };
}
