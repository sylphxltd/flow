import type { CommandConfig, CommandOptions } from '../types.js';
import { COMMON_OPTIONS } from '../utils/command-builder.js';
import { CLIError } from '../utils/error-handler.js';
import { syncRules } from './sync.js';

function validateSyncOptions(options: CommandOptions): void {
  if (options.agent && !['cursor', 'kilocode', 'roocode'].includes(options.agent)) {
    throw new CLIError(
      `Invalid agent: ${options.agent}. Supported agents: cursor, kilocode, roocode`,
      'INVALID_AGENT'
    );
  }
}

export const syncCommand: CommandConfig = {
  name: 'sync',
  description: 'Sync development flow to your project',
  options: [
    { ...COMMON_OPTIONS[0], description: 'Force specific agent (cursor, kilocode, roocode)' },
    ...COMMON_OPTIONS.slice(1),
  ],
  handler: syncRules,
  validator: validateSyncOptions,
};
