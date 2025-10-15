export interface CommandOptions {
  agent?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  merge?: boolean;
}

export interface CommandHandler {
  (options: CommandOptions): Promise<void>;
}

export interface CommandConfig {
  name: string;
  description: string;
  options: CommandOption[];
  handler: CommandHandler;
  validator?: (options: CommandOptions) => void;
}

export interface CommandOption {
  flags: string;
  description: string;
}