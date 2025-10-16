export interface CommandOptions {
  agent?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  merge?: boolean;
  mcp?: string[] | null | boolean;
  servers?: string[];
  server?: string;
  all?: boolean;
}

export type CommandHandler = (options: CommandOptions) => Promise<void>;

export interface CommandConfig {
  name: string;
  description: string;
  options: CommandOption[];
  handler?: CommandHandler;
  validator?: (options: CommandOptions) => void;
  subcommands?: CommandConfig[];
}

export interface CommandOption {
  flags: string;
  description: string;
}

export interface MCPServerConfig {
  type: 'local';
  command: string[];
  env?: Record<string, string>;
}

export interface MCPServerConfigHTTP {
  type: 'streamable-http';
  url: string;
}

export type MCPServerConfigUnion = MCPServerConfig | MCPServerConfigHTTP;

export interface OpenCodeConfig {
  $schema?: string;
  mcp?: Record<string, MCPServerConfigUnion>;
}
