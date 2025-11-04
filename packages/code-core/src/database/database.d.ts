/**
 * Database Singleton
 * Global database instance and repository access
 */
import { SessionRepository } from './session-repository.js';
/**
 * Get database instance (lazy initialization with auto-migration)
 * Ensures database is initialized only once
 */
export declare function getDatabase(): Promise<any>;
/**
 * Get session repository instance
 * Ensures repository uses initialized database
 */
export declare function getSessionRepository(): Promise<SessionRepository>;
/**
 * Reset database instance (for testing)
 */
export declare function resetDatabase(): void;
//# sourceMappingURL=database.d.ts.map