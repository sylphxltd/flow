import { describe, it, expect } from 'vitest';
import {
  buildAgentSearchPaths,
  buildAgentLoadConfig,
  getAgentFileLoadPriority,
  extractAgentInstructions,
  parseYamlFrontMatter,
  parseAgentContent,
  validateAgentName,
} from './agent-loading.js';
import { isSuccess, isFailure } from '../../../core/functional/result.js';

describe('buildAgentSearchPaths', () => {
  it('should build correct search paths', () => {
    const result = buildAgentSearchPaths('coder', '/home/user/project', '/usr/lib/agents');

    expect(result.claudeAgentPath).toBe('/home/user/project/.claude/agents/coder.md');
    expect(result.localAgentPath).toBe('/home/user/project/agents/coder.md');
    expect(result.packageAgentPath).toBe('/usr/lib/agents/coder.md');
  });
});

describe('buildAgentLoadConfig', () => {
  it('should build complete config', () => {
    const config = buildAgentLoadConfig('coder', undefined, '/project', '/package/agents');

    expect(config.agentName).toBe('coder');
    expect(config.agentFilePath).toBeUndefined();
    expect(config.searchPaths.claudeAgentPath).toContain('coder.md');
  });

  it('should include explicit file path if provided', () => {
    const config = buildAgentLoadConfig('coder', '/custom/path.md', '/project', '/package/agents');

    expect(config.agentFilePath).toBe('/custom/path.md');
  });
});

describe('getAgentFileLoadPriority', () => {
  it('should prioritize explicit file path', () => {
    const config = buildAgentLoadConfig('coder', '/explicit.md', '/project', '/package');
    const priority = getAgentFileLoadPriority(config);

    expect(priority[0]).toBe('/explicit.md');
  });

  it('should return paths in correct order without explicit path', () => {
    const config = buildAgentLoadConfig('coder', undefined, '/project', '/package');
    const priority = getAgentFileLoadPriority(config);

    expect(priority[0]).toContain('.claude/agents');
    expect(priority[1]).toContain('agents/coder.md');
    expect(priority[2]).toContain('/package');
  });
});

describe('extractAgentInstructions', () => {
  it('should remove YAML front matter', () => {
    const content = `---
name: Coder
version: 1.0
---

# Agent Instructions
Do this and that`;

    const result = extractAgentInstructions(content);

    expect(result).not.toContain('---');
    expect(result).toContain('# Agent Instructions');
  });

  it('should return content as-is without front matter', () => {
    const content = '# Agent Instructions\nDo this';

    const result = extractAgentInstructions(content);

    expect(result).toBe(content);
  });
});

describe('parseYamlFrontMatter', () => {
  it('should parse YAML front matter correctly', () => {
    const content = `---
name: Coder
version: 1.0
author: Test
---
Content`;

    const metadata = parseYamlFrontMatter(content);

    expect(metadata.name).toBe('Coder');
    expect(metadata.version).toBe('1.0');
    expect(metadata.author).toBe('Test');
  });

  it('should return empty object without front matter', () => {
    const content = 'No front matter';

    const metadata = parseYamlFrontMatter(content);

    expect(Object.keys(metadata)).toHaveLength(0);
  });
});

describe('parseAgentContent', () => {
  it('should parse both metadata and instructions', () => {
    const content = `---
name: Coder
---

# Instructions
Do work`;

    const { metadata, instructions } = parseAgentContent(content);

    expect(metadata.name).toBe('Coder');
    expect(instructions).toContain('# Instructions');
  });
});

describe('validateAgentName', () => {
  it('should accept valid agent names', () => {
    const result = validateAgentName('coder');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe('coder');
    }
  });

  it('should accept names with hyphens and underscores', () => {
    expect(isSuccess(validateAgentName('coder-pro'))).toBe(true);
    expect(isSuccess(validateAgentName('coder_v2'))).toBe(true);
  });

  it('should reject empty names', () => {
    const result = validateAgentName('');

    expect(isFailure(result)).toBe(true);
  });

  it('should reject names with invalid characters', () => {
    expect(isFailure(validateAgentName('coder.md'))).toBe(true);
    expect(isFailure(validateAgentName('coder/agent'))).toBe(true);
    expect(isFailure(validateAgentName('coder agent'))).toBe(true);
  });
});
