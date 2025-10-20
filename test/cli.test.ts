import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCLI } from '../src/cli';

describe('CLI Commands E2E', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  const originalArgv = process.argv;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.argv = originalArgv;
  });

  it('shows help for no command', async () => {
    process.argv = ['node', 'sylphx-flow'];

    await runCLI();

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Sylphx Flow - Type-safe development flow CLI');
    expect(output).toContain('Commands:');
  });

  it('shows version with --version', async () => {
    process.argv = ['node', 'sylphx-flow', '--version'];

    await runCLI();

    expect(consoleLogSpy).toHaveBeenCalledWith('sylphx-flow 1.0.0');
  });

  it('handles --help', async () => {
    process.argv = ['node', 'sylphx-flow', '--help'];

    await runCLI();

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Usage: sylphx-flow <command> [options]');
  });

  it('runs init command', async () => {
    process.argv = ['node', 'sylphx-flow', 'init'];

    await runCLI();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Initializing Sylphx Flow project...'));
    expect(consoleLogSpy).toHaveBeenCalledWith('Created opencode.jsonc successfully.');
  });

  it('runs run command', async () => {
    process.argv = ['node', 'sylphx-flow', 'run'];

    await runCLI();

    expect(consoleLogSpy).toHaveBeenCalledWith('Running Sylphx Flow pipeline...');
    expect(consoleLogSpy).toHaveBeenCalledWith('Pipeline completed successfully.');
  });

  it('runs mcp command', async () => {
    process.argv = ['node', 'sylphx-flow', 'mcp'];

    await runCLI();

    expect(consoleLogSpy).toHaveBeenCalledWith('Managing MCP servers...');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Available commands:'));
  });

  it('runs tui command', async () => {
    process.argv = ['node', 'sylphx-flow', 'tui'];

    await runCLI();

    expect(consoleLogSpy).toHaveBeenCalledWith('Launching TUI interface...');
    expect(consoleLogSpy).toHaveBeenCalledWith('Use arrow keys to navigate, enter to select.');
  });

  it('runs memory list (empty)', async () => {
    process.argv = ['node', 'sylphx-flow', 'memory', 'list'];

    await runCLI();

    expect(consoleLogSpy).toHaveBeenCalledWith('No memory entries found.');
  });

  it('runs memory set and get', async () => {
    // Set
    process.argv = ['node', 'sylphx-flow', 'memory', 'set', 'testkey', 'testvalue'];
    await runCLI();
    expect(consoleLogSpy).toHaveBeenCalledWith('Set memory testkey = testvalue');

    // Get
    consoleLogSpy.mockClear();
    process.argv = ['node', 'sylphx-flow', 'memory', 'get', 'testkey'];
    await runCLI();
    expect(consoleLogSpy).toHaveBeenCalledWith('Memory for testkey: testvalue');
  });
});
