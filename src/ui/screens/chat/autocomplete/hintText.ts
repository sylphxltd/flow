import type { Command } from '../../../commands/types.js';

/**
 * Factory function to create a hint text getter for command autocomplete
 *
 * @param commands - List of available commands
 * @returns Function that gets hint text for current input
 */
export function createGetHintText(commands: Command[]) {
  return (input: string): string | undefined => {
    if (!input.startsWith('/')) return undefined;

    const parts = input.split(' ');
    const commandName = parts[0];

    // Find matching command
    const matchedCommand = commands.find((cmd) => cmd.label === commandName);
    if (matchedCommand && matchedCommand.args && matchedCommand.args.length > 0) {
      // Count non-empty args after command name
      const args = parts.slice(1).filter(p => p.trim() !== '');
      const currentArgIndex = args.length;
      if (currentArgIndex < matchedCommand.args.length) {
        const arg = matchedCommand.args[currentArgIndex];
        if (arg) {
          return arg.required ? `[${arg.name}]` : `<${arg.name}>`;
        }
      }
    }

    return undefined;
  };
}
