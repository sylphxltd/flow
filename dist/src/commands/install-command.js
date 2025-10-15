import { installAgents } from './install.js';
import { CLIError } from '../utils/error-handler.js';
import { COMMON_OPTIONS } from '../utils/command-builder.js';
import { parseMCPServerTypes, addMCPServers, listMCPServers } from '../utils/mcp-config.js';
function validateInstallOptions(options) {
    if (options.agent && options.agent !== 'opencode') {
        throw new CLIError('Currently only opencode is supported for install.', 'UNSUPPORTED_AGENT');
    }
    options.agent = options.agent || 'opencode';
    // Validate MCP servers if provided
    if (options.mcp && Array.isArray(options.mcp) && options.mcp.length > 0) {
        const validServers = parseMCPServerTypes(options.mcp);
        if (validServers.length === 0) {
            throw new CLIError('Invalid MCP servers. Available: memory, everything', 'INVALID_MCP_SERVERS');
        }
        options.mcp = validServers;
    }
}
export const installCommand = {
    name: 'install',
    description: 'Install workflow agents for OpenCode',
    options: [
        { ...COMMON_OPTIONS[0], description: 'Force specific agent (opencode)' },
        ...COMMON_OPTIONS.slice(1)
    ],
    handler: async (options) => {
        validateInstallOptions(options);
        // Handle MCP server operations
        if (options.mcp) {
            if (Array.isArray(options.mcp) && options.mcp.length > 0) {
                // Install MCP servers
                console.log('🔧 Installing MCP servers...');
                const serverTypes = parseMCPServerTypes(options.mcp);
                if (serverTypes.length > 0) {
                    if (!options.dryRun) {
                        await addMCPServers(process.cwd(), serverTypes);
                    }
                    else {
                        console.log('🔍 Dry run: Would install MCP servers:', serverTypes.join(', '));
                    }
                    console.log('');
                }
            }
            else {
                // List MCP servers (when --mcp is provided without arguments)
                await listMCPServers(process.cwd());
                return;
            }
        }
        await installAgents(options);
    }
};
