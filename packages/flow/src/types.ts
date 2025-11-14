/**
 * Centralized type exports
 * This file re-exports types from domain-specific modules for backward compatibility
 *
 * MIGRATION GUIDE:
 * Instead of importing from this file, prefer importing from specific type modules:
 * - './types/cli.types.js' for CLI-related types
 * - './types/mcp.types.js' for MCP configuration types
 * - './types/target.types.js' for Target system types
 * - './types/common.types.js' for shared types
 */

// Re-export all types for backward compatibility
export type {
  CommandHandler,
  CommandOptions,
  CommandConfig,
  RunCommandOptions,
} from './types/cli.types.js';
export type {
  CommonOptions,
  Resolvable,
  SetupResult,
} from './types/common.types.js';
export type {
  MCPServerConfig,
  MCPServerConfigHTTP,
  MCPServerConfigUnion,
  OpenCodeConfig,
} from './types/mcp.types.js';
export {
  isCLICommandConfig,
  isHttpConfig,
  isStdioConfig,
} from './types/mcp.types.js';
export type {
  Target,
  TargetConfig,
} from './types/target.types.js';
