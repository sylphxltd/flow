import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  external: [
    '@sylphx/code-core',
    'commander',
    'chalk',
    'boxen',
    'gradient-string',
    'ora',
    'inquirer',
    '@lancedb/lancedb',
    '@huggingface/transformers',
    '@libsql/client',
    'drizzle-orm',
  ],
  noExternal: [],
});
