import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCodeTransformer } from '../src/transformers/opencode.js';
import { ClaudeCodeTransformer } from '../src/transformers/claude-code.js';
import type { TargetConfig } from '../src/types.js';

describe('Transformers', () => {
  const opencodeConfig: TargetConfig = {
    agentDir: '.opencode/agent',
    agentExtension: '.md',
    agentFormat: 'yaml-frontmatter',
    stripYaml: false,
    flatten: false,
    configFile: 'opencode.jsonc',
    mcpConfigPath: 'mcp',
    installation: {
      createAgentDir: true,
      createConfigFile: true,
      supportedMcpServers: true,
    },
  };

  const claudeCodeConfig: TargetConfig = {
    agentDir: '.claude/agents',
    agentExtension: '.md',
    agentFormat: 'yaml-frontmatter',
    stripYaml: false,
    flatten: false,
    configFile: '.mcp.json',
    mcpConfigPath: 'mcpServers',
    installation: {
      createAgentDir: true,
      createConfigFile: true,
      supportedMcpServers: true,
    },
  };

  describe('OpenCodeTransformer', () => {
    let transformer: OpenCodeTransformer;

    beforeEach(() => {
      transformer = new OpenCodeTransformer(opencodeConfig);
    });

    it('should remove name field from frontmatter', async () => {
      const content = `---
name: coder
description: Implementation specialist
tools:
  - Read
  - Write
  - Bash
mode: subagent
---

# Code Implementation Agent

This is the agent content.`;

      const result = await transformer.transformAgentContent(content);

      expect(result).not.toContain('name: coder');
      expect(result).toContain('description: Implementation specialist');
      expect(result).toContain('tools:');
      expect(result).toContain('mode: subagent');
      expect(result).toContain('# Code Implementation Agent');
    });

    it('should preserve YAML structure when removing name', async () => {
      const content = `---
name: reviewer
description: Code review specialist
temperature: 0.2
mode: subagent
---

# Review Agent`;

      const result = await transformer.transformAgentContent(content);

      // Verify YAML is well-formed
      const yamlMatch = result.match(/^---\n([\s\S]*?)\n---/);
      expect(yamlMatch).toBeTruthy();

      const yamlContent = yamlMatch![1];
      expect(yamlContent).not.toContain('name:');
      expect(yamlContent).toContain('description: Code review specialist');
      expect(yamlContent).toContain('temperature: 0.2');
      expect(yamlContent).toContain('mode: subagent');
    });

    it('should handle content without name field', async () => {
      const content = `---
description: Test agent
mode: subagent
---

Test content`;

      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('description: Test agent');
      expect(result).toContain('mode: subagent');
      expect(result).toContain('Test content');
    });

    it('should handle content without frontmatter', async () => {
      const content = '# Simple Agent\n\nJust content without frontmatter.';

      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('# Simple Agent');
      expect(result).toContain('Just content without frontmatter.');
    });
  });

  describe('ClaudeCodeTransformer', () => {
    let transformer: ClaudeCodeTransformer;

    beforeEach(() => {
      transformer = new ClaudeCodeTransformer(claudeCodeConfig);
    });

    it('should preserve name field from frontmatter', async () => {
      const content = `---
name: coder
description: Implementation specialist
tools:
  - Read
  - Write
  - Bash
mode: subagent
---

# Code Implementation Agent

This is the agent content.`;

      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('name: coder');
      expect(result).toContain('description: Implementation specialist');
      expect(result).not.toContain('tools:'); // Tools should be omitted
      expect(result).toContain('mode: subagent');
      expect(result).toContain('# Code Implementation Agent');
    });

    it('should omit tools field completely', async () => {
      const content = `---
name: analyst
description: Analysis specialist
tools:
  - Read
  - Grep
  - WebSearch
temperature: 0.1
---

# Analysis Agent`;

      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('name: analyst');
      expect(result).toContain('description: Analysis specialist');
      expect(result).not.toContain('tools:');
      expect(result).toContain('temperature: 0.1');
    });

    it('should set default model to inherit', async () => {
      const content = `---
name: test-agent
description: Test agent
---

Test content`;

      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('name: test-agent');
      expect(result).toContain('model: inherit');
    });

    it('should handle content without name field by extracting from content', async () => {
      const content = `---
description: Code review specialist
---

# Code Reviewer

This is a code review agent.`;

      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('name: code-reviewer'); // Should extract from title
      expect(result).toContain('description: Code review specialist');
    });

    it('should preserve temperature and mode fields', async () => {
      const content = `---
name: custom-agent
description: Custom agent
temperature: 0.3
mode: custom
---

Custom content`;

      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('name: custom-agent');
      expect(result).toContain('temperature: 0.3');
      expect(result).toContain('mode: custom');
    });
  });

  describe('YAML Processing', () => {
    it('should handle complex nested objects in YAML', async () => {
      const content = `---
name: complex-agent
description: Agent with complex config
settings:
  advanced:
    enabled: true
    level: 5
  basic:
    mode: simple
tags:
  - advanced
  - specialized
---

Complex agent content`;

      const opencodeTransformer = new OpenCodeTransformer(opencodeConfig);
      const claudeCodeTransformer = new ClaudeCodeTransformer(claudeCodeConfig);

      const opencodeResult = await opencodeTransformer.transformAgentContent(content);
      const claudeCodeResult = await claudeCodeTransformer.transformAgentContent(content);

      // Both should preserve complex structure
      expect(opencodeResult).toContain('advanced:');
      expect(opencodeResult).toContain('enabled: true');
      expect(opencodeResult).toContain('level: 5');
      expect(opencodeResult).toContain('- advanced');
      expect(opencodeResult).toContain('- specialized');

      expect(claudeCodeResult).toContain('advanced:');
      expect(claudeCodeResult).toContain('enabled: true');
      expect(claudeCodeResult).toContain('level: 5');
      expect(claudeCodeResult).toContain('- advanced');
      expect(claudeCodeResult).toContain('- specialized');
    });

    it('should handle boolean and number values correctly', async () => {
      const content = `---
name: typed-agent
description: Agent with typed values
enabled: true
count: 42
threshold: 0.75
mode: test
---

Typed agent content`;

      const transformer = new ClaudeCodeTransformer(claudeCodeConfig);
      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('enabled: true');
      expect(result).toContain('count: 42');
      expect(result).toContain('threshold: 0.75');
      expect(result).toContain('mode: test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty frontmatter', async () => {
      const content = `---
---

Content with empty frontmatter`;

      const transformer = new ClaudeCodeTransformer(claudeCodeConfig);
      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('Content with empty frontmatter');
    });

    it('should handle malformed YAML gracefully', async () => {
      const content = `---
name: broken-agent
description: Agent with broken yaml
tools: [unclosed array
---

Broken content`;

      const transformer = new ClaudeCodeTransformer(claudeCodeConfig);

      // Should not throw an error
      const result = await transformer.transformAgentContent(content);
      expect(result).toBeDefined();
      expect(result).toContain('Broken content');
    });

    it('should handle multiple YAML documents', async () => {
      const content = `---
name: multi-doc-agent
description: First document
---

First content

---
name: second-doc
description: Second document
---

Second content`;

      const transformer = new ClaudeCodeTransformer(claudeCodeConfig);
      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('name: multi-doc-agent');
      expect(result).toContain('First content');
      expect(result).toContain('Second content');
    });
  });
});