import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/headless.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  external: [
    '@sylphx/code-core',
    'commander',
    'chalk',
    'ora',
    'inquirer',
  ],
});
