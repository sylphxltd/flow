import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  bundle: true,
  // CLI doesn't use JSX, commented out
  // esbuildOptions: (options) => {
  //   options.jsx = 'automatic';
  //   options.jsxImportSource = 'react';
  // },
});
