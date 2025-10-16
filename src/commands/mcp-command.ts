import type { CommandConfig, CommandHandler } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import {
  addMCPServers,
  configureMCPServer,
  listMCPServers,
  parseMCPServerTypes,
} from '../utils/mcp-config.js';
import { getAllServerIDs, getServersRequiringAPIKeys } from '../config/servers.js';

// MCP start handler
const mcpStartHandler: CommandHandler = async () => {
  // Import and start the Sylphx Flow MCP server
  await import('../servers/sylphx-flow-mcp-server.js');

  console.log('🚀 Starting Sylphx Flow MCP Server...');
  console.log('📍 Database: .sylphx-flow/memory.db');
  console.log(
    '🔧 Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats'
  );
  console.log('💡 Press Ctrl+C to stop the server');

  // The server is already initialized in the module
  // We just need to keep the process alive
  process.stdin.resume();
};

// MCP install handler
const mcpInstallHandler: CommandHandler = async (options: {
  servers?: string[];
  all?: boolean;
  dryRun?: boolean;
}) => {
  const servers = options.servers || [];

  if (options.all) {
    console.log('🔧 Installing all available MCP tools...');
    const allServers = getAllServerIDs();

    if (options.dryRun) {
      console.log(`🔍 Dry run: Would install all MCP tools: ${allServers.join(', ')}`);
    } else {
      await addMCPServers(process.cwd(), allServers);
      console.log('✅ All MCP tools installed');
    }
    return;
  }

  if (servers.length === 0) {
    throw new CLIError('Please specify MCP tools to install or use --all', 'NO_SERVERS_SPECIFIED');
  }

  const validServers = parseMCPServerTypes(servers);
  if (validServers.length === 0) {
    const availableServers = getAllServerIDs();
    throw new CLIError(
      `Invalid MCP tools. Available: ${availableServers.join(', ')}`,
      'INVALID_MCP_SERVERS'
    );
  }

  console.log(`🔧 Installing MCP tools: ${validServers.join(', ')}`);
  if (options.dryRun) {
    console.log('🔍 Dry run: Would install MCP tools:', validServers.join(', '));
  } else {
    await addMCPServers(process.cwd(), validServers);
    console.log('✅ MCP tools installed');
  }
};

// MCP list handler
const mcpListHandler: CommandHandler = async () => {
  await listMCPServers(process.cwd());
};

// MCP config handler
const mcpConfigHandler: CommandHandler = async (options) => {
  const server = options.server as string;
  if (!server) {
    throw new CLIError('Please specify a server to configure', 'NO_SERVER_SPECIFIED');
  }

  const validServers = parseMCPServerTypes([server]);
  if (validServers.length === 0) {
    const availableServers = getAllServerIDs();
    throw new CLIError(
      `Invalid MCP server: ${server}. Available: ${availableServers.join(', ')}`,
      'INVALID_MCP_SERVER'
    );
  }

  await configureMCPServer(process.cwd(), validServers[0]);
};

export const mcpCommand: CommandConfig = {
  name: 'mcp',
  description: 'Manage MCP (Model Context Protocol) tools and servers',
  options: [],
  subcommands: [
    {
      name: 'start',
      description: 'Start the Sylphx Flow MCP server',
      options: [],
      handler: mcpStartHandler,
    },
    {
      name: 'install',
      description: 'Install MCP tools for OpenCode',
      options: [
        {
          flags: '<servers...>',
          description: `MCP tools to install (${getAllServerIDs().join(', ')})`,
        },
        { flags: '--all', description: 'Install all available MCP tools' },
        { flags: '--dry-run', description: 'Show what would be done without making changes' },
      ],
      handler: mcpInstallHandler,
    },
    {
      name: 'list',
      description: 'List all available MCP tools',
      options: [],
      handler: mcpListHandler,
    },
    {
      name: 'config',
      description: 'Configure API keys for MCP tools',
      options: [
        {
          flags: '<server>',
          description: `MCP server to configure (${getServersRequiringAPIKeys().join(', ')})`,
        },
      ],
      handler: mcpConfigHandler,
    },
  ],
};
