"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCommand = void 0;
const sync_1 = require("../../sync");
const error_handler_1 = require("../utils/error-handler");
const command_builder_1 = require("../utils/command-builder");
function validateSyncOptions(options) {
    if (options.agent && !['cursor', 'kilocode', 'roocode'].includes(options.agent)) {
        throw new error_handler_1.CLIError(`Invalid agent: ${options.agent}. Supported agents: cursor, kilocode, roocode`, 'INVALID_AGENT');
    }
}
exports.syncCommand = {
    name: 'sync',
    description: 'Sync development rules to your project',
    options: [
        { ...command_builder_1.COMMON_OPTIONS[0], description: 'Force specific agent (cursor, kilocode, roocode)' },
        ...command_builder_1.COMMON_OPTIONS.slice(1)
    ],
    handler: sync_1.syncRules,
    validator: validateSyncOptions
};
