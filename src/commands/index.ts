/**
 * Command modules barrel export
 * Centralized access to CLI command functionality
 */

export { default as benchmarkCommand } from './benchmark-command';
// Re-export commonly used command functions
export {
  analyzeCodebase,
  default as codebaseCommand,
  indexCodebase,
  searchCodebase,
} from './codebase-command';
export { default as hookCommand } from './hook-command';
export {
  default as initCommand,
  initializeProject,
  setupProject,
  validateProject,
} from './init-command';
export {
  default as knowledgeCommand,
  manageKnowledge,
  searchKnowledge,
  updateKnowledge,
} from './knowledge-command';
export {
  configureMCP,
  default as mcpCommand,
  installMCPServers,
  listMCPServers,
} from './mcp-command';
export { default as runCommand, executeFlow, processRequest, runWorkflow } from './run-command';
