import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Test isolation - run each test file in separate process to prevent mock pollution
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,  // Use multiple processes
      },
    },
    // Mock management to prevent test pollution
    mockReset: false,      // Don't reset module-level mocks
    restoreMocks: false,   // Don't restore mocks to original implementations
    clearMocks: true,      // Clear mock call history between tests
    unstubGlobals: false,  // Keep global stubs
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
});
