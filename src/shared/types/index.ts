/**
 * Shared types for common operations and configurations
 */

export interface ProcessResult {
  file: string;
  status: 'added' | 'updated' | 'current' | 'skipped';
  action: string;
}

export interface CommonOptions {
  target?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  mcp?: string[] | null | boolean;
  quiet?: boolean;
}

export interface AgentConfig {
  name: string;
  dir: string;
  extension: string;
  stripYaml: boolean;
  flatten: boolean;
  description: string;
}

export interface AgentConfigs {
  [key: string]: AgentConfig;
}