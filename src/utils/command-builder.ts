import { Command } from 'commander';
import type { CommandConfig, CommandOptions } from '../types.js';
import { createAsyncHandler } from './error-handler.js';

export function createCommand(config: CommandConfig): Command {
  const command = new Command(config.name);

  command.description(config.description);

  for (const option of config.options || []) {
    command.option(option.flags, option.description);
  }

  // Add subcommands if they exist
  if (config.subcommands) {
    for (const subcommand of config.subcommands) {
      command.addCommand(createCommand(subcommand));
    }
  }

  // Only add handler if this command has one (not just a container for subcommands)
  if (config.handler) {
    const handler = createAsyncHandler(config.handler, config.name);

    if (config.validator) {
      command.action((options: CommandOptions) => {
        config.validator?.(options);
        return handler(options);
      });
    } else {
      command.action(handler);
    }
  }

  return command;
}

export const COMMON_OPTIONS = [
  { flags: '--target <type>', description: 'Force specific target' },
  { flags: '--verbose', description: 'Show detailed output' },
  { flags: '--dry-run', description: 'Show what would be done without making changes' },
  { flags: '--clear', description: 'Clear obsolete items before processing' },
  {
    flags: '--mcp [servers...]',
    description: 'Install MCP servers (memory, gpt-image, perplexity, context7, gemini-search)',
  },
] as const;
