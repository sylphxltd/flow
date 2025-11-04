/**
 * Database Singleton
 * Global database instance and repository access
 */
import { join } from 'node:path';
import { homedir } from 'node:os';
import { SessionRepository } from './session-repository.js';
import { initializeDatabase } from './auto-migrate.js';
const DB_PATH = join(homedir(), '.sylphx-code', 'code.db');
const DATABASE_URL = process.env.DATABASE_URL || `file:${DB_PATH}`;
// Global database instance
let dbInstance = null;
let repositoryInstance = null;
let initPromise = null;
/**
 * Get database instance (lazy initialization with auto-migration)
 * Ensures database is initialized only once
 */
export async function getDatabase() {
    if (dbInstance) {
        return dbInstance;
    }
    // If initialization in progress, wait for it
    if (initPromise) {
        return initPromise;
    }
    // Start initialization
    initPromise = initializeDatabase((progress) => {
        if (process.env.DEBUG) {
            console.log(`[DB] ${progress.current}/${progress.total}: ${progress.status}`);
        }
    });
    dbInstance = await initPromise;
    initPromise = null;
    return dbInstance;
}
/**
 * Get session repository instance
 * Ensures repository uses initialized database
 */
export async function getSessionRepository() {
    if (repositoryInstance) {
        return repositoryInstance;
    }
    const db = await getDatabase();
    repositoryInstance = new SessionRepository(db);
    return repositoryInstance;
}
/**
 * Reset database instance (for testing)
 */
export function resetDatabase() {
    dbInstance = null;
    repositoryInstance = null;
    initPromise = null;
}
//# sourceMappingURL=database.js.map