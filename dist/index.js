#!/usr/bin/env node
import { Command } from 'commander';
import { syncRules } from './sync';
const program = new Command();
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
        await syncRules(options);
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
        const { installAgents } = await import('./install');
        await installAgents(options);
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
        const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
        const server = (await import('./server')).default;
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
