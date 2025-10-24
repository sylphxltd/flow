import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock paths before importing
vi.mock('../src/utils/paths.js', () => ({
  getDistDir: () => '/Users/kyle/rules/dist',
  getAssetsDir: () => '/Users/kyle/rules/dist/assets',
}));

// Mock file system operations for integration tests
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('node:path', () => ({
  default: {
    join: vi.fn((...paths) => paths.join('/')),
  },
}));

import { generateCommitMessage, generateRandomSuffix } from '../src/tools/project-startup-tool.js';

// Skipping these tests due to path mocking issues in test environment
// The functionality is tested manually and works correctly
describe('Project Startup Functions', () => {
  describe('generateRandomSuffix', () => {
    it('should generate 8-character random hex string', () => {
      const suffix = generateRandomSuffix();

      expect(suffix).toMatch(/^[a-z0-9]{8}$/);
      expect(suffix).toHaveLength(8);
    });

    it('should generate different suffixes on multiple calls', () => {
      const suffix1 = generateRandomSuffix();
      const suffix2 = generateRandomSuffix();

      expect(suffix1).not.toBe(suffix2);
    });

    it('should generate unique suffixes over many iterations', () => {
      const suffixes = new Set<string>();

      // Generate 100 suffixes and ensure they're all unique
      for (let i = 0; i < 100; i++) {
        const suffix = generateRandomSuffix();
        suffixes.add(suffix);
      }

      expect(suffixes.size).toBe(100);
    });
  });

  describe('generateCommitMessage', () => {
    it('should generate commit message for project type and name', () => {
      const message = generateCommitMessage('feature', 'test feature');

      expect(message).toBe(
        'feat(feature): initialize test feature workspace and comprehensive templates'
      );
    });

    it('should handle different project types', () => {
      const message1 = generateCommitMessage('bugfix', 'bug fix');
      const message2 = generateCommitMessage('refactor', 'code cleanup');

      expect(message1).toBe(
        'fix(bugfix): initialize bug fix workspace and comprehensive templates'
      );
      expect(message2).toBe(
        'refactor(refactor): initialize code cleanup workspace and comprehensive templates'
      );
    });

    it('should default to feat for unknown project types', () => {
      const message = generateCommitMessage('unknown', 'test project');

      expect(message).toBe(
        'feat(unknown): initialize test project workspace and comprehensive templates'
      );
    });

    it('should generate correct commit messages for different project types', () => {
      const testCases = [
        {
          type: 'feature',
          name: 'auth system',
          expected: 'feat(feature): initialize auth system workspace and comprehensive templates',
        },
        {
          type: 'bugfix',
          name: 'api memory leak',
          expected: 'fix(bugfix): initialize api memory leak workspace and comprehensive templates',
        },
        {
          type: 'hotfix',
          name: 'button styling',
          expected: 'fix(hotfix): initialize button styling workspace and comprehensive templates',
        },
        {
          type: 'refactor',
          name: 'database queries',
          expected:
            'refactor(refactor): initialize database queries workspace and comprehensive templates',
        },
        {
          type: 'migration',
          name: 'data transfer',
          expected:
            'feat(migration): initialize data transfer workspace and comprehensive templates',
        },
      ];

      for (const testCase of testCases) {
        const message = generateCommitMessage(testCase.type, testCase.name);
        expect(message).toBe(testCase.expected);
      }
    });
  });
});
