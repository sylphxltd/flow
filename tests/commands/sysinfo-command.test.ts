import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sysinfoCommand } from '../../src/commands/sysinfo-command.js';

// Mock the modules we're testing
vi.mock('node:os', () => ({
  default: {
    tmpdir: () => '/tmp',
    totalmem: () => 16000000000, // 16GB
    freemem: () => 8000000000, // 8GB
    cpus: () => [{ model: 'Test CPU', speed: 2400 }],
    uptime: () => 3600, // 1 hour
    platform: () => 'linux',
    arch: () => 'x64',
    hostname: () => 'test-hostname',
    homedir: () => '/home/test',
    userInfo: () => ({ username: 'testuser', uid: 1000 }),
  },
}));

vi.mock('../../src/utils/cli-output.js', () => ({
  cli: {
    error: vi.fn(),
  },
}));

describe('sysinfo-command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined with correct configuration', () => {
    expect(sysinfoCommand).toBeDefined();
    expect(sysinfoCommand.name()).toBe('sysinfo');
    expect(sysinfoCommand.description()).toBe('Display system information and current status');
  });

  it('should have the correct options', () => {
    const options = sysinfoCommand.options;
    const optionNames = options.map((opt: any) => opt.flags);

    expect(optionNames).toContain('--hook <type>');
    expect(optionNames).toContain('--output <type>');
  });

  it('should accept hook option', () => {
    const hookOption = sysinfoCommand.options.find((opt: any) => opt.flags === '--hook <type>');
    expect(hookOption).toBeDefined();
    expect(hookOption.description).toContain('Hook type');
  });

  it('should accept output option', () => {
    const outputOption = sysinfoCommand.options.find((opt: any) => opt.flags === '--output <type>');
    expect(outputOption).toBeDefined();
    expect(outputOption.description).toContain('Output format');
  });
});
