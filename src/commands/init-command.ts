import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { addMCPServers, configureMCPServer, promptForAPIKeys } from '../utils/mcp-config.js';
import { installAgents } from '../core/init.js';

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
    if (options.mcp !== false) {
      console.log('📦 Installing MCP tools...');
      if (options.dryRun) {
        console.log('🔍 Dry run: Would install all MCP servers');
        console.log('   • memory, gpt-image, perplexity, context7, gemini-search');
      } else {
        const allServers: string[] = [
          'memory',
          'gpt-image',
          'perplexity',
          'context7',
          'gemini-search',
        ];
        await addMCPServers(process.cwd(), allServers);

        // Prompt for API keys for servers that need them
        const serversNeedingKeys = allServers.filter((server) =>
          ['gpt-image', 'perplexity', 'gemini-search'].includes(server)
        );

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
