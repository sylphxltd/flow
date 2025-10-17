import { Command } from 'commander';
import { getAllServerIDs } from '../config/servers.js';
import type { CommandConfig, CommandOptions } from '../types.js';
import { createAsyncHandler } from './error-handler.js';

export function createCommand(config: CommandConfig): Command {
  const command = new Command(config.name);

  command.description(config.description);

  for (const option of config.options || []) {
    command.option(option.flags, option.description);
  }

  // Add arguments if they exist
  if (config.arguments) {
    for (const argument of config.arguments) {
      command.argument(
        argument.required ? `<${argument.name}>` : `[${argument.name}]`,
        argument.description
      );
    }
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
      command.action((...args: any[]) => {
        // Extract arguments from the end (excluding options)
        const argValues = args.slice(0, -1);
        const cmd = args[args.length - 1]; // This is the Command object
        const options = cmd.opts() as CommandOptions; // Use opts() to get parsed options

        
        // Add arguments to options
        if (config.arguments && argValues.length > 0) {
          config.arguments.forEach((arg, index) => {
            if (index < argValues.length) {
              options[arg.name] = argValues[index];
            }
          });
        }

        config.validator?.(options);
        return handler(options);
      });
    } else {
      command.action((...args: any[]) => {
        // Extract arguments from the end (excluding options)
        const argValues = args.slice(0, -1);
        const cmd = args[args.length - 1]; // This is the Command object
        const options = cmd.opts() as CommandOptions; // Use opts() to get parsed options

        
        // Add arguments to options
        if (config.arguments && argValues.length > 0) {
          config.arguments.forEach((arg, index) => {
            if (index < argValues.length) {
              options[arg.name] = argValues[index];
            }
          });
        }

        return handler(options);
      });
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
    description: `Install MCP servers (${getAllServerIDs().join(', ')})`,
  },
] as const;
