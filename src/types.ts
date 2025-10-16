export interface CommandOptions {
  agent?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  merge?: boolean;
  mcp?: string[] | null;
  servers?: string[];
  all?: boolean;
}

export interface CommandHandler {
  (options: CommandOptions): Promise<void>;
}

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
}

export interface OpenCodeConfig {
  $schema?: string;
  mcp?: Record<string, MCPServerConfig>;
}