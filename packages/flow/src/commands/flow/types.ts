/**
 * Flow Command Types
 */

import type { RunCommandOptions } from '../../types.js';

export interface FlowOptions {
  target?: string;
  verbose?: boolean;
  dryRun?: boolean;
  sync?: boolean;
  initOnly?: boolean;
  runOnly?: boolean;
  repair?: boolean;
  upgrade?: boolean;
  upgradeTarget?: boolean;
  mcp?: boolean;
  agents?: boolean;
  rules?: boolean;
  outputStyles?: boolean;
  slashCommands?: boolean;
  hooks?: boolean;
  agent?: string;
  agentFile?: string;

  // Smart configuration options
  selectProvider?: boolean;
  selectAgent?: boolean;
  useDefaults?: boolean;
  provider?: string;
  quick?: boolean;

  // Execution modes
  print?: boolean;
  continue?: boolean;

  // Loop mode
  loop?: number;
  maxRuns?: number;
}

export interface SetupContext {
  resolvedTarget: string;
  initializedSuccessfully: boolean;
  systemPrompt?: string;
  runOptions?: RunCommandOptions;
}
