/**
 * Command Filter - Pure functions for filtering commands with arg autocomplete
 * @module features/commands/utils/filter
 */

import type { Command, SelectOption } from '../../../ui/commands/types.js';
import { parseCommand, getCurrentArgIndex, isTypingNewArg, getCurrentArg } from './parser.js';
import { findCommand, getArg, matchCommands } from './matcher.js';

/**
 * Autocomplete result for command arguments
 */
export interface ArgAutocompleteResult {
  /** Filtered options for current arg */
  options: SelectOption[];
  /** Current argument index */
  argIndex: number;
  /** Cache key for option loading */
  cacheKey: string;
  /** Whether user is typing a new arg (just pressed space) */
  isTypingNewArg: boolean;
  /** Current arg input (for filtering) */
  currentArgInput: string;
}

/**
 * Generate cache key for arg options
 * Includes command ID, arg name, and previous args to invalidate when args change
 * @pure No side effects
 *
 * @example
 * generateCacheKey("model", "provider", ["openrouter"])
 * // "model:provider:openrouter"
 */
export function generateCacheKey(
  commandId: string,
  argName: string,
  previousArgs: string[]
): string {
  return `${commandId}:${argName}:${previousArgs.join(',')}`;
}

/**
 * Get autocomplete options for command arguments
 * Returns null if:
 * - Input is not a command
 * - Command not found
 * - Command has no args
 * - Not typing args yet
 * - Current arg has no loadOptions
 *
 * @pure No side effects (options must be pre-loaded in cache)
 *
 * @example
 * const result = getArgAutocomplete(commands, "/model ", optionsCache)
 * if (result) {
 *   console.log(result.options) // Available options for first arg
 * }
 */
export function getArgAutocomplete(
  commands: Command[],
  input: string,
  optionsCache: Map<string, SelectOption[]>
): ArgAutocompleteResult | null {
  if (!input.startsWith('/')) return null;

  const { commandName, args } = parseCommand(input);
  const command = findCommand(commands, commandName);

  if (!command || !command.args) {
    return null;
  }

  // Need at least one arg or be typing new arg
  if (args.length === 0 && !isTypingNewArg(input)) {
    return null;
  }

  const currentArgIndex = getCurrentArgIndex(input);
  const arg = getArg(command, currentArgIndex);

  if (!arg || !arg.loadOptions) {
    return null;
  }

  // For cache key, use only the complete args (excluding current arg being typed)
  // When typing "/model gpt", args = ["gpt"] but we want cache key without "gpt"
  // When typing "/model ", args = [] and we want cache key with []
  const typingNew = isTypingNewArg(input);
  const previousArgs = typingNew ? args : args.slice(0, -1);

  const cacheKey = generateCacheKey(command.id, arg.name, previousArgs);
  const options = optionsCache.get(cacheKey) || [];

  return {
    options,
    argIndex: currentArgIndex,
    cacheKey,
    isTypingNewArg: typingNew,
    currentArgInput: getCurrentArg(input),
  };
}

/**
 * Filter options by current arg input (fuzzy match on label and value)
 * @pure No side effects
 *
 * @example
 * filterOptions(options, "gpt")
 * // Options with "gpt" in label or value
 */
export function filterOptions(options: SelectOption[], query: string): SelectOption[] {
  if (!query) return options;

  const lowerQuery = query.toLowerCase();

  return options.filter(opt =>
    opt.label.toLowerCase().includes(lowerQuery) ||
    (opt.value && opt.value.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Build autocomplete command suggestions from arg options
 * Creates Command-like objects for each option with execute function
 * @pure No side effects (execute function must be provided externally)
 *
 * @example
 * const suggestions = buildArgSuggestions(
 *   command,
 *   options,
 *   args,
 *   isTypingNewArg,
 *   cacheKey,
 *   (allArgs) => executeCommand(command, allArgs)
 * )
 */
export function buildArgSuggestions(
  command: Command,
  options: SelectOption[],
  args: string[],
  isTypingNewArg: boolean,
  cacheKey: string,
  executeFn: (allArgs: string[]) => Promise<void>
): Array<Command & { id: string }> {
  return options.map(option => {
    // Build the full command string with all args
    const allArgs = isTypingNewArg
      ? [...args, option.value || option.label]
      : [...args.slice(0, -1), option.value || option.label];

    return {
      id: `${cacheKey}-${option.value || option.label}`,
      label: `${command.label} ${allArgs.join(' ')}`,
      description: '',
      args: command.args,
      execute: async () => {
        return await executeFn(allArgs);
      },
    };
  });
}

/**
 * Filter commands with multi-level autocomplete support
 * Handles both command name matching and argument autocomplete
 * @pure No side effects
 *
 * Returns:
 * - Empty array if not a command
 * - Arg autocomplete suggestions if command has args and user is typing args
 * - Command name matches otherwise
 *
 * @example
 * const filtered = filterCommandsWithArgs(
 *   commands,
 *   "/model ",
 *   optionsCache,
 *   (allArgs) => executeCommand(allArgs)
 * )
 */
export function filterCommandsWithArgs(
  commands: Command[],
  input: string,
  optionsCache: Map<string, SelectOption[]>,
  executeFn: (command: Command, allArgs: string[]) => Promise<void>
): Command[] {
  if (!input.startsWith('/')) return [];

  const { commandName, args } = parseCommand(input);
  const command = findCommand(commands, commandName);

  // Multi-level autocomplete: if command has args and user is typing args
  if (command && command.args && (args.length > 0 || isTypingNewArg(input))) {
    const autocomplete = getArgAutocomplete(commands, input, optionsCache);

    if (autocomplete && autocomplete.options.length > 0) {
      const filtered = filterOptions(autocomplete.options, autocomplete.currentArgInput);
      return buildArgSuggestions(
        command,
        filtered,
        args,
        autocomplete.isTypingNewArg,
        autocomplete.cacheKey,
        (allArgs) => executeFn(command, allArgs)
      );
    }
  }

  // Command name matching
  return matchCommands(commands, input);
}
