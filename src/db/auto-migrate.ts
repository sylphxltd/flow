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

import { join } from 'node:path';
import { homedir } from 'node:os';
import { readdir, mkdir, readFile as fsReadFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { sql } from 'drizzle-orm';
import { SessionRepository } from './session-repository.js';
import { loadSession } from '../utils/session-manager.js';
import { findPackageRoot } from '../utils/paths.js';

const SESSION_DIR = join(homedir(), '.sylphx', 'sessions');
const DB_DIR = join(homedir(), '.sylphx-flow');
const DB_PATH = join(DB_DIR, 'memory.db');
const MIGRATION_FLAG = join(DB_DIR, '.session-migrated');

export interface MigrationProgress {
  total: number;
  current: number;
  status: string;
}

export type ProgressCallback = (progress: MigrationProgress) => void;

/**
 * Check if JSON session files need migration to database
 * Returns true if there are JSON files that need to be migrated
 *
 * Note: Schema migrations are handled automatically by Drizzle's migrate()
 * We only need to check for JSON file migration here
 */
async function needsFileMigration(db: any): Promise<boolean> {
  try {
    // Check if migration flag exists
    if (existsSync(MIGRATION_FLAG)) {
      return false; // Already migrated JSON files
    }

    // Check if JSON files exist that need migration
    try {
      const files = await readdir(SESSION_DIR);
      const sessionFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('.'));

      if (sessionFiles.length === 0) {
        return false; // No files to migrate
      }

      // Check if any files not in database
      const repository = new SessionRepository(db);
      const dbCount = await repository.getSessionCount();

      // If database is empty but files exist, need migration
      return dbCount === 0 && sessionFiles.length > 0;
    } catch {
      return false; // Session directory doesn't exist
    }
  } catch {
    return false;
  }
}

/**
 * Run database schema migrations
 */
async function runSchemaMigrations(db: any): Promise<void> {
  // Ensure database directory exists
  await mkdir(DB_DIR, { recursive: true });

  // Run Drizzle migrations using package root to find migrations
  // This works with npm global install
  const packageRoot = findPackageRoot('drizzle migrations');
  const migrationsPath = join(packageRoot, 'drizzle');

  if (!existsSync(migrationsPath)) {
    throw new Error(`Drizzle migrations not found at ${migrationsPath}`);
  }

  await migrate(db, { migrationsFolder: migrationsPath });
}

/**
 * Migrate session files to database
 */
async function migrateSessionFiles(
  db: any,
  onProgress?: ProgressCallback
): Promise<{ success: number; errors: number }> {
  const repository = new SessionRepository(db);

  // Get all session files
  const files = await readdir(SESSION_DIR);
  const sessionFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('.'));

  let successCount = 0;
  let errorCount = 0;

  onProgress?.({
    total: sessionFiles.length,
    current: 0,
    status: `Found ${sessionFiles.length} sessions to migrate`,
  });

  for (let i = 0; i < sessionFiles.length; i++) {
    const file = sessionFiles[i];
    const sessionId = file.replace('.json', '');

    try {
      onProgress?.({
        total: sessionFiles.length,
        current: i + 1,
        status: `Migrating session ${i + 1}/${sessionFiles.length}`,
      });

      // Load session from file
      const session = await loadSession(sessionId);

      if (!session) {
        errorCount++;
        continue;
      }

      // Check if already exists
      const existing = await repository.getSessionById(session.id);
      if (existing) {
        continue; // Skip duplicates
      }

      // Create session in database with existing ID and metadata
      await repository.createSessionFromData({
        id: session.id,
        provider: session.provider,
        model: session.model,
        title: session.title,
        nextTodoId: session.nextTodoId || 1,
        created: session.created,
        updated: session.updated,
      });

      // Add all messages
      for (const message of session.messages) {
        await repository.addMessage(
          session.id,
          message.role,
          message.content,
          message.attachments,
          message.usage,
          message.finishReason,
          message.metadata,
          message.todoSnapshot
        );
      }

      // Update todos
      if (session.todos && session.todos.length > 0) {
        await repository.updateTodos(session.id, session.todos, session.nextTodoId);
      }

      successCount++;
    } catch (error) {
      console.error(`Error migrating ${sessionId}:`, error);
      errorCount++;
    }
  }

  // Create migration flag
  await fsReadFile(MIGRATION_FLAG, 'utf8').catch(() =>
    require('fs').writeFileSync(MIGRATION_FLAG, new Date().toISOString())
  );

  return { success: successCount, errors: errorCount };
}

/**
 * Auto-migrate on app startup
 * Returns database instance ready to use
 *
 * Design: Always run schema migrations (Drizzle handles detection)
 * 1. Run Drizzle migrate() - automatically applies only new migrations
 * 2. Check and migrate JSON files if needed
 */
export async function autoMigrate(onProgress?: ProgressCallback): Promise<any> {
  const DATABASE_URL = process.env.DATABASE_URL || `file:${DB_PATH}`;

  // Initialize database with optimized settings for concurrency
  const client = createClient({ url: DATABASE_URL });
  const db = drizzle(client);

  // Configure SQLite for better concurrency
  // WAL mode allows concurrent reads while writing
  // Busy timeout retries when database is locked (5 seconds)
  await client.execute('PRAGMA journal_mode = WAL');
  await client.execute('PRAGMA busy_timeout = 5000');
  await client.execute('PRAGMA synchronous = NORMAL');

  onProgress?.({
    total: 2,
    current: 0,
    status: 'Running database migrations...',
  });

  // Always run schema migrations
  // Drizzle's migrate() automatically detects and applies only new migrations
  await runSchemaMigrations(db);

  onProgress?.({
    total: 2,
    current: 1,
    status: 'Database schema up to date',
  });

  // Check if JSON file migration needed
  const needsFiles = await needsFileMigration(db);

  if (needsFiles) {
    try {
      const files = await readdir(SESSION_DIR);
      const sessionFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('.'));

      if (sessionFiles.length > 0) {
        onProgress?.({
          total: 2 + sessionFiles.length,
          current: 1,
          status: `Migrating ${sessionFiles.length} sessions from files...`,
        });

        // Migrate files to database
        const result = await migrateSessionFiles(db, (fileProgress) => {
          onProgress?.({
            total: 2 + fileProgress.total,
            current: 1 + fileProgress.current,
            status: fileProgress.status,
          });
        });

        onProgress?.({
          total: 2 + sessionFiles.length,
          current: 2 + sessionFiles.length,
          status: `Migration complete! ${result.success} sessions migrated`,
        });
      }
    } catch {
      // No session directory, skip file migration
    }
  }

  return db;
}

/**
 * Initialize database with auto-migration
 * Call this on app startup
 */
export async function initializeDatabase(onProgress?: ProgressCallback): Promise<any> {
  return autoMigrate(onProgress);
}
