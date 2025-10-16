import { CommandConfig, CommandHandler } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { parseMCPServerTypes, addMCPServers, listMCPServers } from '../utils/mcp-config.js';

// MCP start handler
const mcpStartHandler: CommandHandler = async () => {
  // Import and start the Sylphx Flow MCP server
  await import('../servers/sylphx-flow-mcp-server.js');
  
  console.log('🚀 Starting Sylphx Flow MCP Server...');
  console.log('📍 Database: .memory/memory.json');
  console.log('🔧 Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats');
  console.log('💡 Press Ctrl+C to stop the server');
  
  // The server is already initialized in the module
  // We just need to keep the process alive
  process.stdin.resume();
};

// MCP install handler
const mcpInstallHandler: CommandHandler = async (options: any) => {
  const servers = options.servers || [];
  
  if (options.all) {
    console.log('🔧 Installing all available MCP tools...');
    if (!options.dryRun) {
      await addMCPServers(process.cwd(), ['memory', 'everything']);
      console.log('✅ All MCP tools installed');
    } else {
      console.log('🔍 Dry run: Would install MCP tools: memory, everything');
    }
    return;
  }
  
  if (servers.length === 0) {
    throw new CLIError(
      'Please specify MCP tools to install or use --all',
      'NO_SERVERS_SPECIFIED'
    );
  }
  
  const validServers = parseMCPServerTypes(servers);
  if (validServers.length === 0) {
    throw new CLIError(
      'Invalid MCP tools. Available: memory, everything',
      'INVALID_MCP_SERVERS'
    );
  }
  
  console.log(`🔧 Installing MCP tools: ${validServers.join(', ')}`);
  if (!options.dryRun) {
    await addMCPServers(process.cwd(), validServers);
    console.log('✅ MCP tools installed');
  } else {
    console.log('🔍 Dry run: Would install MCP tools:', validServers.join(', '));
  }
};

// MCP list handler
const mcpListHandler: CommandHandler = async () => {
  await listMCPServers(process.cwd());
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
      handler: mcpStartHandler
    },
    {
      name: 'install',
      description: 'Install MCP tools for OpenCode',
      options: [
        { flags: '<servers...>', description: 'MCP tools to install (memory, everything)' },
        { flags: '--all', description: 'Install all available MCP tools' },
        { flags: '--dry-run', description: 'Show what would be done without making changes' }
      ],
      handler: mcpInstallHandler
    },
    {
      name: 'list',
      description: 'List all available MCP tools',
      options: [],
      handler: mcpListHandler
    }
  ]
};