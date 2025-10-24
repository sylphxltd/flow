export interface CommandOptions {
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
  // Dynamic argument properties - using safer unknown instead of any
  [key: string]: unknown;
}

export type CommandHandler = (options: CommandOptions) => Promise<void>;

export interface CommandConfig {
  name: string;
  description: string;
  options: CommandOption[];
  arguments?: CommandArgument[];
  handler?: CommandHandler;
  validator?: (options: CommandOptions) => void;
  subcommands?: CommandConfig[];
}

export interface CommandOption {
  flags: string;
  description: string;
}

export interface CommandArgument {
  name: string;
  description: string;
  required?: boolean;
}



export interface MCPServerConfig {
  // Common fields
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPServerConfigHTTP {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

// Legacy OpenCode types (for backward compatibility)
export interface MCPServerConfigLegacy {
  type: 'local';
  command: string[] | ((context?: { targetId?: string }) => Promise<string[]>);
  environment?: Record<string, string>;
}

export interface MCPServerConfigHTTPLegacy {
  type: 'remote';
  url: string;
  headers?: Record<string, string>;
}

// Type guard functions for better type safety
export function isStdioConfig(config: MCPServerConfigUnion): config is MCPServerConfig {
  return config.type === 'stdio';
}

export function isLocalConfig(config: MCPServerConfigUnion): config is MCPServerConfigLegacy {
  return config.type === 'local';
}

export function isHttpConfig(config: MCPServerConfigUnion): config is MCPServerConfigHTTP | MCPServerConfigHTTPLegacy {
  return config.type === 'http' || config.type === 'remote';
}

// Type for CLI-based servers that support command arguments
export type CLICommandConfig = MCPServerConfig | MCPServerConfigLegacy;

// Type guard for CLI servers
export function isCLICommandConfig(config: MCPServerConfigUnion): config is CLICommandConfig {
  return isStdioConfig(config) || isLocalConfig(config);
}

export type MCPServerConfigUnion =
  | MCPServerConfig
  | MCPServerConfigHTTP
  | MCPServerConfigLegacy
  | MCPServerConfigHTTPLegacy;

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
    [serverId: string]: {
      disableMemory?: boolean;
      disableTime?: boolean;
      disableProjectStartup?: boolean;
      disableKnowledge?: boolean;
    };
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
