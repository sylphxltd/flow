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
  // Dynamic argument properties
  [key: string]: any;
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
  command: string[];
  environment?: Record<string, string>;
}

export interface MCPServerConfigHTTPLegacy {
  type: 'remote';
  url: string;
  headers?: Record<string, string>;
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
      knowledgeAsTools?: boolean;
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
        knowledgeAsTools?: boolean;
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
    metadata?: any,
    sourcePath?: string
  ): Promise<string>;

  /** Transform MCP server configuration for the target */
  abstract transformMCPConfig(config: MCPServerConfigUnion, serverId?: string): any;

  /** Get the configuration file path for the target */
  abstract getConfigPath(cwd: string): Promise<string>;

  /** Read the target's configuration file */
  abstract readConfig(cwd: string): Promise<any>;

  /** Write the target's configuration file */
  abstract writeConfig(cwd: string, config: any): Promise<void>;

  /** Validate target-specific requirements */
  abstract validateRequirements(cwd: string): Promise<void>;

  /** Get target-specific help text */
  abstract getHelpText(): string;

  /** Execute command with the target (optional - not all targets need to support execution) */
  async executeCommand?(systemPrompt: string, userPrompt: string, options: any): Promise<void>;

  /** Detect if this target is being used in the current environment (optional) */
  detectFromEnvironment?(): boolean;
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
