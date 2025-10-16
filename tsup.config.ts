import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: true,
  esbuildOptions: (options) => {
    options.jsx = 'automatic';
    options.jsxImportSource = 'react';
  },
});
