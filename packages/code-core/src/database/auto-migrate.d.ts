/**
 * Auto Migration System
 * Automatically migrates from file-based to database on first app start
 *
 * Design:
 * 1. Check if database has sessions table
 * 2. If not → Run migrations automatically
 * 3. Check if JSON files exist but not in database
 * 4. If yes → Auto-migrate files to database
 * 5. Completely transparent to user
 */
export interface MigrationProgress {
    total: number;
    current: number;
    status: string;
}
export type ProgressCallback = (progress: MigrationProgress) => void;
/**
 * Auto-migrate on app startup
 * Returns database instance ready to use
 *
 * Design: Always run schema migrations (Drizzle handles detection)
 * 1. Run Drizzle migrate() - automatically applies only new migrations
 * 2. Check and migrate JSON files if needed
 */
export declare function autoMigrate(onProgress?: ProgressCallback): Promise<any>;
/**
 * Initialize database with auto-migration
 * Call this on app startup
 */
export declare function initializeDatabase(onProgress?: ProgressCallback): Promise<any>;
//# sourceMappingURL=auto-migrate.d.ts.map