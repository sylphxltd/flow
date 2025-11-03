import { describe, it, expect } from 'vitest';
import {
  validateRunOptions,
  selectTarget,
  filterExecutableTargets,
  buildSystemPrompt,
  buildUserPrompt,
  buildExecutionPlan,
} from './execution-planning.js';
import { isSuccess, isFailure } from '../../../core/functional/result.js';
import { isSome, isNone } from '../../../core/functional/option.js';

describe('validateRunOptions', () => {
  it('should accept valid options', () => {
    const result = validateRunOptions({ target: 'claude', verbose: true });

    expect(isSuccess(result)).toBe(true);
  });

  it('should reject invalid target type', () => {
    const result = validateRunOptions({ target: 123 as any });

    expect(isFailure(result)).toBe(true);
  });
});

describe('selectTarget', () => {
  it('should return specified target', () => {
    const result = selectTarget('claude', ['claude', 'openai']);

    expect(isSome(result)).toBe(true);
    if (isSome(result)) {
      expect(result.value).toBe('claude');
    }
  });

  it('should return none when no target specified', () => {
    const result = selectTarget(undefined, ['claude', 'openai']);

    expect(isNone(result)).toBe(true);
  });
});

describe('filterExecutableTargets', () => {
  it('should filter only implemented targets with executeCommand', () => {
    const targets = [
      { id: 'claude', isImplemented: true, executeCommand: () => {} },
      { id: 'openai', isImplemented: true, executeCommand: () => {} },
      { id: 'anthropic', isImplemented: false, executeCommand: () => {} },
      { id: 'google', isImplemented: true },
    ];

    const result = filterExecutableTargets(targets);

    expect(result).toEqual(['claude', 'openai']);
  });
});

describe('buildSystemPrompt', () => {
  it('should return instructions without additional context', () => {
    const result = buildSystemPrompt('You are a coder');

    expect(result).toBe('You are a coder');
  });

  it('should append additional context', () => {
    const result = buildSystemPrompt('You are a coder', 'Use TypeScript');

    expect(result).toBe('You are a coder\n\nUse TypeScript');
  });
});

describe('buildUserPrompt', () => {
  it('should return prompt without context', () => {
    const result = buildUserPrompt('Write a function');

    expect(result).toBe('Write a function');
  });

  it('should prepend context', () => {
    const result = buildUserPrompt('Write a function', 'Project uses React');

    expect(result).toBe('Context: Project uses React\n\nWrite a function');
  });
});

describe('buildExecutionPlan', () => {
  it('should build complete execution plan', () => {
    const agentContent = `---
name: Coder
---

You are a helpful coder`;

    const plan = buildExecutionPlan(
      'claude',
      'coder',
      '/path/to/coder.md',
      agentContent,
      'Write tests',
      { verbose: true }
    );

    expect(plan.targetId).toBe('claude');
    expect(plan.agentName).toBe('coder');
    expect(plan.agentPath).toBe('/path/to/coder.md');
    expect(plan.systemPrompt).toContain('helpful coder');
    expect(plan.userPrompt).toBe('Write tests');
    expect(plan.options.verbose).toBe(true);
  });
});
