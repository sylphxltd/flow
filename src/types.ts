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
  /** Installation-specific configuration */
  installation: {
    /** Whether to create the agent directory */
    createAgentDir: boolean;
    /** Whether to create the config file */
    createConfigFile: boolean;
    /** Whether MCP servers are supported */
    supportedMcpServers: boolean;
  };
}

export interface TargetTransformer {
  /** Transform agent content for the target */
  transformAgentContent(content: string, metadata?: any, sourcePath?: string): Promise<string>;
  /** Transform MCP server configuration for the target */
  transformMCPConfig(config: MCPServerConfigUnion): any;
  /** Get the configuration file path for the target */
  getConfigPath(cwd: string): string;
  /** Read the target's configuration file */
  readConfig(cwd: string): Promise<any>;
  /** Write the target's configuration file */
  writeConfig(cwd: string, config: any): Promise<void>;
  /** Validate target-specific requirements */
  validateRequirements(cwd: string): Promise<void>;
  /** Get target-specific help text */
  getHelpText(): string;
  /** Execute command with the target (optional - not all targets need to support execution) */
  executeCommand?(systemPrompt: string, userPrompt: string, options: any): Promise<void>;
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
