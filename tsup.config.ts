import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'index.ts'
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'node18',
  external: [
    '@modelcontextprotocol/sdk',
    '@opencode-ai/plugin',
    'cli-progress',
    'cli-table3',
    'commander',
    'zod'
  ]
})