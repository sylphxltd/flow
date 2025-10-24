/**
 * Configuration modules barrel export
 * Centralized access to configuration-related functionality
 */

// Target configurations
export * from './targets.js';

// MCP server configurations
export * from './servers.js';

// Rules configuration
export * from './rules.js';

// Re-export commonly used configuration functions with better naming
export {
  getTargetDefaults,
  configureTargetDefaults,
  validateTargetConfiguration,
} from './targets.js';

export {
  getServerConfigurations,
  configureServer,
  validateServerConfiguration,
} from './servers.js';

export {
  loadRuleConfiguration,
  validateRuleConfiguration,
  getDefaultRules,
} from './rules.js';
