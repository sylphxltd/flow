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
    { flags: '--mcp', description: 'Install all available MCP tools' },
  ],
  handler: async (options: CommandOptions) => {
    validateInitOptions(options);

    console.log('🚀 Initializing Sylphx Flow development environment...');
    console.log(`🤖 Agent: ${options.agent}`);

    // Install MCP tools if requested
    if (options.mcp) {
      console.log('🔧 Installing MCP tools...');
      if (options.dryRun) {
        console.log('🔍 Dry run: Would install MCP tools: memory, everything');
      } else {
        await addMCPServers(process.cwd(), ['memory', 'everything']);
        console.log('✅ MCP tools installed');
      }
      console.log('');
    }

    // Install agents
    await installAgents(options);

    console.log('');
    console.log('🎉 Sylphx Flow initialization complete!');
    console.log('📖 Next steps:');
    console.log('   - Start MCP server: sylphx-flow mcp start');
    console.log('   - List available MCP tools: sylphx-flow mcp list');
  },
};
