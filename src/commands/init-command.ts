import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { addMCPServers, configureMCPServer, promptForAPIKeys } from '../utils/mcp-config.js';
import { getDefaultServers, getServersRequiringAPIKeys } from '../config/servers.js';
import { installAgents } from '../core/init.js';

function validateInitOptions(options: CommandOptions): void {
  // Default to opencode target
  options.target = options.target || 'opencode';

  if (options.target !== 'opencode') {
    throw new CLIError('Currently only opencode is supported for init.', 'UNSUPPORTED_TARGET');
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
    { flags: '--target <type>', description: 'Force specific target (default: opencode)' },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without making changes' },
    { flags: '--clear', description: 'Clear obsolete items before processing' },
    { flags: '--no-mcp', description: 'Skip MCP tools installation' },
  ],
  handler: async (options: CommandOptions) => {
    validateInitOptions(options);

    console.log('🚀 Sylphx Flow Setup');
    console.log('======================');
    console.log(`🎯 Target: ${options.target}`);
    console.log('');

    // Install MCP tools by default (unless --no-mcp is specified)
    if (options.mcp !== false) {
      console.log('📦 Installing MCP tools...');
      const defaultServers = getDefaultServers();

      if (options.dryRun) {
        console.log('🔍 Dry run: Would install all MCP servers');
        console.log(`   • ${defaultServers.join(', ')}`);
      } else {
        await addMCPServers(process.cwd(), defaultServers);

        // Prompt for API keys for servers that need them
        const serversNeedingKeys = getServersRequiringAPIKeys();

        if (serversNeedingKeys.length > 0) {
          console.log('\n🔑 Some MCP tools require API keys:');
          const apiKeys = await promptForAPIKeys(serversNeedingKeys);

          if (Object.keys(apiKeys).length > 0) {
            // Update configs with API keys
            for (const serverType of serversNeedingKeys) {
              await configureMCPServer(process.cwd(), serverType);
            }
          }
        }

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
    console.log('   • Open OpenCode and start using your agents!');
    if (options.mcp !== false) {
      console.log('   • MCP tools will be automatically loaded by OpenCode');
    }
  },
};
