import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Disabled until workspace packages have proper type exports
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'ink',
    '@sylphx/code-core',
    '@sylphx/code-client',
    '@sylphx/code-server',
  ],
});
