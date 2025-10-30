/**
 * Rules Config Tests
 * Tests for rules configuration utilities
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CORE_RULES,
  RULES_FILES,
  getAllRuleTypes,
  getRulesPath,
  ruleFileExists,
} from '../../src/config/rules.js';

// Mock getRuleFile from paths
vi.mock('../../src/utils/paths.js', () => ({
  getRuleFile: vi.fn((filename: string) => {
    if (filename === 'core.md') {
      return '/path/to/rules/core.md';
    }
    throw new Error(`Rule file not found: ${filename}`);
  }),
}));

describe('Rules Config', () => {
  describe('CORE_RULES', () => {
    it('should define core rules', () => {
      expect(CORE_RULES).toBeDefined();
      expect(CORE_RULES.core).toBe('core.md');
    });

    it('should be a readonly object', () => {
      expect(Object.isFrozen(CORE_RULES)).toBe(false); // as const doesn't freeze
      expect(CORE_RULES).toHaveProperty('core');
    });

    it('should have core.md as only rule', () => {
      expect(Object.keys(CORE_RULES)).toEqual(['core']);
    });
  });

  describe('RULES_FILES', () => {
    it('should define rules files for targets', () => {
      expect(RULES_FILES).toBeDefined();
      expect(RULES_FILES['claude-code']).toBe('CLAUDE.md');
      expect(RULES_FILES.opencode).toBe('AGENTS.md');
    });

    it('should have claude-code and opencode mappings', () => {
      expect(Object.keys(RULES_FILES)).toEqual(['claude-code', 'opencode']);
    });

    it('should map to markdown files', () => {
      Object.values(RULES_FILES).forEach((filename) => {
        expect(filename.endsWith('.md')).toBe(true);
      });
    });
  });

  describe('getRulesPath', () => {
    it('should return path for core rules', () => {
      const path = getRulesPath('core');
      expect(path).toBe('/path/to/rules/core.md');
    });

    it('should default to core rules when no argument', () => {
      const path = getRulesPath();
      expect(path).toBe('/path/to/rules/core.md');
    });

    it('should throw for invalid rule type', () => {
      expect(() => getRulesPath('invalid' as any)).toThrow();
    });
  });

  describe('getAllRuleTypes', () => {
    it('should return all rule types', () => {
      const types = getAllRuleTypes();
      expect(types).toEqual(['core']);
    });

    it('should return array of strings', () => {
      const types = getAllRuleTypes();
      expect(Array.isArray(types)).toBe(true);
      types.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });

    it('should match CORE_RULES keys', () => {
      const types = getAllRuleTypes();
      const keys = Object.keys(CORE_RULES);
      expect(types).toEqual(keys);
    });

    it('should not be empty', () => {
      const types = getAllRuleTypes();
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe('ruleFileExists', () => {
    it('should return true for existing core rule', () => {
      const exists = ruleFileExists('core');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent rule', () => {
      const exists = ruleFileExists('nonexistent' as any);
      expect(exists).toBe(false);
    });

    it('should catch errors from getRulesPath', () => {
      // Should not throw, just return false
      expect(() => ruleFileExists('invalid' as any)).not.toThrow();
    });

    it('should handle all valid rule types', () => {
      const types = getAllRuleTypes();
      types.forEach((type) => {
        const exists = ruleFileExists(type as keyof typeof CORE_RULES);
        expect(typeof exists).toBe('boolean');
      });
    });
  });

  describe('Integration', () => {
    it('should work together for rule type discovery', () => {
      const types = getAllRuleTypes();
      expect(types).toContain('core');

      types.forEach((type) => {
        const path = getRulesPath(type as keyof typeof CORE_RULES);
        expect(path).toBeDefined();
        expect(typeof path).toBe('string');
      });
    });

    it('should validate rule existence', () => {
      const types = getAllRuleTypes();
      const validTypes = types.filter((type) => ruleFileExists(type as keyof typeof CORE_RULES));

      expect(validTypes.length).toBeGreaterThan(0);
    });

    it('should handle rule path retrieval workflow', () => {
      // Get all types
      const types = getAllRuleTypes();
      expect(types).toBeDefined();

      // Check existence
      const coreExists = ruleFileExists('core');
      expect(coreExists).toBe(true);

      // Get path
      const corePath = getRulesPath('core');
      expect(corePath).toContain('core.md');
    });
  });
});
