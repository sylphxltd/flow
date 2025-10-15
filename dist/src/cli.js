"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCLI = createCLI;
exports.runCLI = runCLI;
const commander_1 = require("commander");
const command_builder_1 = require("./utils/command-builder");
const help_1 = require("./utils/help");
const sync_1 = require("./commands/sync");
const install_1 = require("./commands/install");
const mcp_1 = require("./commands/mcp");
function createCLI() {
    const program = new commander_1.Command();
    program
        .name('rules')
        .description('Type-safe development rules CLI')
        .version('1.0.0');
    const commands = [sync_1.syncCommand, install_1.installCommand, mcp_1.mcpCommand];
    commands.forEach(commandConfig => {
        program.addCommand((0, command_builder_1.createCommand)(commandConfig));
    });
    program.action(() => {
        (0, help_1.showDefaultHelp)();
    });
    return program;
}
function runCLI() {
    const program = createCLI();
    if (process.argv.length === 2) {
        program.help();
    }
    program.parse();
}
