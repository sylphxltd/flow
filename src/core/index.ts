/**
 * Core functionality barrel export
 * Centralized access to core system components
 */

export { default as init } from './init';
export { default as targetManager } from './target-manager';

// Re-export commonly used core functions
export {
  initializeProject,
  setupConfiguration,
  validateEnvironment,
} from './init';

export {
  getTarget,
  listTargets,
  registerTarget,
  configureTarget,
} from './target-manager';
