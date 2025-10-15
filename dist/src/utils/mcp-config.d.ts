/**
 * MCP server configurations
 */
export declare const MCP_SERVERS: {
    readonly memory: {
        readonly name: "rules_memory";
        readonly description: "Rules memory MCP server for agent coordination";
        readonly config: {
            readonly type: "local";
            readonly command: string[];
        };
    };
    readonly everything: {
        readonly name: "mcp_everything";
        readonly description: "MCP Everything server - comprehensive tool collection";
        readonly config: {
            readonly type: "local";
            readonly command: string[];
        };
    };
};
export type MCPServerType = keyof typeof MCP_SERVERS;
/**
 * Add MCP servers to the opencode.jsonc configuration
 */
export declare function addMCPServers(cwd: string, serverTypes: MCPServerType[]): Promise<void>;
/**
 * Remove MCP servers from the opencode.jsonc configuration
 */
export declare function removeMCPServers(cwd: string, serverTypes: MCPServerType[]): Promise<void>;
/**
 * List currently configured MCP servers
 */
export declare function listMCPServers(cwd: string): Promise<void>;
/**
 * Parse MCP server types from command line arguments
 */
export declare function parseMCPServerTypes(args: string[]): MCPServerType[];
