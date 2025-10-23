import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:.sylphx-flow/memory.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;
