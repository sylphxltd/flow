/**
 * Command Matcher - Pure functions for matching commands
 * @module features/commands/utils/matcher
 */

import type { Command } from '../../../ui/commands/types.js';

/**
 * Find command by exact name match
 * @pure No side effects
 *
 * @example
 * findCommand(commands, "/help") // Command object or undefined
 */
export function findCommand(commands: Command[], commandName: string): Command | undefined {
  return commands.find(cmd => cmd.label === commandName);
}

/**
 * Filter commands by query (fuzzy match on label and description)
 * @pure No side effects
 *
 * @example
 * filterCommands(commands, "help") // [{ label: "/help", ... }]
 * filterCommands(commands, "mod") // [{ label: "/model", ... }, ...]
 */
export function filterCommands(commands: Command[], query: string): Command[] {
  const lowerQuery = query.toLowerCase();

  return commands.filter(cmd =>
    cmd.label.toLowerCase().includes(lowerQuery) ||
    cmd.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Match commands based on input (removes leading / from query)
 * @pure No side effects
 *
 * @example
 * matchCommands(commands, "/hel") // [{ label: "/help", ... }]
 * matchCommands(commands, "/") // all commands
 */
export function matchCommands(commands: Command[], input: string): Command[] {
  // Remove leading / and trim for matching
  const query = input.startsWith('/') ? input.slice(1).trim() : input.trim();
  return filterCommands(commands, query);
}

/**
 * Check if command has arguments defined
 * @pure No side effects
 */
export function hasArgs(command: Command): boolean {
  return !!command.args && command.args.length > 0;
}

/**
 * Get command argument at index
 * @pure No side effects
 */
export function getArg(command: Command, index: number): Command['args'][number] | undefined {
  if (!command.args || index < 0 || index >= command.args.length) {
    return undefined;
  }
  return command.args[index];
}
