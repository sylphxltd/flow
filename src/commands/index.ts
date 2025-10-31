/**
 * Command modules barrel export
 * Centralized access to CLI command functionality
 */

export { default as benchmarkCommand } from './benchmark-command';
export { default as codebaseCommand } from './codebase-command';
export { default as hookCommand } from './hook-command';
export { default as initCommand } from './init-command';
export { default as knowledgeCommand } from './knowledge-command';
export { default as mcpCommand } from './mcp-command';
export { default as runCommand } from './run-command';

// Re-export commonly used command functions
export {
  indexCodebase,
  searchCodebase,
  analyzeCodebase,
} from './codebase-command';

export {
  initializeProject,
  setupProject,
  validateProject,
} from './init-command';

export {
  manageKnowledge,
  searchKnowledge,
  updateKnowledge,
} from './knowledge-command';

export {
  configureMCP,
  installMCPServers,
  listMCPServers,
} from './mcp-command';

export {
  runWorkflow,
  executeFlow,
  processRequest,
} from './run-command';
