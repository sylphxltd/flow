/**
 * Tests for command filter with arg autocomplete
 */

import { describe, it, expect } from 'vitest';
import type { Command, SelectOption } from '../../../ui/commands/types.js';
import {
  generateCacheKey,
  getArgAutocomplete,
  filterOptions,
  buildArgSuggestions,
  filterCommandsWithArgs,
} from './filter.js';

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
      {
        name: 'model',
        description: 'Model name',
        required: true,
        loadOptions: async () => [
          { label: 'gpt-4', value: 'gpt-4' },
          { label: 'gpt-3.5', value: 'gpt-3.5' },
          { label: 'claude-3', value: 'claude-3' },
        ],
      },
    ],
    execute: async () => {},
  },
  {
    id: 'provider',
    label: '/provider',
    description: 'Manage AI providers',
    args: [
      {
        name: 'action',
        description: 'Action to perform',
        required: false,
        loadOptions: async () => [
          { label: 'list', value: 'list' },
          { label: 'add', value: 'add' },
          { label: 'remove', value: 'remove' },
        ],
      },
    ],
    execute: async () => {},
  },
];

const mockOptionsCache = new Map<string, SelectOption[]>([
  [
    'model:model:',
    [
      { label: 'gpt-4', value: 'gpt-4' },
      { label: 'gpt-3.5', value: 'gpt-3.5' },
      { label: 'claude-3', value: 'claude-3' },
    ],
  ],
  [
    'provider:action:',
    [
      { label: 'list', value: 'list' },
      { label: 'add', value: 'add' },
      { label: 'remove', value: 'remove' },
    ],
  ],
]);

describe('generateCacheKey', () => {
  it('should generate cache key without args', () => {
    const key = generateCacheKey('model', 'model', []);
    expect(key).toBe('model:model:');
  });

  it('should generate cache key with single arg', () => {
    const key = generateCacheKey('test', 'arg1', ['value1']);
    expect(key).toBe('test:arg1:value1');
  });

  it('should generate cache key with multiple args', () => {
    const key = generateCacheKey('test', 'arg2', ['value1', 'value2']);
    expect(key).toBe('test:arg2:value1,value2');
  });
});

describe('getArgAutocomplete', () => {
  it('should return null for non-command', () => {
    const result = getArgAutocomplete(mockCommands, 'hello', mockOptionsCache);
    expect(result).toBeNull();
  });

  it('should return null for command without args', () => {
    const result = getArgAutocomplete(mockCommands, '/help', mockOptionsCache);
    expect(result).toBeNull();
  });

  it('should return null when not typing args', () => {
    const result = getArgAutocomplete(mockCommands, '/model', mockOptionsCache);
    expect(result).toBeNull();
  });

  it('should return autocomplete for first arg', () => {
    const result = getArgAutocomplete(mockCommands, '/model ', mockOptionsCache);
    expect(result).not.toBeNull();
    expect(result?.options).toHaveLength(3);
    expect(result?.argIndex).toBe(0);
    expect(result?.isTypingNewArg).toBe(true);
    expect(result?.currentArgInput).toBe('');
  });

  it('should return autocomplete when typing arg', () => {
    const result = getArgAutocomplete(mockCommands, '/model gpt', mockOptionsCache);
    expect(result).not.toBeNull();
    expect(result?.options).toHaveLength(3);
    expect(result?.argIndex).toBe(0);
    expect(result?.isTypingNewArg).toBe(false);
    expect(result?.currentArgInput).toBe('gpt');
  });

  it('should return empty options when not in cache', () => {
    const result = getArgAutocomplete(mockCommands, '/provider add ', new Map());
    expect(result).toBeNull(); // No loadOptions for second arg
  });

  it('should return null when arg has no loadOptions', () => {
    const commandWithoutLoadOptions: Command = {
      id: 'test',
      label: '/test',
      description: 'Test',
      args: [
        { name: 'arg', description: 'Arg', required: true },
      ],
      execute: async () => {},
    };
    const result = getArgAutocomplete([commandWithoutLoadOptions], '/test ', mockOptionsCache);
    expect(result).toBeNull();
  });
});

describe('filterOptions', () => {
  const options: SelectOption[] = [
    { label: 'gpt-4', value: 'gpt-4' },
    { label: 'gpt-3.5', value: 'gpt-3.5' },
    { label: 'claude-3', value: 'claude-3' },
  ];

  it('should return all options for empty query', () => {
    const filtered = filterOptions(options, '');
    expect(filtered).toHaveLength(3);
  });

  it('should filter by label', () => {
    const filtered = filterOptions(options, 'gpt');
    expect(filtered).toHaveLength(2);
    expect(filtered[0].label).toBe('gpt-4');
    expect(filtered[1].label).toBe('gpt-3.5');
  });

  it('should filter by value', () => {
    const filtered = filterOptions(options, 'claude');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].label).toBe('claude-3');
  });

  it('should be case-insensitive', () => {
    const filtered = filterOptions(options, 'GPT');
    expect(filtered).toHaveLength(2);
  });

  it('should return empty array for no matches', () => {
    const filtered = filterOptions(options, 'zzz');
    expect(filtered).toHaveLength(0);
  });
});

describe('buildArgSuggestions', () => {
  const command = mockCommands[1]; // /model
  const options: SelectOption[] = [
    { label: 'gpt-4', value: 'gpt-4' },
    { label: 'claude-3', value: 'claude-3' },
  ];

  it('should build suggestions for typing new arg', () => {
    const executeFn = async (allArgs: string[]) => {};
    const suggestions = buildArgSuggestions(
      command,
      options,
      [],
      true,
      'model:model:',
      executeFn
    );

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].label).toBe('/model gpt-4');
    expect(suggestions[1].label).toBe('/model claude-3');
  });

  it('should build suggestions for editing existing arg', () => {
    const executeFn = async (allArgs: string[]) => {};
    const suggestions = buildArgSuggestions(
      command,
      options,
      ['gpt'],
      false,
      'model:model:',
      executeFn
    );

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].label).toBe('/model gpt-4');
    expect(suggestions[1].label).toBe('/model claude-3');
  });

  it('should preserve previous args', () => {
    const multiArgCommand: Command = {
      id: 'test',
      label: '/test',
      description: 'Test',
      args: [
        { name: 'first', description: 'First', required: true },
        { name: 'second', description: 'Second', required: true },
      ],
      execute: async () => {},
    };

    const executeFn = async (allArgs: string[]) => {};
    const suggestions = buildArgSuggestions(
      multiArgCommand,
      options,
      ['foo'],
      true,
      'test:second:foo',
      executeFn
    );

    expect(suggestions[0].label).toBe('/test foo gpt-4');
    expect(suggestions[1].label).toBe('/test foo claude-3');
  });

  it('should use option value if available', () => {
    const optionsWithValue: SelectOption[] = [
      { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    ];

    const executeFn = async (allArgs: string[]) => {};
    const suggestions = buildArgSuggestions(
      command,
      optionsWithValue,
      [],
      true,
      'model:model:',
      executeFn
    );

    expect(suggestions[0].label).toBe('/model gpt-4-turbo');
  });
});

describe('filterCommandsWithArgs', () => {
  it('should return empty array for non-command', () => {
    const executeFn = async () => {};
    const results = filterCommandsWithArgs(mockCommands, 'hello', mockOptionsCache, executeFn);
    expect(results).toHaveLength(0);
  });

  it('should return command matches for command name', () => {
    const executeFn = async () => {};
    const results = filterCommandsWithArgs(mockCommands, '/hel', mockOptionsCache, executeFn);
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('/help');
  });

  it('should return arg suggestions when typing args', () => {
    const executeFn = async () => {};
    const results = filterCommandsWithArgs(mockCommands, '/model ', mockOptionsCache, executeFn);
    expect(results).toHaveLength(3); // 3 model options
    expect(results[0].label).toBe('/model gpt-4');
  });

  it('should filter arg suggestions by current input', () => {
    const executeFn = async () => {};
    const results = filterCommandsWithArgs(mockCommands, '/model gpt', mockOptionsCache, executeFn);
    expect(results).toHaveLength(2); // gpt-4 and gpt-3.5
    expect(results[0].label).toContain('gpt');
  });

  it('should return command matches when no arg autocomplete', () => {
    const executeFn = async () => {};
    const emptyCache = new Map<string, SelectOption[]>();
    const results = filterCommandsWithArgs(mockCommands, '/model ', emptyCache, executeFn);
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('/model');
  });

  it('should handle all commands for /', () => {
    const executeFn = async () => {};
    const results = filterCommandsWithArgs(mockCommands, '/', mockOptionsCache, executeFn);
    expect(results.length).toBeGreaterThanOrEqual(3);
  });
});
