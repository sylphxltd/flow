/**
 * Targets Config Tests
 * Tests for target registry and management
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { TargetRegistry } from '../../src/config/targets.js';
import type { Target } from '../../src/types.js';

describe('Targets Config', () => {
  let registry: TargetRegistry;

  const mockTarget1: Target = {
    id: 'test-target-1',
    name: 'Test Target 1',
    description: 'First test target',
    isImplemented: true,
    isDefault: true,
    config: {
      installation: {
        supportedMcpServers: ['server1', 'server2'],
      },
    },
  } as Target;

  const mockTarget2: Target = {
    id: 'test-target-2',
    name: 'Test Target 2',
    description: 'Second test target',
    isImplemented: true,
    isDefault: false,
    config: {
      installation: {
        supportedMcpServers: ['server3'],
      },
    },
  } as Target;

  const mockTarget3: Target = {
    id: 'test-target-3',
    name: 'Test Target 3',
    description: 'Third test target (not implemented)',
    isImplemented: false,
    isDefault: false,
    config: {
      installation: {},
    },
  } as Target;

  beforeEach(() => {
    registry = new TargetRegistry();
  });

  describe('TargetRegistry', () => {
    describe('register', () => {
      it('should register a target', () => {
        registry.register(mockTarget1);
        const targets = registry.getAllTargets();
        expect(targets).toHaveLength(1);
        expect(targets[0]).toBe(mockTarget1);
      });

      it('should register multiple targets', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        registry.register(mockTarget3);
        expect(registry.getAllTargets()).toHaveLength(3);
      });

      it('should preserve target order', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        const targets = registry.getAllTargets();
        expect(targets[0].id).toBe('test-target-1');
        expect(targets[1].id).toBe('test-target-2');
      });
    });

    describe('getAllTargets', () => {
      it('should return empty array when no targets registered', () => {
        expect(registry.getAllTargets()).toEqual([]);
      });

      it('should return all registered targets', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        const targets = registry.getAllTargets();
        expect(targets).toHaveLength(2);
        expect(targets).toContain(mockTarget1);
        expect(targets).toContain(mockTarget2);
      });

      it('should return copy of targets array', () => {
        registry.register(mockTarget1);
        const targets1 = registry.getAllTargets();
        const targets2 = registry.getAllTargets();
        expect(targets1).not.toBe(targets2);
        expect(targets1).toEqual(targets2);
      });
    });

    describe('getImplementedTargets', () => {
      it('should return only implemented targets', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        registry.register(mockTarget3);
        const implemented = registry.getImplementedTargets();
        expect(implemented).toHaveLength(2);
        expect(implemented).toContain(mockTarget1);
        expect(implemented).toContain(mockTarget2);
        expect(implemented).not.toContain(mockTarget3);
      });

      it('should return empty array when no implemented targets', () => {
        registry.register(mockTarget3);
        expect(registry.getImplementedTargets()).toEqual([]);
      });

      it('should handle all implemented targets', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        const implemented = registry.getImplementedTargets();
        expect(implemented).toHaveLength(2);
      });
    });

    describe('getAllTargetIDs', () => {
      it('should return all target IDs', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        const ids = registry.getAllTargetIDs();
        expect(ids).toEqual(['test-target-1', 'test-target-2']);
      });

      it('should return empty array when no targets', () => {
        expect(registry.getAllTargetIDs()).toEqual([]);
      });

      it('should include unimplemented target IDs', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget3);
        const ids = registry.getAllTargetIDs();
        expect(ids).toContain('test-target-1');
        expect(ids).toContain('test-target-3');
      });
    });

    describe('getImplementedTargetIDs', () => {
      it('should return only implemented target IDs', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        registry.register(mockTarget3);
        const ids = registry.getImplementedTargetIDs();
        expect(ids).toEqual(['test-target-1', 'test-target-2']);
      });

      it('should return empty array when no implemented targets', () => {
        registry.register(mockTarget3);
        expect(registry.getImplementedTargetIDs()).toEqual([]);
      });
    });

    describe('getTarget', () => {
      it('should return target by ID', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        const target = registry.getTarget('test-target-1');
        expect(target).toBe(mockTarget1);
      });

      it('should return undefined for unknown ID', () => {
        registry.register(mockTarget1);
        expect(registry.getTarget('unknown')).toBeUndefined();
      });

      it('should handle empty registry', () => {
        expect(registry.getTarget('any-id')).toBeUndefined();
      });

      it('should return correct target from multiple', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        registry.register(mockTarget3);
        const target = registry.getTarget('test-target-2');
        expect(target).toBe(mockTarget2);
      });
    });

    describe('getDefaultTarget', () => {
      it('should return default target', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        const defaultTarget = registry.getDefaultTarget();
        expect(defaultTarget).toBe(mockTarget1);
      });

      it('should throw when no default target', () => {
        registry.register(mockTarget2);
        expect(() => registry.getDefaultTarget()).toThrow('No default target configured');
      });

      it('should throw when registry is empty', () => {
        expect(() => registry.getDefaultTarget()).toThrow('No default target configured');
      });

      it('should return first default when multiple defaults', () => {
        const anotherDefault: Target = {
          ...mockTarget2,
          isDefault: true,
        };
        registry.register(mockTarget1);
        registry.register(anotherDefault);
        const defaultTarget = registry.getDefaultTarget();
        expect(defaultTarget).toBe(mockTarget1);
      });
    });

    describe('getTargetsWithMCPSupport', () => {
      it('should return targets with MCP support', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget2);
        const targets = registry.getTargetsWithMCPSupport();
        expect(targets).toHaveLength(2);
      });

      it('should exclude targets without MCP support', () => {
        registry.register(mockTarget1);
        registry.register(mockTarget3);
        const targets = registry.getTargetsWithMCPSupport();
        expect(targets).toHaveLength(1);
        expect(targets[0]).toBe(mockTarget1);
      });

      it('should only include implemented targets', () => {
        const unimplementedWithMCP: Target = {
          ...mockTarget1,
          id: 'unimplemented-mcp',
          isImplemented: false,
        };
        registry.register(unimplementedWithMCP);
        registry.register(mockTarget1);
        const targets = registry.getTargetsWithMCPSupport();
        expect(targets).toHaveLength(1);
        expect(targets[0].id).toBe('test-target-1');
      });

      it('should return empty array when no MCP targets', () => {
        registry.register(mockTarget3);
        expect(registry.getTargetsWithMCPSupport()).toEqual([]);
      });
    });

    describe('isTargetImplemented', () => {
      it('should return true for implemented target', () => {
        registry.register(mockTarget1);
        expect(registry.isTargetImplemented('test-target-1')).toBe(true);
      });

      it('should return false for unimplemented target', () => {
        registry.register(mockTarget3);
        expect(registry.isTargetImplemented('test-target-3')).toBe(false);
      });

      it('should return false for unknown target', () => {
        registry.register(mockTarget1);
        expect(registry.isTargetImplemented('unknown')).toBe(false);
      });

      it('should handle empty registry', () => {
        expect(registry.isTargetImplemented('any-id')).toBe(false);
      });
    });

    describe('initialize', () => {
      it('should register targets on first call', () => {
        registry.initialize();
        expect(registry.getAllTargets().length).toBeGreaterThan(0);
      });

      it('should not duplicate targets on multiple calls', () => {
        registry.initialize();
        const count1 = registry.getAllTargets().length;
        registry.initialize();
        const count2 = registry.getAllTargets().length;
        expect(count1).toBe(count2);
      });

      it('should register opencode target', () => {
        registry.initialize();
        const target = registry.getTarget('opencode');
        expect(target).toBeDefined();
        expect(target?.id).toBe('opencode');
      });

      it('should register claude-code target', () => {
        registry.initialize();
        const target = registry.getTarget('claude-code');
        expect(target).toBeDefined();
        expect(target?.id).toBe('claude-code');
      });

      it('should set one target as default', () => {
        registry.initialize();
        expect(() => registry.getDefaultTarget()).not.toThrow();
      });
    });
  });

  describe('Convenience Functions', () => {
    beforeEach(async () => {
      // Import fresh module for each test
      await import('../../src/config/targets.js');
    });

    it('should export ALL_TARGETS function', async () => {
      const { ALL_TARGETS } = await import('../../src/config/targets.js');
      const targets = ALL_TARGETS();
      expect(Array.isArray(targets)).toBe(true);
      expect(targets.length).toBeGreaterThan(0);
    });

    it('should export IMPLEMENTED_TARGETS function', async () => {
      const { IMPLEMENTED_TARGETS } = await import('../../src/config/targets.js');
      const targets = IMPLEMENTED_TARGETS();
      expect(Array.isArray(targets)).toBe(true);
      targets.forEach((target) => {
        expect(target.isImplemented).toBe(true);
      });
    });

    it('should export getAllTargetIDs function', async () => {
      const { getAllTargetIDs } = await import('../../src/config/targets.js');
      const ids = getAllTargetIDs();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(0);
    });

    it('should export getImplementedTargetIDs function', async () => {
      const { getImplementedTargetIDs } = await import('../../src/config/targets.js');
      const ids = getImplementedTargetIDs();
      expect(Array.isArray(ids)).toBe(true);
    });

    it('should export getDefaultTarget function', async () => {
      const { getDefaultTarget } = await import('../../src/config/targets.js');
      const defaultId = getDefaultTarget();
      expect(typeof defaultId).toBe('string');
      expect(defaultId.length).toBeGreaterThan(0);
    });

    it('should export getTarget function', async () => {
      const { getTarget, getAllTargetIDs } = await import('../../src/config/targets.js');
      const ids = getAllTargetIDs();
      const target = getTarget(ids[0]);
      expect(target).toBeDefined();
      expect(target?.id).toBe(ids[0]);
    });

    it('should export isTargetImplemented function', async () => {
      const { isTargetImplemented, getImplementedTargetIDs } = await import(
        '../../src/config/targets.js'
      );
      const ids = getImplementedTargetIDs();
      expect(isTargetImplemented(ids[0])).toBe(true);
      expect(isTargetImplemented('unknown-target')).toBe(false);
    });

    it('should export getTargetsWithMCPSupport function', async () => {
      const { getTargetsWithMCPSupport } = await import('../../src/config/targets.js');
      const ids = getTargetsWithMCPSupport();
      expect(Array.isArray(ids)).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should have consistent target data', async () => {
      const {
        ALL_TARGETS,
        IMPLEMENTED_TARGETS,
        getAllTargetIDs,
        getImplementedTargetIDs,
      } = await import('../../src/config/targets.js');

      const allTargets = ALL_TARGETS();
      const implementedTargets = IMPLEMENTED_TARGETS();
      const allIds = getAllTargetIDs();
      const implementedIds = getImplementedTargetIDs();

      expect(allTargets.length).toBe(allIds.length);
      expect(implementedTargets.length).toBe(implementedIds.length);
      expect(implementedTargets.length).toBeLessThanOrEqual(allTargets.length);
    });

    it('should have valid default target', async () => {
      const { getDefaultTarget, getTarget } = await import('../../src/config/targets.js');

      const defaultId = getDefaultTarget();
      const defaultTarget = getTarget(defaultId);

      expect(defaultTarget).toBeDefined();
      expect(defaultTarget?.isDefault).toBe(true);
    });

    it('should handle complete workflow', async () => {
      const {
        getAllTargetIDs,
        getTarget,
        isTargetImplemented,
        IMPLEMENTED_TARGETS,
      } = await import('../../src/config/targets.js');

      const allIds = getAllTargetIDs();
      expect(allIds.length).toBeGreaterThan(0);

      const firstId = allIds[0];
      const target = getTarget(firstId);
      expect(target).toBeDefined();

      const isImplemented = isTargetImplemented(firstId);
      expect(typeof isImplemented).toBe('boolean');

      const implemented = IMPLEMENTED_TARGETS();
      if (isImplemented) {
        expect(implemented.some((t) => t.id === firstId)).toBe(true);
      }
    });
  });
});
