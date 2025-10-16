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
  description: '[DEPRECATED] Sync development flow to your project - use "init" instead',
  options: [
    { ...COMMON_OPTIONS[0], description: 'Force specific agent (cursor, kilocode, roocode)' },
    ...COMMON_OPTIONS.slice(1),
  ],
  handler: async (options: CommandOptions) => {
    // Show deprecation warning
    console.warn('⚠️  WARNING: The "sync" command is deprecated and will be removed in a future version.');
    console.warn('   Use "npx github:sylphxltd/flow init" instead for new projects.');
    console.warn('   The sync command only works with legacy agents (cursor, kilocode, roocode).');
    console.warn('');
    
    // Call the original sync handler
    await syncRules(options);
  },
  validator: validateSyncOptions,
};
