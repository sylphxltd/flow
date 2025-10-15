const mcpHandler = async () => {
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
export const mcpCommand = {
    name: 'mcp',
    description: 'Start the Sylphx Flow MCP server for persistent agent coordination',
    options: [],
    handler: mcpHandler
};
