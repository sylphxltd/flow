/**
 * Help Tests
 * Tests for CLI help display utility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showDefaultHelp } from '../../src/utils/help.js';

describe('Help', () => {
  const originalConsoleLog = console.log;
  let consoleOutput: string[];

  beforeEach(() => {
    consoleOutput = [];
    console.log = vi.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('showDefaultHelp', () => {
    it('should display help title', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('Sylphx Flow CLI'))).toBe(true);
    });

    it('should display available commands section', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('Available commands:'))).toBe(true);
    });

    it('should list init command', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('init'))).toBe(true);
    });

    it('should list mcp command', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('mcp'))).toBe(true);
    });

    it('should list run command', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('run'))).toBe(true);
    });

    it('should list codebase command', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('codebase'))).toBe(true);
    });

    it('should list knowledge command', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('knowledge'))).toBe(true);
    });

    it('should display examples section', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('Examples:'))).toBe(true);
    });

    it('should show init example', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('sylphx-flow init'))).toBe(true);
    });

    it('should show init with target example', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('--target opencode'))).toBe(true);
    });

    it('should show mcp install example', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('mcp install'))).toBe(true);
    });

    it('should show codebase search example', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('codebase search'))).toBe(true);
    });

    it('should show knowledge search example', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('knowledge search'))).toBe(true);
    });

    it('should show help footer', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('sylphx-flow <command> --help'))).toBe(
        true
      );
    });

    it('should include emoji in title', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('🚀'))).toBe(true);
    });

    it('should include separator line', () => {
      showDefaultHelp();
      expect(consoleOutput.some((line) => line.includes('========='))).toBe(true);
    });

    it('should include blank lines for spacing', () => {
      showDefaultHelp();
      expect(consoleOutput.filter((line) => line === '').length).toBeGreaterThan(0);
    });

    it('should call console.log multiple times', () => {
      showDefaultHelp();
      expect(console.log).toHaveBeenCalled();
      expect((console.log as any).mock.calls.length).toBeGreaterThan(10);
    });

    it('should output complete help text', () => {
      showDefaultHelp();
      const fullOutput = consoleOutput.join('\n');

      expect(fullOutput).toContain('Sylphx Flow CLI');
      expect(fullOutput).toContain('Available commands:');
      expect(fullOutput).toContain('Examples:');
      expect(fullOutput).toContain('init');
      expect(fullOutput).toContain('mcp');
      expect(fullOutput).toContain('run');
      expect(fullOutput).toContain('codebase');
      expect(fullOutput).toContain('knowledge');
    });
  });
});
