import { Command } from 'commander';
import { createCommand } from './utils/command-builder.js';
import { showDefaultHelp } from './utils/help.js';
import { syncCommand } from './commands/sync-command.js';
import { initCommand } from './commands/init-command.js';
import { mcpCommand } from './commands/mcp-command.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('sylphx-flow')
    .description('Sylphx Flow - Type-safe development flow CLI')
    .version('1.0.0');

  const commands = [syncCommand, initCommand, mcpCommand];
  
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