#!/usr/bin/env node
import { Command } from 'commander';
import server from './server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
  .action(async (options) => {
    try {
      await syncRules(options);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('mcp')
  .description('Start the MCP server')
  .action(async () => {
    console.log('🔌 Starting MCP server transport...');
    try {
      const transport = new StdioServerTransport();
      console.log('🔗 Connecting server to transport...');
      await server.connect(transport);
      console.log('✨ MCP server connected and running');
      // Keep the process running for MCP communication
      process.stdin.resume();
    } catch (error) {
      console.error(`❌ MCP Server Error: ${(error as Error).message}`);
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
  console.log('');
  console.log('Run "rules <command> --help" for more information about a command.');
});

// If no arguments provided, show help
if (process.argv.length === 2) {
  program.help();
}

program.parse();