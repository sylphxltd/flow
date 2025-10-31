/**
 * Tests for target registry functions
 * Validates functional refactoring of TargetRegistry class
 */

import { describe, expect, it } from 'vitest';
import {
  getAllTargetIDs,
  getAllTargets,
  getDefaultTarget,
  getDefaultTargetUnsafe,
  getImplementedTargetIDs,
  getImplementedTargets,
  getTarget,
  getTargetsWithMCPSupport,
  getTargetUnsafe,
  isTargetImplemented,
} from '../../src/config/targets.js';
import { isNone, isSome } from '../../src/core/functional/option.js';

describe('Target Registry (Functional)', () => {
  describe('Target Retrieval', () => {
    it('should get all targets', () => {
      const targets = getAllTargets();

      expect(targets).toBeDefined();
      expect(Array.isArray(targets)).toBe(true);
      expect(targets.length).toBeGreaterThan(0);
    });

    it('should get all target IDs', () => {
      const ids = getAllTargetIDs();

      expect(ids).toBeDefined();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).toContain('opencode');
      expect(ids).toContain('claude-code');
    });

    it('should get implemented targets', () => {
      const targets = getImplementedTargets();

      expect(targets).toBeDefined();
      expect(Array.isArray(targets)).toBe(true);

      // All should be implemented
      for (const target of targets) {
        expect(target.isImplemented).toBe(true);
      }
    });

    it('should get implemented target IDs', () => {
      const ids = getImplementedTargetIDs();

      expect(ids).toBeDefined();
      expect(Array.isArray(ids)).toBe(true);
    });
  });

  describe('Target Lookup (Safe)', () => {
    it('should return Some for existing target', () => {
      const option = getTarget('opencode');

      expect(isSome(option)).toBe(true);
      if (isSome(option)) {
        expect(option.value.id).toBe('opencode');
        expect(option.value.name).toBe('OpenCode');
      }
    });

    it('should return None for non-existent target', () => {
      const option = getTarget('non-existent');

      expect(isNone(option)).toBe(true);
    });

    it('should handle case-sensitive lookup', () => {
      const option1 = getTarget('opencode');
      const option2 = getTarget('OpenCode'); // Wrong case

      expect(isSome(option1)).toBe(true);
      expect(isNone(option2)).toBe(true);
    });
  });

  describe('Target Lookup (Unsafe)', () => {
    it('should return target for existing ID', () => {
      const target = getTargetUnsafe('claude-code');

      expect(target).toBeDefined();
      expect(target.id).toBe('claude-code');
      expect(target.name).toBe('Claude Code');
    });

    it('should throw for non-existent target', () => {
      expect(() => getTargetUnsafe('non-existent')).toThrow('Target not found');
    });
  });

  describe('Default Target', () => {
    it('should get default target as Option', () => {
      const option = getDefaultTarget();

      expect(isSome(option)).toBe(true);
      if (isSome(option)) {
        expect(option.value.isDefault).toBe(true);
      }
    });

    it('should get default target (unsafe)', () => {
      const target = getDefaultTargetUnsafe();

      expect(target).toBeDefined();
      expect(target.isDefault).toBe(true);
    });
  });

  describe('Target Properties', () => {
    it('should check if target is implemented', () => {
      expect(isTargetImplemented('opencode')).toBe(true);
      expect(isTargetImplemented('claude-code')).toBe(true);
      expect(isTargetImplemented('non-existent')).toBe(false);
    });

    it('should get targets with MCP support', () => {
      const targets = getTargetsWithMCPSupport();

      expect(targets).toBeDefined();
      expect(Array.isArray(targets)).toBe(true);

      // Should only include targets with setupMCP method
      const allTargets = getAllTargets();
      for (const target of allTargets) {
        if (target.setupMCP) {
          expect(targets).toContain(target);
        }
      }
    });
  });

  describe('Immutability', () => {
    it('should return readonly arrays', () => {
      const targets = getAllTargets();

      // TypeScript enforces readonly, but we can verify it's frozen
      expect(Object.isFrozen(targets)).toBe(true);
    });

    it('should return same reference on multiple calls (cached)', () => {
      const targets1 = getAllTargets();
      const targets2 = getAllTargets();

      expect(targets1).toBe(targets2); // Same reference = cached
    });
  });

  describe('Target Configuration', () => {
    it('should have required configuration for all targets', () => {
      const targets = getAllTargets();

      for (const target of targets) {
        expect(target.id).toBeDefined();
        expect(target.name).toBeDefined();
        expect(target.description).toBeDefined();
        expect(target.config).toBeDefined();
        expect(target.category).toBeDefined();
        expect(target.category).toMatch(/^(ide|editor|cli)$/);
      }
    });

    it('should have all required methods', () => {
      const targets = getAllTargets();

      for (const target of targets) {
        expect(typeof target.transformAgentContent).toBe('function');
        expect(typeof target.transformMCPConfig).toBe('function');
        expect(typeof target.getConfigPath).toBe('function');
        expect(typeof target.readConfig).toBe('function');
        expect(typeof target.writeConfig).toBe('function');
        expect(typeof target.validateRequirements).toBe('function');
        expect(typeof target.getHelpText).toBe('function');
      }
    });
  });
});
