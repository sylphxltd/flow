/**
 * Tests for command hint generator
 */

import { describe, it, expect } from 'vitest';
import type { Command } from '../../../ui/commands/types.js';
import { generateHint } from './hint.js';

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
    id: 'multi',
    label: '/multi',
    description: 'Command with multiple args',
    args: [
      { name: 'first', description: 'First arg', required: true },
      { name: 'second', description: 'Second arg', required: false },
      { name: 'third', description: 'Third arg', required: true },
    ],
    execute: async () => {},
  },
];

describe('generateHint', () => {
  it('should return undefined for non-command', () => {
    expect(generateHint(mockCommands, 'hello')).toBeUndefined();
    expect(generateHint(mockCommands, '')).toBeUndefined();
  });

  it('should return undefined for command without args', () => {
    expect(generateHint(mockCommands, '/help')).toBeUndefined();
  });

  it('should return undefined for non-existent command', () => {
    expect(generateHint(mockCommands, '/nonexistent')).toBeUndefined();
  });

  it('should return hint for required arg', () => {
    const hint = generateHint(mockCommands, '/model ');
    expect(hint).toBe('[model]');
  });

  it('should return hint for optional arg', () => {
    const hint = generateHint(mockCommands, '/provider ');
    expect(hint).toBe('<provider>');
  });

  it('should return undefined when arg is provided', () => {
    expect(generateHint(mockCommands, '/model gpt-4')).toBeUndefined();
    expect(generateHint(mockCommands, '/provider openrouter')).toBeUndefined();
  });

  it('should return hint for second arg', () => {
    const hint = generateHint(mockCommands, '/multi first ');
    expect(hint).toBe('<second>');
  });

  it('should return hint for third arg', () => {
    const hint = generateHint(mockCommands, '/multi first second ');
    expect(hint).toBe('[third]');
  });

  it('should return undefined when all args provided', () => {
    expect(generateHint(mockCommands, '/multi first second third')).toBeUndefined();
  });

  it('should handle partial arg input', () => {
    // Still on first arg, so no hint (arg not complete)
    expect(generateHint(mockCommands, '/model g')).toBeUndefined();
    expect(generateHint(mockCommands, '/model gpt')).toBeUndefined();
  });

  it('should handle multiple spaces', () => {
    const hint = generateHint(mockCommands, '/model  ');
    expect(hint).toBe('[model]');
  });

  it('should return correct hint for partially filled multi-arg command', () => {
    expect(generateHint(mockCommands, '/multi ')).toBe('[first]');
    expect(generateHint(mockCommands, '/multi foo')).toBeUndefined(); // Still on first arg
    expect(generateHint(mockCommands, '/multi foo ')).toBe('<second>');
    expect(generateHint(mockCommands, '/multi foo bar')).toBeUndefined(); // Still on second arg
    expect(generateHint(mockCommands, '/multi foo bar ')).toBe('[third]');
  });
});
