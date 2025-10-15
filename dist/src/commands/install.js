"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installCommand = void 0;
const install_1 = require("../../install");
const error_handler_1 = require("../utils/error-handler");
const command_builder_1 = require("../utils/command-builder");
function validateInstallOptions(options) {
    if (options.agent && options.agent !== 'opencode') {
        throw new error_handler_1.CLIError('Currently only opencode is supported for install.', 'UNSUPPORTED_AGENT');
    }
    options.agent = options.agent || 'opencode';
}
exports.installCommand = {
    name: 'install',
    description: 'Install workflow agents for OpenCode',
    options: [
        { ...command_builder_1.COMMON_OPTIONS[0], description: 'Force specific agent (opencode)' },
        ...command_builder_1.COMMON_OPTIONS.slice(1)
    ],
    handler: async (options) => {
        validateInstallOptions(options);
        await (0, install_1.installAgents)(options);
    }
};
