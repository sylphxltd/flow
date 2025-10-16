import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { addMCPServers, listMCPServers, parseMCPServerTypes } from '../utils/mcp-config.js';
import { installAgents } from './install.js';

function validateInstallOptions(options: CommandOptions): void {
  if (options.agent && options.agent !== 'opencode') {
    throw new CLIError('Currently only opencode is supported for install.', 'UNSUPPORTED_AGENT');
  }

  options.agent = options.agent || 'opencode';

  // Validate MCP servers if provided
  if (options.mcp && Array.isArray(options.mcp) && options.mcp.length > 0) {
    const validServers = parseMCPServerTypes(options.mcp);
    if (validServers.length === 0) {
      throw new CLIError(
        'Invalid MCP servers. Available: memory, everything',
        'INVALID_MCP_SERVERS'
      );
    }
    options.mcp = validServers;
  }
}

export const installCommand: CommandConfig = {
  name: 'install',
  description: 'Install workflow agents for OpenCode',
  options: [
    { flags: '--agent <type>', description: 'Force specific agent (opencode)' },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without making changes' },
    { flags: '--clear', description: 'Clear obsolete items before processing' },
    { flags: '--merge', description: 'Merge all items into a single file' },
    { flags: '--mcp [servers...]', description: 'Install MCP servers (memory, everything)' },
  ],
  handler: async (options: CommandOptions) => {
    validateInstallOptions(options);

    // Handle MCP server operations
    if (options.mcp) {
      if (Array.isArray(options.mcp) && options.mcp.length > 0) {
        // Install MCP servers
        console.log('🔧 Installing MCP servers...');
        const serverTypes = parseMCPServerTypes(options.mcp);
        if (serverTypes.length > 0) {
          if (options.dryRun) {
            console.log('🔍 Dry run: Would install MCP servers:', serverTypes.join(', '));
          } else {
            await addMCPServers(process.cwd(), serverTypes);
          }
          console.log('');
        }
      } else {
        // List MCP servers (when --mcp is provided without arguments)
        await listMCPServers(process.cwd());
        return;
      }
    }

    await installAgents(options);
  },
};
