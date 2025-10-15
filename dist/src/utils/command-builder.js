"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMON_OPTIONS = void 0;
exports.createCommand = createCommand;
const commander_1 = require("commander");
const error_handler_1 = require("./error-handler");
function createCommand(config) {
    const command = new commander_1.Command(config.name);
    command.description(config.description);
    config.options.forEach(option => {
        command.option(option.flags, option.description);
    });
    const handler = (0, error_handler_1.createAsyncHandler)(config.handler, config.name);
    command.action(handler);
    if (config.validator) {
        command.action((options) => {
            config.validator(options);
            return handler(options);
        });
    }
    return command;
}
exports.COMMON_OPTIONS = [
    { flags: '--agent <type>', description: 'Force specific agent' },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without making changes' },
    { flags: '--clear', description: 'Clear obsolete items before processing' },
    { flags: '--merge', description: 'Merge all items into a single file' }
];
