/**
 * MCP (Model Context Protocol) configuration types
 * Types for configuring and managing MCP servers
 */

import type { Resolvable } from './common.types.js';

/**
 * MCP server configuration for stdio-based servers
 * Communicates via standard input/output
 */
export interface MCPServerConfig {
  type: 'stdio';
  command: Resolvable<string>;
  args?: Resolvable<string[]>;
  env?: Record<string, string>;
}

/**
 * MCP server configuration for HTTP-based servers
 * Communicates via HTTP requests
 */
export interface MCPServerConfigHTTP {
  type: 'http';
  url: Resolvable<string>;
  headers?: Record<string, string>;
}

/**
 * Union of all possible MCP server configurations
 */
export type MCPServerConfigUnion = MCPServerConfig | MCPServerConfigHTTP;

/**
 * MCP server configuration flags
 * Used to disable specific server features per target
 */
export type MCPServerConfigFlags = {
  disableTime?: boolean;
  disableKnowledge?: boolean;
  disableCodebase?: boolean;
};

/**
 * OpenCode-specific configuration format
 */
export interface OpenCodeConfig {
  $schema?: string;
  mcp?: Record<string, MCPServerConfigUnion>;
}

/**
 * Type guard: Check if config is stdio-based
 */
export const isStdioConfig = (config: MCPServerConfigUnion): config is MCPServerConfig =>
  config.type === 'stdio';

/**
 * Type guard: Check if config is HTTP-based
 */
export const isHttpConfig = (config: MCPServerConfigUnion): config is MCPServerConfigHTTP =>
  config.type === 'http';

/**
 * Type guard: Check if config is CLI command-based (stdio)
 * Alias for isStdioConfig for backward compatibility
 */
export const isCLICommandConfig = (config: MCPServerConfigUnion): config is MCPServerConfig =>
  isStdioConfig(config);
