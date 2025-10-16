import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { addMCPServers } from '../utils/mcp-config.js';
import { installAgents } from './install.js';

function validateInitOptions(options: CommandOptions): void {
  // Default to opencode agent
  options.agent = options.agent || 'opencode';

  if (options.agent !== 'opencode') {
    throw new CLIError('Currently only opencode is supported for init.', 'UNSUPPORTED_AGENT');
  }

  // Remove unsupported options for init
  if (options.merge) {
    throw new CLIError('The --merge option is not supported with init command.', 'INVALID_OPTION');
  }
}

export const initCommand: CommandConfig = {
  name: 'init',
  description: 'Initialize project with Sylphx Flow development agents and MCP tools',
  options: [
    { flags: '--agent <type>', description: 'Force specific agent (default: opencode)' },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without making changes' },
    { flags: '--clear', description: 'Clear obsolete items before processing' },
    { flags: '--no-mcp', description: 'Skip MCP tools installation' },
  ],
  handler: async (options: CommandOptions) => {
    validateInitOptions(options);

    console.log('🚀 Sylphx Flow Setup');
    console.log('======================');
    console.log(`🤖 Agent: ${options.agent}`);
    console.log('');

    // Install MCP tools by default (unless --no-mcp is specified)
    // When --no-mcp is used, options.mcp will be false
    if (options.mcp !== false) {
      console.log('📦 Installing MCP tools...');
      if (options.dryRun) {
        console.log('🔍 Dry run: Would install memory & everything servers');
      } else {
        await addMCPServers(process.cwd(), ['memory', 'everything']);
        console.log('✅ MCP tools configured');
      }
      console.log('');
    }

    // Install agents
    await installAgents(options);

    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('📋 Next steps:');
    if (options.mcp !== false) {
      console.log('   • Start MCP server: npx github:sylphxltd/flow mcp start');
    }
    console.log('   • Sync agents:     npx github:sylphxltd/flow sync');
    console.log('   • List MCP tools:  npx github:sylphxltd/flow mcp list');
  },
};
