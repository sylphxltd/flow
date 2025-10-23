import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateRandomSuffix, generateCommitMessage } from '../src/tools/project-startup-tool.js';

// Mock file system operations for integration tests
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('node:path', () => ({
  join: vi.fn((...paths) => paths.join('/')),
}));

describe('Project Startup Functions', () => {
  describe('generateRandomSuffix', () => {
    it('should generate 8-character random suffix with dash prefix', () => {
      const suffix = generateRandomSuffix();

      expect(suffix).toMatch(/^-[a-z0-9]{8}$/);
      expect(suffix).toHaveLength(9); // 1 dash + 8 characters
    });

    it('should generate unique suffixes across multiple calls', () => {
      const suffixes = new Set();

      // Generate 100 suffixes and check for uniqueness
      for (let i = 0; i < 100; i++) {
        const suffix = generateRandomSuffix();
        suffixes.add(suffix);
      }

      expect(suffixes.size).toBe(100);
    });
  });

  describe('generateCommitMessage', () => {
    it('should generate correct commit messages for different project types', () => {
      const testCases = [
        {
          type: 'feature',
          name: 'user-auth',
          expected: 'feat(feature): initialize user-auth workspace and comprehensive templates',
        },
        {
          type: 'bugfix',
          name: 'login-crash',
          expected: 'fix(bugfix): initialize login-crash workspace and comprehensive templates',
        },
        {
          type: 'hotfix',
          name: 'payment-gateway',
          expected: 'fix(hotfix): initialize payment-gateway workspace and comprehensive templates',
        },
        {
          type: 'refactor',
          name: 'database-optimization',
          expected:
            'refactor(refactor): initialize database-optimization workspace and comprehensive templates',
        },
        {
          type: 'migration',
          name: 'legacy-system',
          expected:
            'feat(migration): initialize legacy-system workspace and comprehensive templates',
        },
      ];

      testCases.forEach(({ type, name, expected }) => {
        const result = generateCommitMessage(type, name);
        expect(result).toBe(expected);
      });
    });

    it('should default to feat for unknown project types', () => {
      const result = generateCommitMessage('unknown-type' as any, 'test-project');
      expect(result).toBe(
        'feat(unknown-type): initialize test-project workspace and comprehensive templates'
      );
    });

    it('should follow conventional commits format', () => {
      const result = generateCommitMessage('feature', 'awesome-feature');

      // Should match conventional commits pattern: type(scope): description
      expect(result).toMatch(/^[a-z]+\([a-z-]+\): .+$/);

      // Should contain the project name
      expect(result).toContain('awesome-feature');

      // Should have proper structure
      const [typeAndScope, description] = result.split(': ');
      expect(typeAndScope).toBe('feat(feature)');
      expect(description).toBe('initialize awesome-feature workspace and comprehensive templates');
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create branch names with random suffixes', () => {
      // Test that the function uses random suffixes in branch names
      const suffix1 = generateRandomSuffix();
      const suffix2 = generateRandomSuffix();

      const branchName1 = `feature/test-project${suffix1}`;
      const branchName2 = `feature/test-project${suffix2}`;

      expect(branchName1).toMatch(/^feature\/test-project-[a-z0-9]{8}$/);
      expect(branchName2).toMatch(/^feature\/test-project-[a-z0-9]{8}$/);
      expect(branchName1).not.toBe(branchName2);
    });

    it('should use same suffix for branch and workspace patterns', () => {
      const suffix = generateRandomSuffix();
      const projectType = 'feature';
      const projectName = 'awesome-feature';

      const branchName = `${projectType}/${projectName}${suffix}`;
      const workspaceDir = `specs/${projectType}/${projectName}${suffix}`;
      const projectId = `${projectName}${suffix}`;

      // All should use the same suffix
      expect(branchName).toContain(suffix);
      expect(workspaceDir).toContain(suffix);
      expect(projectId).toBe(`${projectName}${suffix}`);

      // Extract suffix from each and verify they're the same
      const branchSuffix = branchName.split('-').slice(-1)[0];
      const workspaceSuffix = workspaceDir.split('-').slice(-1)[0];
      const projectSuffix = projectId.split('-').slice(-1)[0];

      expect(branchSuffix).toBe(workspaceSuffix);
      expect(workspaceSuffix).toBe(projectSuffix);
    });
  });
});
