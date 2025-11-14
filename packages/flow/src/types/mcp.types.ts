/**
 * MCP (Model Context Protocol) Configuration Types
 * Defines configuration formats for different MCP server implementations
 */

/**
 * Base MCP server configuration with stdio transport
 */
export type MCPServerConfig = {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

/**
 * MCP server configuration with HTTP transport
 */
export type MCPServerConfigHTTP = {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
};

/**
 * Union of all possible MCP server configurations
 */
export type MCPServerConfigUnion = MCPServerConfig | MCPServerConfigHTTP;

/**
 * OpenCode-specific configuration format
 */
export type OpenCodeConfig = {
  type: 'local' | 'remote';
  command?: string[];
  url?: string;
  headers?: Record<string, string>;
  environment?: Record<string, string>;
};

/**
 * Type guard for stdio config
 */
export function isStdioConfig(config: MCPServerConfigUnion): config is MCPServerConfig {
  return config.type === 'stdio';
}

/**
 * Type guard for HTTP config
 */
export function isHttpConfig(config: MCPServerConfigUnion): config is MCPServerConfigHTTP {
  return config.type === 'http';
}

/**
 * Type guard for CLI command config (stdio)
 */
export function isCLICommandConfig(config: MCPServerConfigUnion): config is MCPServerConfig {
  return isStdioConfig(config);
}
