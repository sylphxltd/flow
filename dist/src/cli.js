import { Command } from 'commander';
import { createCommand } from './utils/command-builder';
import { showDefaultHelp } from './utils/help';
import { syncCommand } from './commands/sync-command';
import { installCommand } from './commands/install-command';
import { mcpCommand } from './commands/mcp-command';
export function createCLI() {
    const program = new Command();
    program
        .name('rules')
        .description('Type-safe development rules CLI')
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
export function runCLI() {
    const program = createCLI();
    if (process.argv.length === 2) {
        program.help();
    }
    program.parse();
}
