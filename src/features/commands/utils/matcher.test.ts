/**
 * Tests for command matcher
 */

import { describe, it, expect } from 'vitest';
import type { Command } from '../../../ui/commands/types.js';
import {
  findCommand,
  filterCommands,
  matchCommands,
  hasArgs,
  getArg,
} from './matcher.js';

const mockCommands: Command[] = [
  {
    id: 'help',
    label: '/help',
    description: 'Show all available commands',
    execute: async () => {},
  },
  {
    id: 'model',
    label: '/model',
    description: 'Select AI model',
    args: [
      { name: 'model', description: 'Model name', required: true },
    ],
    execute: async () => {},
  },
  {
    id: 'provider',
    label: '/provider',
    description: 'Manage AI providers',
    args: [
      { name: 'provider', description: 'Provider name', required: false },
    ],
    execute: async () => {},
  },
  {
    id: 'clear',
    label: '/clear',
    description: 'Clear chat history',
    execute: async () => {},
  },
];

describe('findCommand', () => {
  it('should find command by exact name', () => {
    const result = findCommand(mockCommands, '/help');
    expect(result).toBeDefined();
    expect(result?.id).toBe('help');
  });

  it('should return undefined for non-existent command', () => {
    const result = findCommand(mockCommands, '/nonexistent');
    expect(result).toBeUndefined();
  });

  it('should find command with args', () => {
    const result = findCommand(mockCommands, '/model');
    expect(result).toBeDefined();
    expect(result?.id).toBe('model');
    expect(result?.args).toHaveLength(1);
  });

  it('should be case-sensitive', () => {
    const result = findCommand(mockCommands, '/HELP');
    expect(result).toBeUndefined();
  });
});

describe('filterCommands', () => {
  it('should filter by label', () => {
    const results = filterCommands(mockCommands, 'help');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('help');
  });

  it('should filter by description', () => {
    const results = filterCommands(mockCommands, 'providers');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('provider');
  });

  it('should be case-insensitive', () => {
    const results = filterCommands(mockCommands, 'HELP');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('help');
  });

  it('should return multiple matches', () => {
    const results = filterCommands(mockCommands, 'a'); // "clear" and "Manage" contain 'a'
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return empty array for no matches', () => {
    const results = filterCommands(mockCommands, 'zzzzz');
    expect(results).toHaveLength(0);
  });

  it('should return all commands for empty query', () => {
    const results = filterCommands(mockCommands, '');
    expect(results).toHaveLength(mockCommands.length);
  });
});

describe('matchCommands', () => {
  it('should match commands with leading /', () => {
    const results = matchCommands(mockCommands, '/hel');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('help');
  });

  it('should match commands without leading /', () => {
    const results = matchCommands(mockCommands, 'hel');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('help');
  });

  it('should return all commands for /', () => {
    const results = matchCommands(mockCommands, '/');
    expect(results).toHaveLength(mockCommands.length);
  });

  it('should return empty array for no matches', () => {
    const results = matchCommands(mockCommands, '/zzz');
    expect(results).toHaveLength(0);
  });
});

describe('hasArgs', () => {
  it('should return true for command with args', () => {
    const command = findCommand(mockCommands, '/model')!;
    expect(hasArgs(command)).toBe(true);
  });

  it('should return false for command without args', () => {
    const command = findCommand(mockCommands, '/help')!;
    expect(hasArgs(command)).toBe(false);
  });

  it('should return false for command with empty args array', () => {
    const command: Command = {
      id: 'test',
      label: '/test',
      description: 'Test',
      args: [],
      execute: async () => {},
    };
    expect(hasArgs(command)).toBe(false);
  });
});

describe('getArg', () => {
  it('should return arg at index', () => {
    const command = findCommand(mockCommands, '/model')!;
    const arg = getArg(command, 0);
    expect(arg).toBeDefined();
    expect(arg?.name).toBe('model');
  });

  it('should return undefined for out of bounds index', () => {
    const command = findCommand(mockCommands, '/model')!;
    expect(getArg(command, 1)).toBeUndefined();
    expect(getArg(command, -1)).toBeUndefined();
  });

  it('should return undefined for command without args', () => {
    const command = findCommand(mockCommands, '/help')!;
    expect(getArg(command, 0)).toBeUndefined();
  });

  it('should return correct arg for multi-arg command', () => {
    const command: Command = {
      id: 'test',
      label: '/test',
      description: 'Test',
      args: [
        { name: 'first', description: 'First arg', required: true },
        { name: 'second', description: 'Second arg', required: false },
      ],
      execute: async () => {},
    };
    expect(getArg(command, 0)?.name).toBe('first');
    expect(getArg(command, 1)?.name).toBe('second');
    expect(getArg(command, 2)).toBeUndefined();
  });
});
