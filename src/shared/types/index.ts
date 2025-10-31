/**
 * Shared types for common operations and configurations
 */

// Re-export CommonOptions from centralized location
export type { CommonOptions } from '../../types/common.types.js';

export interface ProcessResult {
  file: string;
  status: 'added' | 'updated' | 'current' | 'skipped';
  action: string;
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
