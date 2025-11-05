/**
 * Database Utilities
 * Re-exports for convenience
 *
 * NOTE: No global state - use AppContext in code-server for singleton management
 */

export { SessionRepository } from './session-repository.js';
export { initializeDatabase } from './auto-migrate.js';
