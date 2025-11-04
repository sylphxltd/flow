import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Config } from 'drizzle-kit';

const DB_PATH = join(homedir(), '.sylphx-code', 'code.db');

export default {
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || `file:${DB_PATH}`,
  },
  verbose: true,
  strict: true,
} satisfies Config;
