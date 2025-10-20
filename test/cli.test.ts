import * as Cli from '@effect/cli/Cli';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCLI } from '../src/cli.js';

describe('Root CLI Program', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse arguments and show help for no command', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'sylphx-flow.js', ''];

    try {
      await runCLI();

      // Should call console.log for help
      expect(consoleLogSpy).toHaveBeenCalled();
      const calls = consoleLogSpy.mock.calls;
      const helpOutput = calls.join('\\n');
      expect(helpOutput).toContain('Sylphx Flow - Type-safe development flow CLI');
      expect(helpOutput).toContain('Commands:');
    } catch (error) {
      expect(error).toBeUndefined(); // Should not throw
    } finally {
      process.argv = originalArgv;
    }
  });

  it('should show version when --version is provided', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'sylphx-flow.js', '--version'];

    try {
      await runCLI();

      expect(consoleLogSpy).toHaveBeenCalledWith('1.0.0');
    } catch (error) {
      expect(error).toBeUndefined();
    } finally {
      process.argv = originalArgv;
    }
  });

  it('should handle help command', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'sylphx-flow.js', '--help'];

    try {
      await runCLI();

      expect(consoleLogSpy).toHaveBeenCalled();
      const helpOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(helpOutput).toContain('Sylphx Flow - Type-safe development flow CLI');
    } catch (error) {
      expect(error).toBeUndefined();
    } finally {
      process.argv = originalArgv;
    }
  });
});
