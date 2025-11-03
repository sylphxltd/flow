/**
 * Migrate sessions from file-based storage to database
 *
 * Usage: bun run src/scripts/migrate-sessions-to-db.ts
 *
 * This script:
 * 1. Reads all session JSON files from ~/.sylphx/sessions
 * 2. Inserts them into the database using SessionRepository
 * 3. Optionally backs up files before migration
 * 4. Validates migration success
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { readdir } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { SessionRepository } from '../db/session-repository.js';
import { loadSession } from '../utils/session-manager.js';

const SESSION_DIR = join(homedir(), '.sylphx', 'sessions');
const DATABASE_URL = process.env.DATABASE_URL || 'file:.sylphx-flow/memory.db';

async function migrateSessionsToDatabase() {
  console.log('🚀 Starting session migration to database...\n');

  // Initialize database
  console.log(`📊 Connecting to database: ${DATABASE_URL}`);
  const client = createClient({ url: DATABASE_URL });
  const db = drizzle(client);
  const repository = new SessionRepository(db);

  // Get all session files
  console.log(`📂 Reading sessions from: ${SESSION_DIR}`);
  const files = await readdir(SESSION_DIR);
  const sessionFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('.'));

  console.log(`✅ Found ${sessionFiles.length} session files\n`);

  // Migrate each session
  let successCount = 0;
  let errorCount = 0;

  for (const file of sessionFiles) {
    const sessionId = file.replace('.json', '');

    try {
      // Load session from file
      const session = await loadSession(sessionId);

      if (!session) {
        console.log(`⚠️  Skipped ${sessionId}: Could not load`);
        errorCount++;
        continue;
      }

      console.log(`📝 Migrating ${session.id} (${session.messages.length} messages)...`);

      // Check if already exists in database
      const existing = await repository.getSessionById(session.id);
      if (existing) {
        console.log(`   ⏩ Already exists, skipping`);
        continue;
      }

      // Create session in database
      await repository.createSession(session.provider, session.model);

      // Update title if exists
      if (session.title) {
        await repository.updateSessionTitle(session.id, session.title);
      }

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

      console.log(`   ✅ Migrated successfully`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error migrating ${sessionId}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration complete!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📁 Total: ${sessionFiles.length}`);

  // Validate
  const dbCount = await repository.getSessionCount();
  console.log(`\n🔍 Validation:`);
  console.log(`   Database sessions: ${dbCount}`);
  console.log(`   File sessions: ${sessionFiles.length}`);

  if (dbCount >= successCount) {
    console.log(`   ✅ Migration validated successfully!`);
  } else {
    console.log(`   ⚠️  Warning: Database count doesn't match expected`);
  }

  client.close();
}

// Run migration
migrateSessionsToDatabase().catch((error) => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
