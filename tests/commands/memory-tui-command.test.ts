/**
 * Memory TUI Command Tests
 * Tests for the memory TUI CLI command
 */

import { describe, expect, it, vi } from 'vitest';

// Mock the TUI handler
vi.mock('../../src/utils/memory-tui.js', () => {
  return {
    handleMemoryTui: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock target manager
vi.mock('../../src/core/target-manager.js', () => {
  return {
    targetManager: {
      getImplementedTargets: vi.fn().mockReturnValue(['claude-code', 'opencode']),
    },
  };
});

// Dynamic import after all mocks are defined
const { handleMemoryTuiCommand, memoryTuiCommand } = await import(
  '../../src/commands/memory-tui-command.js'
);

describe('Memory TUI Command', () => {
  describe('Command Configuration', () => {
    it('should have correct name', () => {
      expect(memoryTuiCommand.name).toBe('memory-tui');
    });

    it('should have description', () => {
      expect(memoryTuiCommand.description).toBeTruthy();
      expect(memoryTuiCommand.description).toContain('memory management');
    });

    it('should have handler function', () => {
      expect(memoryTuiCommand.handler).toBeDefined();
      expect(typeof memoryTuiCommand.handler).toBe('function');
    });

    it('should have options array', () => {
      expect(memoryTuiCommand.options).toBeDefined();
      expect(Array.isArray(memoryTuiCommand.options)).toBe(true);
    });
  });

  describe('Command Options', () => {
    it('should have target option', () => {
      const targetOption = memoryTuiCommand.options?.find((opt) => opt.flags.includes('--target'));
      expect(targetOption).toBeDefined();
    });

    it('should have target description', () => {
      const targetOption = memoryTuiCommand.options?.find((opt) => opt.flags.includes('--target'));
      expect(targetOption?.description).toBeTruthy();
      expect(targetOption?.description).toContain('Target platform');
    });

    it('should include implemented targets in description', () => {
      const targetOption = memoryTuiCommand.options?.find((opt) => opt.flags.includes('--target'));
      expect(targetOption?.description).toContain('claude-code');
      expect(targetOption?.description).toContain('opencode');
    });

    it('should have exactly one option', () => {
      expect(memoryTuiCommand.options?.length).toBe(1);
    });
  });

  describe('Handler Function', () => {
    it('should be async function', () => {
      expect(handleMemoryTuiCommand.constructor.name).toBe('AsyncFunction');
    });

    it('should call handleMemoryTui when invoked', async () => {
      const { handleMemoryTui } = await import('../../src/utils/memory-tui.js');
      await handleMemoryTuiCommand();
      expect(handleMemoryTui).toHaveBeenCalled();
    });

    it('should not throw errors', async () => {
      await expect(handleMemoryTuiCommand()).resolves.toBeUndefined();
    });

    it('should return undefined', async () => {
      const result = await handleMemoryTuiCommand();
      expect(result).toBeUndefined();
    });
  });

  describe('Command Structure', () => {
    it('should export named exports', () => {
      expect(memoryTuiCommand).toBeDefined();
      expect(handleMemoryTuiCommand).toBeDefined();
    });

    it('should have valid CommandConfig structure', () => {
      expect(memoryTuiCommand).toHaveProperty('name');
      expect(memoryTuiCommand).toHaveProperty('description');
      expect(memoryTuiCommand).toHaveProperty('options');
      expect(memoryTuiCommand).toHaveProperty('handler');
    });

    it('should have correct option structure', () => {
      const option = memoryTuiCommand.options?.[0];
      expect(option).toHaveProperty('flags');
      expect(option).toHaveProperty('description');
    });
  });

  describe('Integration', () => {
    it('should be importable', async () => {
      const module = await import('../../src/commands/memory-tui-command.js');
      expect(module.memoryTuiCommand).toBeDefined();
      expect(module.handleMemoryTuiCommand).toBeDefined();
    });

    it('should have correct types', () => {
      expect(typeof memoryTuiCommand.name).toBe('string');
      expect(typeof memoryTuiCommand.description).toBe('string');
      expect(typeof memoryTuiCommand.handler).toBe('function');
      expect(Array.isArray(memoryTuiCommand.options)).toBe(true);
    });

    it('should match CommandConfig interface', () => {
      // Verify all required properties exist
      expect(memoryTuiCommand).toHaveProperty('name');
      expect(memoryTuiCommand).toHaveProperty('description');
      expect(memoryTuiCommand).toHaveProperty('handler');

      // Verify types
      expect(typeof memoryTuiCommand.name).toBe('string');
      expect(typeof memoryTuiCommand.description).toBe('string');
      expect(typeof memoryTuiCommand.handler).toBe('function');
    });
  });

  describe('Target Manager Integration', () => {
    it('should include targets in option description', () => {
      const targetOption = memoryTuiCommand.options?.find((opt) => opt.flags.includes('--target'));

      // Target manager is called during module initialization
      expect(targetOption?.description).toContain('claude-code');
      expect(targetOption?.description).toContain('opencode');
    });

    it('should format targets list correctly', () => {
      const targetOption = memoryTuiCommand.options?.find((opt) => opt.flags.includes('--target'));

      expect(targetOption?.description).toContain('Target platform');
      expect(targetOption?.description).toMatch(/claude-code.*opencode/);
    });
  });
});
