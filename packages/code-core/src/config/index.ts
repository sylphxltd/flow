/**
 * Configuration modules barrel export
 * Centralized access to configuration-related functionality
 */

// Rules configuration
export * from './rules.js';
export {
  getDefaultRules,
  loadRuleConfiguration,
  validateRuleConfiguration,
} from './rules.js';
// MCP server configurations
export * from './servers.js';
export {
  configureServer,
  getServerConfigurations,
  validateServerConfiguration,
} from './servers.js';
// Target configurations
export * from './targets.js';
// Re-export commonly used configuration functions with better naming
export {
  configureTargetDefaults,
  getTargetDefaults,
  validateTargetConfiguration,
} from './targets.js';
