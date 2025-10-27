import { Command } from 'commander';
import { benchmarkCommand } from './commands/benchmark-command.js';
import { codebaseCommand } from './commands/codebase-command.js';
import { initCommand } from './commands/init-command.js';
import { knowledgeCommand } from './commands/knowledge-command.js';
import { mcpCommand } from './commands/mcp-command.js';
import { memoryCommand } from './commands/memory-command.js';
import { handleMemoryTuiCommand } from './commands/memory-tui-command.js';
import { runCommand } from './commands/run-command.js';

import { createCommand } from './utils/command-builder.js';
import { showDefaultHelp } from './utils/help.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('sylphx-flow')
    .description('Sylphx Flow - Type-safe development flow CLI')
    .version('1.0.0');

  const commands = [initCommand, mcpCommand, memoryCommand, runCommand, benchmarkCommand];

  // Add new structured commands
  program.addCommand(codebaseCommand);
  program.addCommand(knowledgeCommand);

  for (const commandConfig of commands) {
    program.addCommand(createCommand(commandConfig));
  }

  // Add TUI command separately since it has special handler
  program
    .command('tui')
    .description('Launch interactive Sylphx Flow TUI')
    .option('--target <type>', 'Target platform (opencode, default: auto-detect)')
    .action(handleMemoryTuiCommand);

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

  // Add global error handling
  process.on('uncaughtException', (error) => {
    console.error(`✗ Uncaught error: ${error.message}`);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error(`✗ Unhandled rejection: ${reason}`);
    process.exit(1);
  });

  try {
    program.parse();
  } catch (error) {
    console.error(`✗ Error: ${(error as Error).message}`);
    process.exit(1);
  }
}
