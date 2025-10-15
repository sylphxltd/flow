import { Command } from 'commander';
import { createAsyncHandler } from './error-handler.js';
export function createCommand(config) {
    const command = new Command(config.name);
    command.description(config.description);
    config.options.forEach(option => {
        command.option(option.flags, option.description);
    });
    const handler = createAsyncHandler(config.handler, config.name);
    command.action(handler);
    if (config.validator) {
        command.action((options) => {
            config.validator(options);
            return handler(options);
        });
    }
    return command;
}
export const COMMON_OPTIONS = [
    { flags: '--agent <type>', description: 'Force specific agent' },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without making changes' },
    { flags: '--clear', description: 'Clear obsolete items before processing' },
    { flags: '--merge', description: 'Merge all items into a single file' },
    { flags: '--mcp [servers...]', description: 'Install MCP servers (memory, everything)' }
];
