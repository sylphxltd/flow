import { useMemo } from 'react';
import type { Command, CommandContext, SelectOption } from '../../../commands/types.js';

/**
 * Hook to filter and autocomplete commands based on input
 *
 * PERFORMANCE: Memoized to avoid recallocating on every render
 *
 * Handles:
 * - Command name matching
 * - Multi-level autocomplete (command args)
 * - Priority: label matches first, then description matches
 * - Only triggers if cursor is AFTER / (cursor > 0)
 *
 * @param input - Current input text
 * @param cursor - Current cursor position
 * @param cachedOptions - Cached command argument options
 * @param createCommandContext - Factory to create command context
 * @returns Filtered list of commands with autocomplete suggestions
 */
export function useCommandAutocomplete(
  input: string,
  cursor: number,
  cachedOptions: Map<string, SelectOption[]>,
  createCommandContext: (args: string[]) => CommandContext,
  commands: Command[]
): Command[] {
  return useMemo(() => {
    if (!input.startsWith('/')) return [];

    // Only trigger if cursor is AFTER the / symbol
    // This prevents autocomplete when cursor is before / (e.g., |/ should not trigger)
    if (cursor === 0) {
      return [];
    }

    const parts = input.split(' ');
    const commandName = parts[0];

    const matchedCommand = commands.find((cmd) => cmd.label === commandName);

    // Multi-level autocomplete: if command has args and user is typing args
    if (matchedCommand && matchedCommand.args && parts.length > 1) {
      // Determine which arg we're currently on
      const args = parts.slice(1).filter(p => p.trim() !== '');
      const lastPart = parts[parts.length - 1];
      const isTypingNewArg = lastPart === ''; // User just typed space

      // If typing new arg, load next arg's options
      // If typing existing arg, load current arg's options and filter
      const currentArgIndex = isTypingNewArg ? args.length : Math.max(0, args.length - 1);
      const currentArgInput = isTypingNewArg ? '' : lastPart;

      const arg = matchedCommand.args[currentArgIndex];
      if (arg) {
        // Use same cache key pattern as loadOptions
        const cacheKey = `${matchedCommand.id}:${arg.name}:${args.join(',')}`;
        const options = cachedOptions.get(cacheKey) || [];

        if (options.length > 0) {
          return options
            .filter((option) =>
              option.label.toLowerCase().includes(currentArgInput?.toLowerCase() || '') ||
              (option.value && option.value.toLowerCase().includes(currentArgInput?.toLowerCase() || ''))
            )
            .map((option) => {
              // Build the full command string with all args
              const allArgs = isTypingNewArg
                ? [...args, option.value || option.label]
                : [...args.slice(0, -1), option.value || option.label];
              return {
                id: `${cacheKey}-${option.value || option.label}`,
                label: `${commandName} ${allArgs.join(' ')}`,
                description: '',
                args: matchedCommand.args,
                execute: async (_context: CommandContext) => {
                  return await matchedCommand.execute(createCommandContext(allArgs));
                },
              } as Command;
            });
        }
      }
    }

    // Command filtering with priority:
    // 1. Commands where label matches (exact command name match)
    // 2. Commands where description matches (secondary)
    const query = input.slice(1).toLowerCase();

    const labelMatches = commands.filter((cmd) =>
      cmd.label.toLowerCase().includes(`/${query}`)
    );

    const descriptionMatches = commands.filter(
      (cmd) =>
        !cmd.label.toLowerCase().includes(`/${query}`) &&
        cmd.description.toLowerCase().includes(query)
    );

    // Return label matches first, then description matches
    return [...labelMatches, ...descriptionMatches];
  }, [input, cursor, cachedOptions, createCommandContext, commands]); // Recompute when input, cursor or cached options change
}
