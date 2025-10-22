import { beforeEach, describe, expect, it } from 'vitest';
import { ClaudeCodeTransformer } from '../src/transformers/claude-code.js';
import { OpenCodeTransformer } from '../src/transformers/opencode.js';
import type { TargetConfig } from '../src/types.js';

describe('Transformers', () => {
  const opencodeConfig: TargetConfig = {
    agentDir: '.opencode/agent',
    agentExtension: '.md',
    agentFormat: 'yaml-frontmatter',
    stripYaml: false,
    flatten: false,
    configFile: 'opencode.jsonc',
    configSchema: null,
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
    configSchema: null,
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
      expect(result).not.toContain('mode: subagent'); // Mode should be removed
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
      expect(result).not.toContain('temperature: 0.1'); // Temperature should be removed
    });

    it('should not include model field when it is inherit (default)', async () => {
      const content = `---
name: test-agent
description: Test agent
---

Test content`;

      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('name: test-agent');
      expect(result).not.toContain('model: inherit'); // Should not include default model
    });

    it('should include model field when it is not inherit', async () => {
      const content = `---
name: test-agent
description: Test agent
model: claude-3-5-sonnet-20241022
---

Test content`;

      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('name: test-agent');
      expect(result).toContain('model: claude-3-5-sonnet-20241022');
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

    it('should remove unsupported fields like temperature and mode', async () => {
      const content = `---
name: custom-agent
description: Custom agent
temperature: 0.3
mode: custom
tools:
  - Read
  - Write
---

Custom content`;

      const result = await transformer.transformAgentContent(content);

      expect(result).toContain('name: custom-agent');
      expect(result).toContain('description: Custom agent');
      expect(result).not.toContain('temperature: 0.3');
      expect(result).not.toContain('mode: custom');
      expect(result).not.toContain('tools:');
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

      // OpenCode should preserve complex structure
      expect(opencodeResult).toContain('advanced:');
      expect(opencodeResult).toContain('enabled: true');
      expect(opencodeResult).toContain('level: 5');
      expect(opencodeResult).toContain('- advanced');
      expect(opencodeResult).toContain('- specialized');

      // Claude Code should only keep name and description, remove complex structures
      expect(claudeCodeResult).toContain('name: complex-agent');
      expect(claudeCodeResult).toContain('description: Agent with complex config');
      expect(claudeCodeResult).not.toContain('advanced:');
      expect(claudeCodeResult).not.toContain('settings:');
      expect(claudeCodeResult).not.toContain('tags:');
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

      // Claude Code should only keep name and description
      expect(result).toContain('name: typed-agent');
      expect(result).toContain('description: Agent with typed values');
      expect(result).not.toContain('enabled: true');
      expect(result).not.toContain('count: 42');
      expect(result).not.toContain('threshold: 0.75');
      expect(result).not.toContain('mode: test');
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

  describe('OpenCode MCP Configuration', () => {
    it('should convert Claude Code stdio to OpenCode local format', async () => {
      const stdioConfig = {
        type: 'stdio' as const,
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '/path/to/dir'],
        env: {
          NODE_ENV: 'production',
        },
      };

      const openCodeTransformer = new OpenCodeTransformer(opencodeConfig);
      const result = openCodeTransformer.transformMCPConfig(stdioConfig);

      expect(result).toEqual({
        type: 'local',
        command: ['npx', '@modelcontextprotocol/server-filesystem', '/path/to/dir'],
        environment: {
          NODE_ENV: 'production',
        },
      });
    });

    it('should convert Claude Code http to OpenCode remote format', async () => {
      const httpConfig = {
        type: 'http' as const,
        url: 'https://api.example.com/mcp',
        headers: {
          Authorization: 'Bearer $API_KEY',
        },
      };

      const openCodeTransformer = new OpenCodeTransformer(opencodeConfig);
      const result = openCodeTransformer.transformMCPConfig(httpConfig);

      expect(result).toEqual({
        type: 'remote',
        url: 'https://api.example.com/mcp',
        headers: {
          Authorization: 'Bearer $API_KEY',
        },
      });
    });

    it('should handle Claude Code stdio without args or env', async () => {
      const stdioConfig = {
        type: 'stdio' as const,
        command: '/usr/local/bin/server',
      };

      const openCodeTransformer = new OpenCodeTransformer(opencodeConfig);
      const result = openCodeTransformer.transformMCPConfig(stdioConfig);

      expect(result).toEqual({
        type: 'local',
        command: ['/usr/local/bin/server'],
      });
      expect(result).not.toHaveProperty('environment');
    });

    it('should preserve OpenCode legacy local format', async () => {
      const localConfig = {
        type: 'local' as const,
        command: ['node', 'server.js'],
        environment: {
          PORT: '3000',
        },
      };

      const openCodeTransformer = new OpenCodeTransformer(opencodeConfig);
      const result = openCodeTransformer.transformMCPConfig(localConfig);

      expect(result).toEqual({
        type: 'local',
        command: ['node', 'server.js'],
        environment: {
          PORT: '3000',
        },
      });
    });

    it('should preserve OpenCode legacy remote format', async () => {
      const remoteConfig = {
        type: 'remote' as const,
        url: 'https://example.com/mcp',
      };

      const openCodeTransformer = new OpenCodeTransformer(opencodeConfig);
      const result = openCodeTransformer.transformMCPConfig(remoteConfig);

      expect(result).toEqual({
        type: 'remote',
        url: 'https://example.com/mcp',
      });
    });
  });

  describe('Claude Code MCP Configuration', () => {
    it('should transform OpenCode local config to Claude Code stdio format', async () => {
      const localConfig = {
        type: 'local' as const,
        command: ['npx', '@modelcontextprotocol/server-filesystem', '/path/to/dir'],
        environment: {
          NODE_ENV: 'production',
        },
      };

      const claudeCodeTransformer = new ClaudeCodeTransformer(claudeCodeConfig);
      const result = claudeCodeTransformer.transformMCPConfig(localConfig);

      expect(result).toEqual({
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '/path/to/dir'],
        env: {
          NODE_ENV: 'production',
        },
      });
    });

    it('should preserve new Claude Code stdio format', async () => {
      const stdioConfig = {
        type: 'stdio' as const,
        command: 'npx',
        args: ['@modelcontextprotocol/server-git', '.'],
        env: {
          GIT_TRACE: '1',
        },
      };

      const claudeCodeTransformer = new ClaudeCodeTransformer(claudeCodeConfig);
      const result = claudeCodeTransformer.transformMCPConfig(stdioConfig);

      expect(result).toEqual({
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-git', '.'],
        env: {
          GIT_TRACE: '1',
        },
      });
    });

    it('should transform OpenCode remote config to Claude Code http', async () => {
      const remoteConfig = {
        type: 'remote' as const,
        url: 'https://api.example.com/mcp',
        headers: {
          Authorization: 'Bearer token123',
        },
      };

      const claudeCodeTransformer = new ClaudeCodeTransformer(claudeCodeConfig);
      const result = claudeCodeTransformer.transformMCPConfig(remoteConfig);

      expect(result).toEqual({
        type: 'http',
        url: 'https://api.example.com/mcp',
        headers: {
          Authorization: 'Bearer token123',
        },
      });
    });

    it('should preserve new Claude Code http format', async () => {
      const httpConfig = {
        type: 'http' as const,
        url: 'https://api.example.com/mcp',
        headers: {
          Authorization: 'Bearer $API_KEY',
        },
      };

      const claudeCodeTransformer = new ClaudeCodeTransformer(claudeCodeConfig);
      const result = claudeCodeTransformer.transformMCPConfig(httpConfig);

      expect(result).toEqual({
        type: 'http',
        url: 'https://api.example.com/mcp',
        headers: {
          Authorization: 'Bearer $API_KEY',
        },
      });
    });

    it('should handle OpenCode local config without environment variables', async () => {
      const localConfig = {
        type: 'local' as const,
        command: ['node', 'server.js'],
      };

      const claudeCodeTransformer = new ClaudeCodeTransformer(claudeCodeConfig);
      const result = claudeCodeTransformer.transformMCPConfig(localConfig);

      expect(result).toEqual({
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
      });
      expect(result).not.toHaveProperty('env');
    });

    it('should handle Claude Code stdio config with no args', async () => {
      const stdioConfig = {
        type: 'stdio' as const,
        command: '/usr/local/bin/custom-server',
      };

      const claudeCodeTransformer = new ClaudeCodeTransformer(claudeCodeConfig);
      const result = claudeCodeTransformer.transformMCPConfig(stdioConfig);

      expect(result).toEqual({
        type: 'stdio',
        command: '/usr/local/bin/custom-server',
      });
      expect(result).not.toHaveProperty('args');
    });

    it('should handle http config without headers', async () => {
      const httpConfig = {
        type: 'http' as const,
        url: 'https://mcp.example.com',
      };

      const claudeCodeTransformer = new ClaudeCodeTransformer(claudeCodeConfig);
      const result = claudeCodeTransformer.transformMCPConfig(httpConfig);

      expect(result).toEqual({
        type: 'http',
        url: 'https://mcp.example.com',
      });
      expect(result).not.toHaveProperty('headers');
    });
  });
});
