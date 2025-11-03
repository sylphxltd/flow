/**
 * Tests for command parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseCommand,
  isCommand,
  getCurrentArgIndex,
  isTypingNewArg,
  getCurrentArg,
} from './parser.js';

describe('parseCommand', () => {
  it('should parse command without args', () => {
    const result = parseCommand('/help');
    expect(result).toEqual({
      commandName: '/help',
      args: [],
      input: '/help',
    });
  });

  it('should parse command with single arg', () => {
    const result = parseCommand('/model gpt-4');
    expect(result).toEqual({
      commandName: '/model',
      args: ['gpt-4'],
      input: '/model gpt-4',
    });
  });

  it('should parse command with multiple args', () => {
    const result = parseCommand('/foo bar baz qux');
    expect(result).toEqual({
      commandName: '/foo',
      args: ['bar', 'baz', 'qux'],
      input: '/foo bar baz qux',
    });
  });

  it('should filter empty args', () => {
    const result = parseCommand('/foo  bar   baz  ');
    expect(result).toEqual({
      commandName: '/foo',
      args: ['bar', 'baz'],
      input: '/foo  bar   baz',
    });
  });

  it('should handle trailing space', () => {
    const result = parseCommand('/foo bar ');
    expect(result).toEqual({
      commandName: '/foo',
      args: ['bar'],
      input: '/foo bar',
    });
  });

  it('should trim input', () => {
    const result = parseCommand('  /help  ');
    expect(result).toEqual({
      commandName: '/help',
      args: [],
      input: '/help',
    });
  });
});

describe('isCommand', () => {
  it('should return true for command', () => {
    expect(isCommand('/help')).toBe(true);
    expect(isCommand('/model gpt-4')).toBe(true);
    expect(isCommand('  /foo  ')).toBe(true);
  });

  it('should return false for non-command', () => {
    expect(isCommand('hello')).toBe(false);
    expect(isCommand('help')).toBe(false);
    expect(isCommand('')).toBe(false);
    expect(isCommand('  ')).toBe(false);
  });
});

describe('getCurrentArgIndex', () => {
  it('should return 0 when typing first arg', () => {
    expect(getCurrentArgIndex('/model ')).toBe(0);
  });

  it('should return 0 when on first arg', () => {
    expect(getCurrentArgIndex('/model gpt')).toBe(0);
    expect(getCurrentArgIndex('/model gpt-4')).toBe(0);
  });

  it('should return 1 when typing second arg', () => {
    expect(getCurrentArgIndex('/model gpt-4 ')).toBe(1);
  });

  it('should return 1 when on second arg', () => {
    expect(getCurrentArgIndex('/model gpt-4 turbo')).toBe(1);
  });

  it('should return 0 for command without args', () => {
    expect(getCurrentArgIndex('/help')).toBe(0);
  });

  it('should handle multiple spaces', () => {
    expect(getCurrentArgIndex('/foo  bar  ')).toBe(1);
  });
});

describe('isTypingNewArg', () => {
  it('should return true when input ends with space', () => {
    expect(isTypingNewArg('/model ')).toBe(true);
    expect(isTypingNewArg('/model gpt-4 ')).toBe(true);
    expect(isTypingNewArg('/foo bar baz ')).toBe(true);
  });

  it('should return false when input does not end with space', () => {
    expect(isTypingNewArg('/model')).toBe(false);
    expect(isTypingNewArg('/model gpt-4')).toBe(false);
    expect(isTypingNewArg('/foo bar baz')).toBe(false);
  });
});

describe('getCurrentArg', () => {
  it('should return current arg being typed', () => {
    expect(getCurrentArg('/model gpt')).toBe('gpt');
    expect(getCurrentArg('/model gpt-4')).toBe('gpt-4');
    expect(getCurrentArg('/foo bar baz')).toBe('baz');
  });

  it('should return empty string when typing new arg', () => {
    expect(getCurrentArg('/model ')).toBe('');
    expect(getCurrentArg('/model gpt-4 ')).toBe('');
  });

  it('should return empty string for command without args', () => {
    expect(getCurrentArg('/help')).toBe('/help');
  });

  it('should handle partial arg', () => {
    expect(getCurrentArg('/model g')).toBe('g');
    expect(getCurrentArg('/foo bar b')).toBe('b');
  });
});
