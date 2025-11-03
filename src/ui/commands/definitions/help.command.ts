/**
 * Help Command
 * Show available commands
 */

import type { Command } from '../types.js';

export const helpCommand: Command = {
  id: 'help',
  label: '/help',
  description: 'Show available commands',
  execute: async (context) => {
    const commands = context.getCommands();
    const commandList = commands
      .map((cmd) => {
        const argsText = cmd.args
          ? ` ${cmd.args.map((a) => `[${a.name}]`).join(' ')}`
          : '';
        return `${cmd.label}${argsText} - ${cmd.description}`;
      })
      .join('\n');
    return `Available commands:\n${commandList}`;
  },
};

export default helpCommand;
