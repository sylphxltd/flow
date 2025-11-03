import type { Config } from 'drizzle-kit';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DB_PATH = join(homedir(), '.sylphx-flow', 'memory.db');

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || `file:${DB_PATH}`,
  },
  verbose: true,
  strict: true,
} satisfies Config;
