import { Command } from 'commander';
import { createCommand } from './utils/command-builder.js';
import { showDefaultHelp } from './utils/help.js';
import { syncCommand } from './commands/sync-command.js';
import { installCommand } from './commands/install-command.js';
import { mcpCommand } from './commands/mcp-command.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('sylphx-flow')
    .description('Type-safe development flow CLI')
    .version('1.0.0');

  const commands = [syncCommand, installCommand, mcpCommand];
  
  commands.forEach(commandConfig => {
    program.addCommand(createCommand(commandConfig));
  });

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