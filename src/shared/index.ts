/**
 * Shared utilities and types barrel export
 * Provides clean access to all shared functionality
 */

// Types
export type {
  ProcessResult,
  CommonOptions,
  AgentConfig,
  AgentConfigs,
} from './types/index.js';

// Logging
export { log } from './logging/index.js';

// Agent configuration
export {
  getSupportedAgents,
  getAgentConfig,
  promptForAgent,
  detectAgentTool,
} from './agents/index.js';

// File operations
export {
  collectFiles,
  getLocalFileInfo,
  clearObsoleteFiles,
} from './files/index.js';

// Processing utilities
export {
  processBatch,
  displayResults,
} from './processing/index.js';
