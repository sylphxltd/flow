import { Command } from 'commander';
import { initCommand } from './commands/init-command.js';
import { mcpCommand } from './commands/mcp-command.js';
import { memoryCommand } from './commands/memory-command.js';
import { handleMemoryTui } from './commands/memory-tui-command.js';
import { runCommand } from './commands/run-command.js';
import { searchCommand } from './commands/search-command.js';

import { createCommand } from './utils/command-builder.js';
import { showDefaultHelp } from './utils/help.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('sylphx-flow')
    .description('Sylphx Flow - Type-safe development flow CLI')
    .version('1.0.0');

  const commands = [initCommand, mcpCommand, memoryCommand, runCommand];

  // Add search command directly since it has subcommands
  program.addCommand(searchCommand);

  for (const commandConfig of commands) {
    program.addCommand(createCommand(commandConfig));
  }

  // Add TUI command separately since it has special handler
  program
    .command('tui')
    .description('Launch interactive Sylphx Flow TUI')
    .option('--target <type>', 'Target platform (opencode, default: auto-detect)')
    .action(handleMemoryTui);

  program.action(() => {
    showDefaultHelp();
  });

  return program;
}

export function runCLI(): void {
  const program = createCLI();

  if (process.argv.length === 2) {
    program.help();
  }

  program.parse();
}
