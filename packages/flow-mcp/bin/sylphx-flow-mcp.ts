#!/usr/bin/env bun
/**
 * Sylphx Flow MCP Server
 * Standalone MCP server for Claude Desktop and other MCP clients
 */

import { startMCPServer } from '../src/index.js';

// Parse command line arguments for configuration
const args = process.argv.slice(2);
const config = {
  disableTime: args.includes('--disable-time'),
  disableKnowledge: args.includes('--disable-knowledge'),
  disableCodebase: args.includes('--disable-codebase'),
};

// Start the MCP server
startMCPServer(config).catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
