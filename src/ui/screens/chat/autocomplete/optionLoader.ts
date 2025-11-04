import { useEffect } from 'react';
import type { Command, CommandContext, SelectOption } from '../../../commands/types.js';

/**
 * Hook to manage loading of command argument options with caching
 *
 * Extracted from Chat.tsx lines ~432-477
 *
 * Handles:
 * - Determining which argument is currently being typed
 * - Loading options via loadOptions function
 * - Caching results to avoid redundant loads
 * - Cache key includes previous args to invalidate when args change
 *
 * @param input - Current input text
 * @param currentlyLoading - Cache key of currently loading options
 * @param cachedOptions - Map of cached options by cache key
 * @param setCachedOptions - Setter for cached options
 * @param setCurrentlyLoading - Setter for currently loading state
 * @param setLoadError - Setter for load error state
 * @param createCommandContext - Factory to create command context
 * @param commands - List of available commands
 */
export function useCommandOptionLoader(
  input: string,
  currentlyLoading: string | null,
  cachedOptions: Map<string, SelectOption[]>,
  setCachedOptions: React.Dispatch<React.SetStateAction<Map<string, SelectOption[]>>>,
  setCurrentlyLoading: React.Dispatch<React.SetStateAction<string | null>>,
  setLoadError: React.Dispatch<React.SetStateAction<string | null>>,
  createCommandContext: (args: string[]) => CommandContext,
  commands: Command[],
  addLog: (message: string) => void
) {
  useEffect(() => {
    if (!input.startsWith('/')) return;

    const parts = input.split(' ');
    const commandName = parts[0];
    const matchedCommand = commands.find((cmd) => cmd.label === commandName);

    // If command has args with loadOptions and user is typing args
    if (matchedCommand && matchedCommand.args && parts.length > 1) {
      // Determine which arg we're currently on
      const args = parts.slice(1).filter(p => p.trim() !== '');
      const lastPart = parts[parts.length - 1];
      const isTypingNewArg = lastPart === ''; // User just typed space

      // If typing new arg, load next arg's options
      // If typing existing arg, load current arg's options
      const currentArgIndex = isTypingNewArg ? args.length : Math.max(0, args.length - 1);
      const arg = matchedCommand.args[currentArgIndex];

      if (arg && arg.loadOptions) {
        // Include previous args in cache key to invalidate when args change
        const cacheKey = `${matchedCommand.id}:${arg.name}:${args.join(',')}`;

        // Trigger load if not cached and not loading
        if (!cachedOptions.has(cacheKey) && currentlyLoading !== cacheKey) {
          setCurrentlyLoading(cacheKey);

          // Create context for loadOptions
          const context = createCommandContext([]);

          arg.loadOptions(args, context)
            .then((options) => {
              // Use functional update to avoid dependency on cachedOptions
              setCachedOptions((prev) => new Map(prev).set(cacheKey, options));
              setCurrentlyLoading(null);
            })
            .catch((error) => {
              const errorMsg = error instanceof Error ? error.message : String(error);
              addLog(`Error loading ${cacheKey}: ${errorMsg}`);
              setLoadError(errorMsg);
              setCurrentlyLoading(null);
            });
        }
      }
    }
  }, [input, currentlyLoading, cachedOptions, setCachedOptions, setCurrentlyLoading, setLoadError, createCommandContext, commands, addLog]); // cachedOptions removed from deps to prevent loop, commands are stable
}
