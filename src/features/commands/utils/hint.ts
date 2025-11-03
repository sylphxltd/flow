/**
 * Command Hint Generator - Pure functions for generating hint text
 * @module features/commands/utils/hint
 */

import type { Command } from '../../../ui/commands/types.js';
import { parseCommand, getCurrentArgIndex } from './parser.js';
import { findCommand, getArg } from './matcher.js';

/**
 * Generate hint text for command arguments
 * @pure No side effects
 *
 * Returns undefined if:
 * - Input is not a command
 * - Command not found
 * - Command has no args
 * - All args are provided
 * - User is actively typing an arg (not ending with space)
 *
 * Returns hint text like:
 * - "[model]" for required arg
 * - "<description>" for optional arg
 *
 * Only shows hint when user has pressed space and is ready to type next arg
 *
 * @example
 * generateHint(commands, "/model ") // "[model]"
 * generateHint(commands, "/help") // undefined (no args)
 * generateHint(commands, "/model gpt-4") // undefined (actively typing)
 * generateHint(commands, "/model gpt-4 ") // undefined (arg complete)
 */
export function generateHint(commands: Command[], input: string): string | undefined {
  if (!input.startsWith('/')) return undefined;

  const { commandName, args } = parseCommand(input);
  const command = findCommand(commands, commandName);

  if (!command || !command.args || command.args.length === 0) {
    return undefined;
  }

  // Only show hint when input ends with space (ready to type next arg)
  // and we haven't filled all args yet
  const trimmed = input.trim();
  const endsWithSpace = input !== trimmed && input.endsWith(' ');

  if (!endsWithSpace) {
    return undefined;
  }

  // Get number of complete args (non-empty args)
  const completeArgsCount = args.length;

  // If we've provided all args, no hint
  if (completeArgsCount >= command.args.length) {
    return undefined;
  }

  const arg = getArg(command, completeArgsCount);
  if (!arg) return undefined;

  // Format hint based on required/optional
  return arg.required ? `[${arg.name}]` : `<${arg.name}>`;
}
