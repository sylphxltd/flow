#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const sync_1 = require("./sync");
const install_1 = require("./install");
const program = new commander_1.Command();
program
    .name('rules')
    .description('Type-safe development rules CLI')
    .version('1.0.0');
program
    .command('sync')
    .description('Sync development rules to your project')
    .option('--agent <type>', 'Force specific agent (cursor, kilocode, roocode)')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--clear', 'Clear obsolete rules before syncing')
    .option('--merge', 'Merge all rules into a single file')
    .action(async (options) => {
    try {
        await (0, sync_1.syncRules)(options);
    }
    catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('install')
    .description('Install workflow agents for OpenCode')
    .option('--agent <type>', 'Force specific agent (opencode)')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--clear', 'Clear obsolete agents before installing')
    .option('--merge', 'Merge all agents into a single file')
    .action(async (options) => {
    if (options.agent && options.agent !== 'opencode') {
        console.log('❌ Currently only opencode is supported for install.');
        process.exit(1);
    }
    options.agent = options.agent || 'opencode';
    try {
        await (0, install_1.installAgents)(options);
    }
    catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('mcp')
    .description('Start the MCP server')
    .action(async () => {
    console.log('🔌 Starting MCP server transport...');
    try {
        // Lazy load MCP server components only when needed
        const { StdioServerTransport } = await Promise.resolve().then(() => __importStar(require('@modelcontextprotocol/sdk/server/stdio.js')));
        const server = (await Promise.resolve().then(() => __importStar(require('./server')))).default;
        const transport = new StdioServerTransport();
        console.log('🔗 Connecting server to transport...');
        await server.connect(transport);
        console.log('✨ MCP server connected and running');
        // Keep the process running for MCP communication
        process.stdin.resume();
    }
    catch (error) {
        console.error(`❌ MCP Server Error: ${error.message}`);
        process.exit(1);
    }
});
// Default action when no command is provided
program.action(() => {
    console.log('🚀 Rules CLI - Type-safe development rules');
    console.log('==========================================');
    console.log('');
    console.log('Available commands:');
    console.log('  sync    Sync development rules to your project');
    console.log('  mcp     Start the MCP server');
    console.log('');
    console.log('Examples:');
    console.log('  rules sync');
    console.log('  rules mcp');
    console.log('  rules sync --agent cursor');
    console.log('  rules sync --dry-run');
    console.log('  rules sync --clear');
    console.log('  rules sync --merge');
    console.log('  rules install --agent opencode');
    console.log('');
    console.log('Run "rules <command> --help" for more information about a command.');
});
// If no arguments provided, show help
if (process.argv.length === 2) {
    program.help();
}
program.parse();
