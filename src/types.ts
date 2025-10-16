export interface CommandOptions {
  agent?: string;
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
  type: 'local';
  command: string[];
  environment?: Record<string, string>;
}

export interface MCPServerConfigHTTP {
  type: 'remote';
  url: string;
}

export type MCPServerConfigUnion = MCPServerConfig | MCPServerConfigHTTP;

export interface OpenCodeConfig {
  $schema?: string;
  mcp?: Record<string, MCPServerConfigUnion>;
}
