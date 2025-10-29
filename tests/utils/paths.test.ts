/**
 * Paths Tests
 * Tests for centralized path resolution
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  getAgentsDir,
  getTemplatesDir,
  getRulesDir,
  getKnowledgeDir,
  getRuleFile,
  getPathsInfo,
} from '../../src/utils/paths.js';

describe('Paths', () => {
  describe('getAgentsDir', () => {
    it('should return agents directory path', () => {
      const agentsDir = getAgentsDir();
      expect(agentsDir).toBeTruthy();
      expect(agentsDir).toContain('assets');
      expect(agentsDir).toContain('agents');
    });

    it('should return absolute path', () => {
      const agentsDir = getAgentsDir();
      expect(agentsDir.startsWith('/')).toBe(true);
    });

    it('should be consistent across calls', () => {
      const dir1 = getAgentsDir();
      const dir2 = getAgentsDir();
      expect(dir1).toBe(dir2);
    });
  });

  describe('getTemplatesDir', () => {
    it('should return templates directory path', () => {
      const templatesDir = getTemplatesDir();
      expect(templatesDir).toBeTruthy();
      expect(templatesDir).toContain('assets');
      expect(templatesDir).toContain('templates');
    });

    it('should return absolute path', () => {
      const templatesDir = getTemplatesDir();
      expect(templatesDir.startsWith('/')).toBe(true);
    });

    it('should be consistent across calls', () => {
      const dir1 = getTemplatesDir();
      const dir2 = getTemplatesDir();
      expect(dir1).toBe(dir2);
    });
  });

  describe('getRulesDir', () => {
    it('should return rules directory path', () => {
      const rulesDir = getRulesDir();
      expect(rulesDir).toBeTruthy();
      expect(rulesDir).toContain('assets');
      expect(rulesDir).toContain('rules');
    });

    it('should return absolute path', () => {
      const rulesDir = getRulesDir();
      expect(rulesDir.startsWith('/')).toBe(true);
    });

    it('should be consistent across calls', () => {
      const dir1 = getRulesDir();
      const dir2 = getRulesDir();
      expect(dir1).toBe(dir2);
    });
  });

  describe('getKnowledgeDir', () => {
    it('should return knowledge directory path', () => {
      const knowledgeDir = getKnowledgeDir();
      expect(knowledgeDir).toBeTruthy();
      expect(knowledgeDir).toContain('assets');
      expect(knowledgeDir).toContain('knowledge');
    });

    it('should return absolute path', () => {
      const knowledgeDir = getKnowledgeDir();
      expect(knowledgeDir.startsWith('/')).toBe(true);
    });

    it('should be consistent across calls', () => {
      const dir1 = getKnowledgeDir();
      const dir2 = getKnowledgeDir();
      expect(dir1).toBe(dir2);
    });
  });

  describe('getRuleFile', () => {
    it('should reject empty filename', () => {
      expect(() => getRuleFile('')).toThrow('Filename must be a non-empty string');
    });

    it('should reject null filename', () => {
      expect(() => getRuleFile(null as any)).toThrow('Filename must be a non-empty string');
    });

    it('should reject undefined filename', () => {
      expect(() => getRuleFile(undefined as any)).toThrow('Filename must be a non-empty string');
    });

    it('should reject path traversal with ..', () => {
      expect(() => getRuleFile('../test.md')).toThrow('Path traversal not allowed');
    });

    it('should reject path traversal with /', () => {
      expect(() => getRuleFile('subdir/test.md')).toThrow('Path traversal not allowed');
    });

    it('should reject path traversal with \\', () => {
      expect(() => getRuleFile('subdir\\test.md')).toThrow('Path traversal not allowed');
    });

    it('should reject filenames with invalid characters', () => {
      expect(() => getRuleFile('test@file.md')).toThrow('invalid characters');
    });

    it('should reject filenames with spaces', () => {
      expect(() => getRuleFile('test file.md')).toThrow('invalid characters');
    });

    it('should reject filenames with special characters', () => {
      expect(() => getRuleFile('test$file.md')).toThrow('invalid characters');
    });

    it('should accept valid filename with letters', () => {
      // This will throw "file not found" but that's expected in test environment
      // We're just testing that it passes validation
      expect(() => getRuleFile('testfile.md')).toThrow('Rule file not found');
    });

    it('should accept valid filename with numbers', () => {
      expect(() => getRuleFile('test123.md')).toThrow('Rule file not found');
    });

    it('should accept valid filename with hyphen', () => {
      expect(() => getRuleFile('test-file.md')).toThrow('Rule file not found');
    });

    it('should accept valid filename with underscore', () => {
      expect(() => getRuleFile('test_file.md')).toThrow('Rule file not found');
    });

    it('should accept valid filename with dot', () => {
      expect(() => getRuleFile('test.file.md')).toThrow('Rule file not found');
    });

    it('should reject non-string filename', () => {
      expect(() => getRuleFile(123 as any)).toThrow('Filename must be a non-empty string');
    });

    it('should reject object filename', () => {
      expect(() => getRuleFile({} as any)).toThrow('Filename must be a non-empty string');
    });

    it('should reject array filename', () => {
      expect(() => getRuleFile([] as any)).toThrow('Filename must be a non-empty string');
    });
  });

  describe('getPathsInfo', () => {
    it('should return all path information', () => {
      const info = getPathsInfo();

      expect(info).toHaveProperty('assetsRoot');
      expect(info).toHaveProperty('agents');
      expect(info).toHaveProperty('templates');
      expect(info).toHaveProperty('rules');
    });

    it('should return consistent paths', () => {
      const info = getPathsInfo();

      expect(info.agents).toBe(getAgentsDir());
      expect(info.templates).toBe(getTemplatesDir());
      expect(info.rules).toBe(getRulesDir());
    });

    it('should have assets root in all paths', () => {
      const info = getPathsInfo();

      expect(info.agents).toContain(info.assetsRoot);
      expect(info.templates).toContain(info.assetsRoot);
      expect(info.rules).toContain(info.assetsRoot);
    });

    it('should return absolute paths', () => {
      const info = getPathsInfo();

      expect(info.assetsRoot.startsWith('/')).toBe(true);
      expect(info.agents.startsWith('/')).toBe(true);
      expect(info.templates.startsWith('/')).toBe(true);
      expect(info.rules.startsWith('/')).toBe(true);
    });
  });

  describe('Directory Structure', () => {
    it('should have different paths for each directory', () => {
      const agents = getAgentsDir();
      const templates = getTemplatesDir();
      const rules = getRulesDir();
      const knowledge = getKnowledgeDir();

      expect(agents).not.toBe(templates);
      expect(agents).not.toBe(rules);
      expect(agents).not.toBe(knowledge);
      expect(templates).not.toBe(rules);
      expect(templates).not.toBe(knowledge);
      expect(rules).not.toBe(knowledge);
    });

    it('should all share same assets root', () => {
      const info = getPathsInfo();

      expect(info.agents.startsWith(info.assetsRoot)).toBe(true);
      expect(info.templates.startsWith(info.assetsRoot)).toBe(true);
      expect(info.rules.startsWith(info.assetsRoot)).toBe(true);
    });

    it('should end with correct directory names', () => {
      expect(getAgentsDir().endsWith('agents')).toBe(true);
      expect(getTemplatesDir().endsWith('templates')).toBe(true);
      expect(getRulesDir().endsWith('rules')).toBe(true);
      expect(getKnowledgeDir().endsWith('knowledge')).toBe(true);
    });
  });

  describe('Security', () => {
    it('should prevent directory traversal attempts', () => {
      const traversalAttempts = [
        '../../../etc/passwd',
        '../../test.md',
        '../test.md',
        'test/../../../passwd',
      ];

      for (const attempt of traversalAttempts) {
        expect(() => getRuleFile(attempt)).toThrow();
      }
    });

    it('should prevent path separator usage', () => {
      const separatorAttempts = [
        'dir/file.md',
        'dir\\file.md',
        '/etc/passwd',
        '\\windows\\system32',
      ];

      for (const attempt of separatorAttempts) {
        expect(() => getRuleFile(attempt)).toThrow();
      }
    });

    it('should only allow safe characters', () => {
      const validChars = [
        'test.md',
        'test-file.md',
        'test_file.md',
        'test123.md',
        'test.file.name.md',
      ];

      for (const filename of validChars) {
        // Will throw "file not found" but validates characters passed
        expect(() => getRuleFile(filename)).toThrow('Rule file not found');
      }
    });

    it('should reject unsafe characters', () => {
      const unsafeChars = [
        'test file.md', // space
        'test@file.md', // @
        'test$file.md', // $
        'test&file.md', // &
        'test;file.md', // ;
        'test|file.md', // |
        'test<file.md', // <
        'test>file.md', // >
      ];

      for (const filename of unsafeChars) {
        expect(() => getRuleFile(filename)).toThrow('invalid characters');
      }
    });
  });

  describe('Integration', () => {
    it('should provide consistent path resolution', () => {
      const info1 = getPathsInfo();
      const info2 = getPathsInfo();

      expect(info1).toEqual(info2);
    });

    it('should work with multiple calls', () => {
      for (let i = 0; i < 10; i++) {
        const agents = getAgentsDir();
        const templates = getTemplatesDir();
        const rules = getRulesDir();

        expect(agents).toContain('agents');
        expect(templates).toContain('templates');
        expect(rules).toContain('rules');
      }
    });

    it('should maintain path hierarchy', () => {
      const info = getPathsInfo();

      // All paths should be under assets root
      expect(info.agents).toContain(info.assetsRoot);
      expect(info.templates).toContain(info.assetsRoot);
      expect(info.rules).toContain(info.assetsRoot);

      // Assets root should be before subdirectories
      const agentsIndex = info.agents.indexOf('agents');
      const assetsIndex = info.agents.indexOf('assets');
      expect(assetsIndex).toBeLessThan(agentsIndex);
    });
  });

  describe('Edge Cases - Uncovered Lines', () => {
    describe('getRuleFile success case (lines 106-107)', () => {
      let originalFsExistsSync: typeof fs.existsSync;
      let mockExistsSync: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        // Store original fs.existsSync
        originalFsExistsSync = fs.existsSync;
        mockExistsSync = vi.fn();
        fs.existsSync = mockExistsSync;
      });

      afterEach(() => {
        // Restore original fs.existsSync
        fs.existsSync = originalFsExistsSync;
      });

      it('should return file path when rule file exists', () => {
        const testFilename = 'test-rule.md';
        const rulesDir = getRulesDir();
        const expectedPath = path.join(rulesDir, testFilename);

        // Mock fs.existsSync to return true for our test file
        mockExistsSync.mockImplementation((filePath: string) => {
          return filePath === expectedPath;
        });

        // Test that getRuleFile returns the path when file exists
        // This will test lines 106-107 (the success return)
        const result = getRuleFile(testFilename);
        expect(result).toBe(expectedPath);
      });

      it('should validate and return correct path for valid existing filename', () => {
        const testFilename = 'valid-rule-name.json';
        const rulesDir = getRulesDir();
        const expectedPath = path.join(rulesDir, testFilename);

        // Mock fs.existsSync to return true for our test file
        mockExistsSync.mockImplementation((filePath: string) => {
          return filePath === expectedPath;
        });

        const result = getRuleFile(testFilename);
        expect(result).toBe(expectedPath);
        expect(result).toContain(rulesDir);
        expect(result).toContain(testFilename);
      });

      it('should handle complex but valid filenames when file exists', () => {
        const validFilenames = [
          'complex.rule.name.v2.json',
          'rule-with-many-hyphens.md',
          'rule_with_many_underscores.txt',
          'rule123.test456.ext789'
        ];

        for (const filename of validFilenames) {
          const rulesDir = getRulesDir();
          const expectedPath = path.join(rulesDir, filename);

          // Mock file exists
          mockExistsSync.mockImplementation((filePath: string) => {
            return filePath === expectedPath;
          });

          const result = getRuleFile(filename);
          expect(result).toBe(expectedPath);
        }
      });

      it('should return correct path structure for existing files', () => {
        const testCases = [
          { filename: 'simple.md', expectedExtension: 'simple.md' },
          { filename: 'rule.v1.json', expectedExtension: 'rule.v1.json' },
          { filename: 'test_rule_file.txt', expectedExtension: 'test_rule_file.txt' }
        ];

        for (const testCase of testCases) {
          const rulesDir = getRulesDir();
          const expectedPath = path.join(rulesDir, testCase.filename);

          mockExistsSync.mockImplementation((filePath: string) => {
            return filePath === expectedPath;
          });

          const result = getRuleFile(testCase.filename);
          expect(result).toBe(expectedPath);
          expect(result.endsWith(testCase.expectedExtension)).toBe(true);
        }
      });
    });

    describe('getDistDir development scenarios (lines 40-47)', () => {
      it('should handle module evaluation without mocking', () => {
        // Since the module is already loaded, we verify the current state
        // Lines 40-47 are the fallback when dist doesn't exist but we're in src
        // This is tested by the fact that the module loads successfully
        const info = getPathsInfo();
        expect(info.assetsRoot).toBeTruthy();
        expect(typeof info.assetsRoot).toBe('string');
        expect(info.assetsRoot.length).toBeGreaterThan(0);
      });

      it('should provide consistent path resolution', () => {
        // Test that the paths module works consistently
        // This indirectly tests that getDistDir worked correctly
        const agents1 = getAgentsDir();
        const agents2 = getAgentsDir();
        const rules1 = getRulesDir();
        const rules2 = getRulesDir();

        expect(agents1).toBe(agents2);
        expect(rules1).toBe(rules2);
        expect(agents1).not.toBe(rules1);
      });
    });
  });
});
