/**
 * Shared utilities and types barrel export
 * Provides clean access to all shared functionality
 */

// Agent configuration
export {
  detectAgentTool,
  getAgentConfig,
  getSupportedAgents,
  promptForAgent,
} from './agents/index.js';
// File operations
export {
  clearObsoleteFiles,
  collectFiles,
  getLocalFileInfo,
} from './files/index.js';
// Logging
export { log } from './logging/index.js';
// Processing utilities
export {
  displayResults,
  processBatch,
} from './processing/index.js';
// Types
export type {
  AgentConfig,
  AgentConfigs,
  CommonOptions,
  ProcessResult,
} from './types/index.js';
