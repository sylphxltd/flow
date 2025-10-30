import type { Command } from 'commander';
import type { TargetConfigurationData } from './types/target-config.types.js';

// Application-specific options that extend Commander's built-in parsing
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

  // Memory command options
  namespace?: string;
  limit?: number;
  pattern?: string;
  key?: string;
  confirm?: boolean;

  // Benchmark-specific options
  agents?: string;
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

export type CommandHandler = (options: CommandOptions) => Promise<void>;

export interface MCPServerConfig {
  // Common fields
  type: 'stdio';
  command: Resolvable<string>;
  args?: Resolvable<string[]>;
  env?: Record<string, string>;
}

export interface MCPServerConfigHTTP {
  type: 'http';
  url: Resolvable<string>;
  headers?: Record<string, string>;
}

// Type guard functions for better type safety
export function isStdioConfig(config: MCPServerConfigUnion): config is MCPServerConfig {
  return config.type === 'stdio';
}

export function isHttpConfig(config: MCPServerConfigUnion): config is MCPServerConfigHTTP {
  return config.type === 'http';
}

// Type guard for CLI servers
export function isCLICommandConfig(config: MCPServerConfigUnion): config is MCPServerConfig {
  return isStdioConfig(config);
}

// Type for resolvable values - can be static, sync function, or async function
export type Resolvable<T> = T | (() => Promise<T>) | (() => T);

// Type for MCP server configuration flags (from Target.mcpServerConfig)
export type MCPServerConfigFlags = {
  disableMemory?: boolean;
  disableTime?: boolean;
  disableProjectStartup?: boolean;
  disableKnowledge?: boolean;
  disableCodebase?: boolean;
};

export type MCPServerConfigUnion = MCPServerConfig | MCPServerConfigHTTP;

export interface OpenCodeConfig {
  $schema?: string;
  mcp?: Record<string, MCPServerConfigUnion>;
}

// ============================================================================
// TARGET SYSTEM TYPES
// ============================================================================

export interface TargetConfig {
  /** Directory where agents are installed */
  agentDir: string;
  /** File extension for agent files */
  agentExtension: string;
  /** Format of agent files */
  agentFormat: 'yaml-frontmatter' | 'json' | 'yaml' | 'markdown';
  /** Whether to strip YAML front matter from content */
  stripYaml: boolean;
  /** Whether to flatten directory structure */
  flatten: boolean;
  /** Configuration file name */
  configFile: string;
  /** Configuration file schema URL (optional) */
  configSchema: string | null;
  /** Path to MCP configuration in config file */
  mcpConfigPath: string;
  /** Rules file path (optional, relative to project root) */
  rulesFile?: string;
  /** Output styles directory (optional, relative to project root) */
  outputStylesDir?: string;
  /** Installation-specific configuration */
  installation: {
    /** Whether to create the agent directory */
    createAgentDir: boolean;
    /** Whether to create the config file */
    createConfigFile: boolean;
    /** Whether MCP servers are supported */
    supportedMcpServers: boolean;
    /** Whether to use secret file references for sensitive environment variables */
    useSecretFiles?: boolean;
    /** Whether output styles are supported as separate files */
    supportOutputStyles?: boolean;
  };
}

export abstract class Target {
  /** Internal identifier used in CLI commands */
  public readonly id: string;
  /** Display name for the target */
  public readonly name: string;
  /** Human-readable description */
  public readonly description: string;
  /** Target-specific configuration */
  public readonly config: TargetConfig;
  /** Target category for grouping */
  public readonly category: 'ide' | 'editor' | 'cli';
  /** Whether this target is the default when no target is specified */
  public readonly isDefault?: boolean;
  /** Whether this target is fully implemented */
  public readonly isImplemented: boolean;
  /** MCP server configuration for this target */
  public readonly mcpServerConfig?: {
    disableMemory?: boolean;
    disableTime?: boolean;
    disableProjectStartup?: boolean;
    disableKnowledge?: boolean;
    disableCodebase?: boolean;
  };

  constructor(
    id: string,
    name: string,
    description: string,
    config: TargetConfig,
    category: 'ide' | 'editor' | 'cli',
    isDefault?: boolean,
    isImplemented = true,
    mcpServerConfig?: {
      [serverId: string]: {
        disableMemory?: boolean;
        disableTime?: boolean;
        disableProjectStartup?: boolean;
        disableKnowledge?: boolean;
      };
    }
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.config = config;
    this.category = category;
    this.isDefault = isDefault;
    this.isImplemented = isImplemented;
    this.mcpServerConfig = mcpServerConfig;
  }

  /** Transform agent content for the target */
  abstract transformAgentContent(
    content: string,
    metadata?: Record<string, unknown>,
    sourcePath?: string
  ): Promise<string>;

  /** Transform MCP server configuration for the target */
  abstract transformMCPConfig(
    config: MCPServerConfigUnion,
    serverId?: string
  ): Record<string, unknown>;

  /** Get the configuration file path for the target */
  abstract getConfigPath(cwd: string): Promise<string>;

  /** Read the target's configuration file */
  abstract readConfig(cwd: string): Promise<Record<string, unknown>>;

  /** Write the target's configuration file */
  abstract writeConfig(cwd: string, config: Record<string, unknown>): Promise<void>;

  /** Validate target-specific requirements */
  abstract validateRequirements(cwd: string): Promise<void>;

  /** Get target-specific help text */
  abstract getHelpText(): string;

  /** Execute command with the target (optional - not all targets need to support execution) */
  async executeCommand?(
    systemPrompt: string,
    userPrompt: string,
    options: Record<string, unknown>
  ): Promise<void>;

  /** Detect if this target is being used in the current environment (optional) */
  detectFromEnvironment?(): boolean;

  /** Approve MCP servers in target-specific configuration (optional - only for targets that need approval) */
  async approveMCPServers?(cwd: string, serverNames: string[]): Promise<void>;

  /** Transform rules content for the target (optional - defaults to no transformation) */
  async transformRulesContent?(content: string): Promise<string>;

  /** Setup target-specific configuration (optional - for targets that need additional setup) */
  async setup?(cwd: string, options?: Record<string, unknown>): Promise<void>;

  /** Setup agents for this target (optional - implement if target needs agents) */
  async setupAgents?(cwd: string, options: CommonOptions): Promise<SetupResult>;

  /** Setup rules for this target (optional - implement if target needs rules) */
  async setupRules?(cwd: string, options: CommonOptions): Promise<SetupResult>;

  /** Setup output styles for this target (optional - implement if target supports output styles) */
  async setupOutputStyles?(cwd: string, options: CommonOptions): Promise<SetupResult>;

  /** Setup MCP servers for this target (optional - implement if target supports MCP) */
  async setupMCP?(cwd: string, options: CommonOptions): Promise<SetupResult>;

  /** Setup hooks for this target (optional - implement if target needs hooks like Claude Code) */
  async setupHooks?(cwd: string, options: CommonOptions): Promise<SetupResult>;
}

export interface CommonOptions {
  target?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  mcp?: string[] | null | boolean;
  quiet?: boolean;
  agent?: string;
}

/**
 * Standardized result from setup methods
 * Used for consistent UI feedback
 */
export interface SetupResult {
  /** Number of items processed (servers, agents, files, etc.) */
  count: number;
  /** Optional detailed message */
  message?: string;
}
