/**
 * Run Command Tests
 * Tests for the run CLI command
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { runCommand } from '../../src/commands/run-command.js';

// Mock fs promises
vi.mock('node:fs/promises', () => {
  return {
    default: {
      readFile: vi.fn().mockResolvedValue('# Agent Content\n\nAgent instructions here.'),
    },
  };
});

// Mock paths
vi.mock('../../src/utils/paths.js', () => {
  return {
    getAgentsDir: vi.fn().mockReturnValue('/path/to/agents'),
  };
});

// Mock target manager
vi.mock('../../src/core/target-manager.js', () => {
  return {
    targetManager: {
      getImplementedTargetIDs: vi.fn().mockReturnValue(['claude-code', 'opencode']),
      getImplementedTargets: vi.fn().mockReturnValue(['claude-code', 'opencode']),
      resolveTarget: vi.fn().mockResolvedValue('claude-code'),
      getTarget: vi.fn().mockReturnValue({
        isImplemented: true,
        executeCommand: vi.fn().mockResolvedValue(undefined),
      }),
    },
  };
});

// Mock error handler
vi.mock('../../src/utils/error-handler.js', () => {
  return {
    CLIError: class CLIError extends Error {
      constructor(message: string, code?: string) {
        super(message);
        this.name = 'CLIError';
        this.code = code;
      }
      code?: string;
    },
  };
});

// Suppress console output
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
  vi.clearAllMocks();
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe('Run Command', () => {
  describe('Command Registration', () => {
    it('should register run command', () => {
      expect(runCommand.name()).toBe('run');
    });

    it('should have description', () => {
      expect(runCommand.description()).toBeTruthy();
      expect(runCommand.description()).toContain('Run a prompt');
    });

    it('should mention default agent in description', () => {
      expect(runCommand.description()).toContain('master-craftsman');
    });
  });

  describe('Command Options', () => {
    it('should have target option', () => {
      const targetOption = runCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption).toBeDefined();
    });

    it('should have agent option', () => {
      const agentOption = runCommand.options.find((opt) => opt.long === '--agent');
      expect(agentOption).toBeDefined();
    });

    it('should have agent-file option', () => {
      const agentFileOption = runCommand.options.find((opt) => opt.long === '--agent-file');
      expect(agentFileOption).toBeDefined();
    });

    it('should have verbose option', () => {
      const verboseOption = runCommand.options.find((opt) => opt.long === '--verbose');
      expect(verboseOption).toBeDefined();
    });

    it('should have dry-run option', () => {
      const dryRunOption = runCommand.options.find((opt) => opt.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
    });

    it('should have all 5 options', () => {
      expect(runCommand.options.length).toBe(5);
    });
  });

  describe('Command Arguments', () => {
    it('should have prompt argument', () => {
      expect(runCommand._args.length).toBe(1);
      expect(runCommand._args[0].name()).toBe('prompt');
    });

    it('should have optional prompt', () => {
      expect(runCommand._args[0].required).toBe(false);
    });

    it('should describe prompt argument', () => {
      const promptArg = runCommand._args[0];
      expect(promptArg.description).toBeTruthy();
      expect(promptArg.description).toContain('prompt');
    });

    it('should mention interactive mode in prompt description', () => {
      const promptArg = runCommand._args[0];
      expect(promptArg.description).toContain('interactive');
    });
  });

  describe('Option Descriptions', () => {
    it('should describe target option', () => {
      const targetOption = runCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toBeTruthy();
      expect(targetOption?.description).toContain('Target platform');
    });

    it('should include available targets in target description', () => {
      const targetOption = runCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toContain('claude-code');
      expect(targetOption?.description).toContain('opencode');
    });

    it('should describe agent option', () => {
      const agentOption = runCommand.options.find((opt) => opt.long === '--agent');
      expect(agentOption?.description).toBeTruthy();
      expect(agentOption?.description).toContain('Agent');
    });

    it('should mention default agent in agent description', () => {
      const agentOption = runCommand.options.find((opt) => opt.long === '--agent');
      expect(agentOption?.description).toContain('master-craftsman');
    });

    it('should describe agent-file option', () => {
      const agentFileOption = runCommand.options.find((opt) => opt.long === '--agent-file');
      expect(agentFileOption?.description).toBeTruthy();
      expect(agentFileOption?.description).toContain('file');
    });

    it('should mention override in agent-file description', () => {
      const agentFileOption = runCommand.options.find((opt) => opt.long === '--agent-file');
      expect(agentFileOption?.description).toContain('override');
    });

    it('should describe verbose option', () => {
      const verboseOption = runCommand.options.find((opt) => opt.long === '--verbose');
      expect(verboseOption?.description).toBeTruthy();
      expect(verboseOption?.description).toContain('detailed');
    });

    it('should describe dry-run option', () => {
      const dryRunOption = runCommand.options.find((opt) => opt.long === '--dry-run');
      expect(dryRunOption?.description).toBeTruthy();
      expect(dryRunOption?.description).toContain('would be done');
    });
  });

  describe('Command Structure', () => {
    it('should have action handler', () => {
      expect(runCommand._actionHandler).toBeDefined();
    });

    it('should export as named export', () => {
      expect(runCommand).toBeDefined();
      expect(typeof runCommand).toBe('object');
    });

    it('should have all required properties', () => {
      expect(runCommand).toHaveProperty('name');
      expect(runCommand).toHaveProperty('description');
      expect(runCommand).toHaveProperty('options');
      expect(runCommand).toHaveProperty('_args');
    });
  });

  describe('Option Parameters', () => {
    it('should have target option that accepts value', () => {
      const targetOption = runCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption).toBeDefined();
      expect(targetOption?.description).toBeTruthy();
    });

    it('should have agent option that accepts value', () => {
      const agentOption = runCommand.options.find((opt) => opt.long === '--agent');
      expect(agentOption).toBeDefined();
      expect(agentOption?.description).toBeTruthy();
    });

    it('should have agent-file option that accepts value', () => {
      const agentFileOption = runCommand.options.find((opt) => opt.long === '--agent-file');
      expect(agentFileOption).toBeDefined();
      expect(agentFileOption?.description).toBeTruthy();
    });

    it('should have verbose as boolean flag', () => {
      const verboseOption = runCommand.options.find((opt) => opt.long === '--verbose');
      expect(verboseOption).toBeDefined();
    });

    it('should have dry-run as boolean flag', () => {
      const dryRunOption = runCommand.options.find((opt) => opt.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should be a valid Commander.js command', () => {
      expect(runCommand.name()).toBeTruthy();
      expect(runCommand.description()).toBeTruthy();
      expect(runCommand.options).toBeDefined();
      expect(runCommand._args).toBeDefined();
    });

    it('should be importable', async () => {
      const module = await import('../../src/commands/run-command.js');
      expect(module.runCommand).toBeDefined();
    });

    it('should have correct command name', () => {
      expect(runCommand.name()).toBe('run');
    });

    it('should have option names', () => {
      const optionNames = runCommand.options.map((opt) => opt.long);
      expect(optionNames).toContain('--target');
      expect(optionNames).toContain('--agent');
      expect(optionNames).toContain('--agent-file');
      expect(optionNames).toContain('--verbose');
      expect(optionNames).toContain('--dry-run');
    });
  });

  describe('Command Design', () => {
    it('should support agent customization', () => {
      const hasAgentOption = runCommand.options.some((opt) => opt.long === '--agent');
      const hasAgentFileOption = runCommand.options.some((opt) => opt.long === '--agent-file');
      expect(hasAgentOption || hasAgentFileOption).toBe(true);
    });

    it('should support target selection', () => {
      const hasTargetOption = runCommand.options.some((opt) => opt.long === '--target');
      expect(hasTargetOption).toBe(true);
    });

    it('should support verbose mode', () => {
      const hasVerboseOption = runCommand.options.some((opt) => opt.long === '--verbose');
      expect(hasVerboseOption).toBe(true);
    });

    it('should support dry run', () => {
      const hasDryRunOption = runCommand.options.some((opt) => opt.long === '--dry-run');
      expect(hasDryRunOption).toBe(true);
    });

    it('should allow optional prompt', () => {
      const promptArg = runCommand._args[0];
      expect(promptArg.required).toBe(false);
    });
  });

  describe('Target Manager Integration', () => {
    it('should use target manager for available targets', () => {
      const targetOption = runCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toContain('claude-code');
    });

    it('should mention auto-detect in target description', () => {
      const targetOption = runCommand.options.find((opt) => opt.long === '--target');
      expect(targetOption?.description).toContain('auto-detect');
    });
  });
});
