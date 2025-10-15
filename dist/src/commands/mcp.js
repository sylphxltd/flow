import { CLIError } from '../utils/error-handler';
async function startMCPServer() {
    console.log('🔌 Starting MCP server transport...');
    try {
        const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio');
        const server = (await import('../../server')).default;
        const transport = new StdioServerTransport();
        console.log('🔗 Connecting server to transport...');
        await server.connect(transport);
        console.log('✨ MCP server connected and running');
        process.stdin.resume();
    }
    catch (error) {
        throw new CLIError(`Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`, 'MCP_SERVER_ERROR');
    }
}
export const mcpCommand = {
    name: 'mcp',
    description: 'Start the MCP server',
    options: [],
    handler: startMCPServer
};
