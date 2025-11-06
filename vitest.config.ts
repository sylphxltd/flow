import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    testTimeout: 60000, // 60s for integration tests
    hookTimeout: 30000,
    // Test isolation - run each test file in separate process to prevent mock pollution
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // Use multiple processes
      },
    },
    // Mock management to prevent test pollution
    mockReset: false, // Don't reset module-level mocks
    restoreMocks: false, // Don't restore mocks to original implementations
    clearMocks: true, // Clear mock call history between tests
    unstubGlobals: false, // Keep global stubs
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'dist/', 'tests/', '**/*.d.ts', '**/*.config.*', '**/index.ts'],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@sylphx/code-core': path.resolve(__dirname, './packages/code-core/src'),
      '@sylphx/code-server': path.resolve(__dirname, './packages/code-server/src'),
      '@sylphx/code-client': path.resolve(__dirname, './packages/code-client/src'),
    },
  },
});
