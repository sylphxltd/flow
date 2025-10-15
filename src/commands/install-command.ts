import { installAgents } from './install.js';
import { CommandOptions, CommandConfig } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { COMMON_OPTIONS } from '../utils/command-builder.js';

function validateInstallOptions(options: CommandOptions): void {
  if (options.agent && options.agent !== 'opencode') {
    throw new CLIError(
      'Currently only opencode is supported for install.',
      'UNSUPPORTED_AGENT'
    );
  }
  
  options.agent = options.agent || 'opencode';
}

export const installCommand: CommandConfig = {
  name: 'install',
  description: 'Install workflow agents for OpenCode',
  options: [
    { ...COMMON_OPTIONS[0], description: 'Force specific agent (opencode)' },
    ...COMMON_OPTIONS.slice(1)
  ],
  handler: async (options: CommandOptions) => {
    validateInstallOptions(options);
    await installAgents(options);
  }
};