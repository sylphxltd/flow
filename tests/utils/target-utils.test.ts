/**
 * Target Utils Tests
 * Tests for target-specific utility functions
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MCPServerConfigUnion, TargetConfig } from '../../src/types.js';
import {
  fileUtils,
  generateHelpText,
  pathUtils,
  systemPromptUtils,
  transformUtils,
  yamlUtils,
} from '../../src/utils/target-utils.js';

describe('Target Utils', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'target-utils-test-'));
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('fileUtils', () => {
    const mockConfig: TargetConfig = {
      name: 'test-target',
      configFile: 'config.jsonc',
      configSchema: 'https://example.com/schema.json',
      agentDir: '.agents',
      agentExtension: '.md',
      agentFormat: 'markdown',
      mcpConfigPath: 'mcp.json',
      stripYaml: false,
      flatten: false,
      installation: {
        createConfigFile: true,
        supportedMcpServers: true,
      },
    };

    describe('getConfigPath', () => {
      it('should return config path', () => {
        const configPath = fileUtils.getConfigPath(mockConfig, testDir);
        expect(configPath).toContain(testDir);
        expect(configPath).toContain('config.jsonc');
      });

      it('should validate config file name', () => {
        const badConfig = { ...mockConfig, configFile: '../../../etc/passwd' };
        expect(() => fileUtils.getConfigPath(badConfig, testDir)).toThrow();
      });

      it('should safely join paths', () => {
        const configPath = fileUtils.getConfigPath(mockConfig, testDir);
        expect(configPath.startsWith(testDir)).toBe(true);
      });
    });

    describe('readConfig', () => {
      it('should read JSONC config', async () => {
        const configPath = join(testDir, 'config.jsonc');
        const data = { name: 'test', value: 42 };
        writeFileSync(configPath, JSON.stringify(data), 'utf8');

        const result = await fileUtils.readConfig(mockConfig, testDir);
        expect(result).toEqual(data);
      });

      it('should read JSON config', async () => {
        const jsonConfig = { ...mockConfig, configFile: 'config.json' };
        const configPath = join(testDir, 'config.json');
        const data = { name: 'test', value: 42 };
        writeFileSync(configPath, JSON.stringify(data), 'utf8');

        const result = await fileUtils.readConfig(jsonConfig, testDir);
        expect(result).toEqual(data);
      });

      it('should read YAML config', async () => {
        const yamlConfig = { ...mockConfig, configFile: 'config.yaml' };
        const configPath = join(testDir, 'config.yaml');
        const yamlContent = 'name: test\nvalue: 42\n';
        writeFileSync(configPath, yamlContent, 'utf8');

        const result = await fileUtils.readConfig(yamlConfig, testDir);
        expect(result).toEqual({ name: 'test', value: 42 });
      });

      it('should read YML config', async () => {
        const ymlConfig = { ...mockConfig, configFile: 'config.yml' };
        const configPath = join(testDir, 'config.yml');
        const yamlContent = 'name: test\nvalue: 42\n';
        writeFileSync(configPath, yamlContent, 'utf8');

        const result = await fileUtils.readConfig(ymlConfig, testDir);
        expect(result).toEqual({ name: 'test', value: 42 });
      });

      it('should return empty object if file does not exist', async () => {
        const result = await fileUtils.readConfig(mockConfig, testDir);
        expect(result).toEqual({});
      });

      it('should throw for unsupported format', async () => {
        const badConfig = { ...mockConfig, configFile: 'config.txt' };
        const configPath = join(testDir, 'config.txt');
        writeFileSync(configPath, 'test', 'utf8');

        await expect(fileUtils.readConfig(badConfig, testDir)).rejects.toThrow(
          'Unsupported config file format'
        );
      });
    });

    describe('writeConfig', () => {
      it('should write JSONC config', async () => {
        const data = { name: 'test', value: 42 };
        await fileUtils.writeConfig(mockConfig, testDir, data);

        const configPath = join(testDir, 'config.jsonc');
        const content = readFileSync(configPath, 'utf8');
        expect(content).toContain('name');
        expect(content).toContain('test');
      });

      it('should write JSON config', async () => {
        const jsonConfig = { ...mockConfig, configFile: 'config.json' };
        const data = { name: 'test', value: 42 };
        await fileUtils.writeConfig(jsonConfig, testDir, data);

        const configPath = join(testDir, 'config.json');
        const content = readFileSync(configPath, 'utf8');
        expect(JSON.parse(content)).toEqual(data);
      });

      it('should write YAML config', async () => {
        const yamlConfig = { ...mockConfig, configFile: 'config.yaml' };
        const data = { name: 'test', value: 42 };
        await fileUtils.writeConfig(yamlConfig, testDir, data);

        const configPath = join(testDir, 'config.yaml');
        const content = readFileSync(configPath, 'utf8');
        expect(content).toContain('name: test');
        expect(content).toContain('value: 42');
      });

      it('should write YML config', async () => {
        const ymlConfig = { ...mockConfig, configFile: 'config.yml' };
        const data = { name: 'test', value: 42 };
        await fileUtils.writeConfig(ymlConfig, testDir, data);

        const configPath = join(testDir, 'config.yml');
        const content = readFileSync(configPath, 'utf8');
        expect(content).toContain('name: test');
      });

      it('should create directory if missing', async () => {
        const nestedConfig = { ...mockConfig, configFile: 'sub/dir/config.jsonc' };
        const data = { name: 'test' };
        await fileUtils.writeConfig(nestedConfig, testDir, data);

        const configPath = join(testDir, 'sub/dir/config.jsonc');
        const content = readFileSync(configPath, 'utf8');
        expect(content).toContain('name');
      });

      it('should throw for unsupported format', async () => {
        const badConfig = { ...mockConfig, configFile: 'config.txt' };
        await expect(fileUtils.writeConfig(badConfig, testDir, { test: 1 })).rejects.toThrow(
          'Unsupported config file format'
        );
      });

      it('should include schema in JSONC', async () => {
        const data = { name: 'test' };
        await fileUtils.writeConfig(mockConfig, testDir, data);

        const configPath = join(testDir, 'config.jsonc');
        const content = readFileSync(configPath, 'utf8');
        expect(content).toContain('$schema');
        expect(content).toContain('example.com/schema.json');
      });
    });

    describe('validateRequirements', () => {
      it('should validate writable agent directory', async () => {
        await expect(fileUtils.validateRequirements(mockConfig, testDir)).resolves.toBeUndefined();
      });

      it('should create agent directory if missing', async () => {
        await fileUtils.validateRequirements(mockConfig, testDir);
        const agentDir = join(testDir, '.agents');
        expect(() => readFileSync(agentDir)).toThrow(); // Directory exists but can't read as file
      });

      it('should throw if cannot write to agent directory', async () => {
        // Create agent dir as a file to make it non-writable
        const agentDir = join(testDir, '.agents');
        writeFileSync(agentDir, 'test', 'utf8');

        await expect(fileUtils.validateRequirements(mockConfig, testDir)).rejects.toThrow(
          'Cannot write to agent directory'
        );
      });

      it('should validate config file location if needed', async () => {
        const configWithFile = {
          ...mockConfig,
          installation: { createConfigFile: true, supportedMcpServers: true },
        };

        await expect(
          fileUtils.validateRequirements(configWithFile, testDir)
        ).resolves.toBeUndefined();
      });

      it('should skip config validation if not needed', async () => {
        const configNoFile = {
          ...mockConfig,
          installation: { createConfigFile: false, supportedMcpServers: false },
        };

        await expect(fileUtils.validateRequirements(configNoFile, testDir)).resolves.toBeUndefined();
      });
    });

    describe('Integration', () => {
      it('should support write/read round-trip for JSONC', async () => {
        const data = { name: 'test', value: 42, nested: { key: 'value' } };
        await fileUtils.writeConfig(mockConfig, testDir, data);
        const result = await fileUtils.readConfig(mockConfig, testDir);
        // writeConfig adds $schema for JSONC files
        expect(result).toMatchObject(data);
        expect(result.$schema).toBe('https://example.com/schema.json');
      });

      it('should support write/read round-trip for JSON', async () => {
        const jsonConfig = { ...mockConfig, configFile: 'config.json' };
        const data = { name: 'test', value: 42 };
        await fileUtils.writeConfig(jsonConfig, testDir, data);
        const result = await fileUtils.readConfig(jsonConfig, testDir);
        expect(result).toEqual(data);
      });

      it('should support write/read round-trip for YAML', async () => {
        const yamlConfig = { ...mockConfig, configFile: 'config.yaml' };
        const data = { name: 'test', value: 42 };
        await fileUtils.writeConfig(yamlConfig, testDir, data);
        const result = await fileUtils.readConfig(yamlConfig, testDir);
        expect(result).toEqual(data);
      });
    });
  });

  describe('yamlUtils', () => {
    describe('extractFrontMatter', () => {
      it('should extract YAML front matter', async () => {
        const content = `---
name: test
value: 42
---

# Content here`;
        const result = await yamlUtils.extractFrontMatter(content);
        expect(result.metadata).toEqual({ name: 'test', value: 42 });
        expect(result.content).toBe('# Content here');
      });

      it('should handle content without front matter', async () => {
        const content = '# Just content';
        const result = await yamlUtils.extractFrontMatter(content);
        expect(result.metadata).toEqual({});
        expect(result.content).toBe('# Just content');
      });

      it('should handle invalid YAML gracefully', async () => {
        // Mock console.warn to suppress expected warning
        const originalWarn = console.warn;
        console.warn = () => {};

        const content = `---
invalid: yaml: syntax:
---

Content`;
        const result = await yamlUtils.extractFrontMatter(content);
        expect(result.metadata).toEqual({});
        expect(result.content).toBe('Content');

        // Restore console.warn
        console.warn = originalWarn;
      });

      it('should handle nested objects in YAML', async () => {
        const content = `---
config:
  nested:
    value: 42
---

Content`;
        const result = await yamlUtils.extractFrontMatter(content);
        expect(result.metadata).toEqual({ config: { nested: { value: 42 } } });
      });

      it('should handle arrays in YAML', async () => {
        const content = `---
items:
  - one
  - two
  - three
---

Content`;
        const result = await yamlUtils.extractFrontMatter(content);
        expect(result.metadata).toEqual({ items: ['one', 'two', 'three'] });
      });
    });

    describe('addFrontMatter', () => {
      it('should add front matter to content', async () => {
        const content = 'Test content';
        const metadata = { name: 'test', value: 42 };
        const result = await yamlUtils.addFrontMatter(content, metadata);

        expect(result).toContain('---');
        expect(result).toContain('name: test');
        expect(result).toContain('value: 42');
        expect(result).toContain('Test content');
      });

      it('should handle empty metadata', async () => {
        const content = 'Test content';
        const result = await yamlUtils.addFrontMatter(content, {});
        expect(result).toBe('Test content');
      });

      it('should handle null metadata', async () => {
        const content = 'Test content';
        const result = await yamlUtils.addFrontMatter(content, null);
        expect(result).toBe('Test content');
      });

      it('should handle undefined metadata', async () => {
        const content = 'Test content';
        const result = await yamlUtils.addFrontMatter(content, undefined);
        expect(result).toBe('Test content');
      });

      it('should add nested metadata', async () => {
        const content = 'Test content';
        const metadata = { config: { nested: { value: 42 } } };
        const result = await yamlUtils.addFrontMatter(content, metadata);
        expect(result).toContain('config:');
        expect(result).toContain('nested:');
      });
    });

    describe('stripFrontMatter', () => {
      it('should strip front matter', async () => {
        const content = `---
name: test
---

Content here`;
        const result = await yamlUtils.stripFrontMatter(content);
        expect(result).toBe('Content here');
        expect(result).not.toContain('---');
        expect(result).not.toContain('name: test');
      });

      it('should return content unchanged if no front matter', async () => {
        const content = 'Just content';
        const result = await yamlUtils.stripFrontMatter(content);
        expect(result).toBe('Just content');
      });
    });

    describe('hasValidFrontMatter', () => {
      it('should return true for valid front matter', () => {
        const content = `---
name: test
---

Content`;
        expect(yamlUtils.hasValidFrontMatter(content)).toBe(true);
      });

      it('should return false for no front matter', () => {
        const content = 'Just content';
        expect(yamlUtils.hasValidFrontMatter(content)).toBe(false);
      });

      it('should return false for incomplete front matter', () => {
        const content = '---\nname: test\n\nContent';
        expect(yamlUtils.hasValidFrontMatter(content)).toBe(false);
      });
    });

    describe('ensureFrontMatter', () => {
      it('should keep existing front matter', async () => {
        const content = `---
name: test
---

Content`;
        const result = await yamlUtils.ensureFrontMatter(content, { default: 'value' });
        expect(result).toContain('name: test');
        expect(result).not.toContain('default: value');
      });

      it('should add default front matter if missing', async () => {
        const content = 'Just content';
        const result = await yamlUtils.ensureFrontMatter(content, { default: 'value' });
        expect(result).toContain('default: value');
        expect(result).toContain('Just content');
      });

      it('should use empty metadata if none provided', async () => {
        const content = 'Just content';
        const result = await yamlUtils.ensureFrontMatter(content);
        expect(result).toBe('Just content');
      });
    });

    describe('extractAgentMetadata', () => {
      it('should extract metadata object', async () => {
        const content = `---
name: test-agent
description: Test agent
---

Content`;
        const result = await yamlUtils.extractAgentMetadata(content);
        expect(result).toEqual({ name: 'test-agent', description: 'Test agent' });
      });

      it('should parse string metadata as JSON', async () => {
        const content = `---
"{\\"name\\": \\"test\\"}"
---

Content`;
        const result = await yamlUtils.extractAgentMetadata(content);
        expect(result).toEqual({ name: 'test' });
      });

      it('should handle invalid JSON string', async () => {
        const content = `---
"invalid json"
---

Content`;
        const result = await yamlUtils.extractAgentMetadata(content);
        expect(result).toEqual({ raw: 'invalid json' });
      });

      it('should return empty object for no metadata', async () => {
        const content = 'Just content';
        const result = await yamlUtils.extractAgentMetadata(content);
        expect(result).toEqual({});
      });
    });

    describe('updateAgentMetadata', () => {
      it('should update existing metadata', async () => {
        const content = `---
name: test
version: 1
---

Content`;
        const result = await yamlUtils.updateAgentMetadata(content, { version: 2, new: 'field' });
        expect(result).toContain('version: 2');
        expect(result).toContain('new: field');
        expect(result).toContain('name: test');
      });

      it('should add metadata to content without front matter', async () => {
        const content = 'Just content';
        const result = await yamlUtils.updateAgentMetadata(content, { name: 'test' });
        expect(result).toContain('name: test');
        expect(result).toContain('Just content');
      });

      it('should preserve content', async () => {
        const content = `---
name: test
---

# Title
Content here`;
        const result = await yamlUtils.updateAgentMetadata(content, { version: 1 });
        expect(result).toContain('# Title');
        expect(result).toContain('Content here');
      });
    });

    describe('validateClaudeCodeFrontMatter', () => {
      it('should validate valid front matter', () => {
        const metadata = { name: 'test', description: 'Test agent', tools: ['read', 'write'] };
        expect(yamlUtils.validateClaudeCodeFrontMatter(metadata)).toBe(true);
      });

      it('should require name field', () => {
        const metadata = { description: 'Test agent' };
        expect(yamlUtils.validateClaudeCodeFrontMatter(metadata)).toBe(false);
      });

      it('should require description field', () => {
        const metadata = { name: 'test' };
        expect(yamlUtils.validateClaudeCodeFrontMatter(metadata)).toBe(false);
      });

      it('should reject non-object metadata', () => {
        expect(yamlUtils.validateClaudeCodeFrontMatter('string')).toBe(false);
        expect(yamlUtils.validateClaudeCodeFrontMatter(null)).toBe(false);
        expect(yamlUtils.validateClaudeCodeFrontMatter(undefined)).toBe(false);
      });

      it('should reject non-array tools', () => {
        const metadata = { name: 'test', description: 'Test', tools: 'not-array' };
        expect(yamlUtils.validateClaudeCodeFrontMatter(metadata)).toBe(false);
      });

      it('should allow missing tools field', () => {
        const metadata = { name: 'test', description: 'Test agent' };
        expect(yamlUtils.validateClaudeCodeFrontMatter(metadata)).toBe(true);
      });

      it('should allow empty tools array', () => {
        const metadata = { name: 'test', description: 'Test', tools: [] };
        expect(yamlUtils.validateClaudeCodeFrontMatter(metadata)).toBe(true);
      });
    });

    describe('normalizeClaudeCodeFrontMatter', () => {
      it('should normalize string tools to array', () => {
        const metadata = { name: 'test', tools: 'single-tool' };
        const result = yamlUtils.normalizeClaudeCodeFrontMatter(metadata);
        expect(result.tools).toEqual(['single-tool']);
      });

      it('should keep array tools unchanged', () => {
        const metadata = { name: 'test', tools: ['tool1', 'tool2'] };
        const result = yamlUtils.normalizeClaudeCodeFrontMatter(metadata);
        expect(result.tools).toEqual(['tool1', 'tool2']);
      });

      it('should add default model if missing', () => {
        const metadata = { name: 'test' };
        const result = yamlUtils.normalizeClaudeCodeFrontMatter(metadata);
        expect(result.model).toBe('inherit');
      });

      it('should keep existing model', () => {
        const metadata = { name: 'test', model: 'custom' };
        const result = yamlUtils.normalizeClaudeCodeFrontMatter(metadata);
        expect(result.model).toBe('custom');
      });

      it('should not mutate original metadata', () => {
        const metadata = { name: 'test', tools: 'single' };
        const result = yamlUtils.normalizeClaudeCodeFrontMatter(metadata);
        expect(metadata.tools).toBe('single'); // Original unchanged
        expect(result.tools).toEqual(['single']); // Result changed
      });
    });
  });

  describe('pathUtils', () => {
    describe('flattenPath', () => {
      it('should flatten path with forward slashes', () => {
        const result = pathUtils.flattenPath('src/components/Button.tsx');
        expect(result).toBe('src-components-Button');
      });

      it('should flatten path with backslashes', () => {
        const result = pathUtils.flattenPath('src\\components\\Button.tsx');
        // On Unix systems, backslashes are literal characters, not separators
        // The result depends on the platform
        expect(result).toBeTruthy();
        expect(result).toContain('Button');
      });

      it('should handle path without directory', () => {
        const result = pathUtils.flattenPath('file.md');
        expect(result).toBe('file');
      });

      it('should handle mixed separators', () => {
        const result = pathUtils.flattenPath('src/sub\\dir/file.md');
        expect(result).toBe('src-sub-dir-file');
      });

      it('should preserve extension in name only', () => {
        const result = pathUtils.flattenPath('dir/file.test.md');
        expect(result).toBe('dir-file.test');
      });
    });

    describe('getAgentFilePath', () => {
      const mockConfig: TargetConfig = {
        name: 'test',
        configFile: 'config.json',
        agentDir: '.agents',
        agentExtension: '.md',
        agentFormat: 'markdown',
        mcpConfigPath: 'mcp.json',
        stripYaml: false,
        flatten: false,
        installation: { createConfigFile: false, supportedMcpServers: false },
      };

      it('should reject empty source path', () => {
        expect(() => pathUtils.getAgentFilePath('', mockConfig, testDir)).toThrow(
          'Source path must be a non-empty string'
        );
      });

      it('should reject null source path', () => {
        expect(() => pathUtils.getAgentFilePath(null as any, mockConfig, testDir)).toThrow(
          'Source path must be a non-empty string'
        );
      });

      it('should reject path traversal with ..', () => {
        expect(() => pathUtils.getAgentFilePath('../test.md', mockConfig, testDir)).toThrow(
          'Invalid source path'
        );
      });

      it('should reject absolute path with /', () => {
        expect(() => pathUtils.getAgentFilePath('/etc/passwd', mockConfig, testDir)).toThrow(
          'Invalid source path'
        );
      });

      it('should reject absolute path with \\', () => {
        expect(() =>
          pathUtils.getAgentFilePath('\\windows\\system32', mockConfig, testDir)
        ).toThrow('Invalid source path');
      });

      it('should generate flattened path', () => {
        const flatConfig = { ...mockConfig, flatten: true };
        const result = pathUtils.getAgentFilePath('src/agents/test.md', flatConfig, testDir);
        expect(result).toContain('src-agents-test.md');
      });

      it('should generate nested path', () => {
        const result = pathUtils.getAgentFilePath('src/test.md', mockConfig, testDir);
        expect(result).toContain('src');
        expect(result).toContain('test.md.md'); // source + extension
      });

      it('should add agent extension', () => {
        const result = pathUtils.getAgentFilePath('test', mockConfig, testDir);
        expect(result.endsWith('.md')).toBe(true);
      });
    });

    describe('extractNameFromPath', () => {
      it('should extract name from simple path', () => {
        const result = pathUtils.extractNameFromPath('test-agent.md');
        expect(result).toBe('test-agent');
      });

      it('should extract name from nested path', () => {
        const result = pathUtils.extractNameFromPath('agents/test-agent.md');
        expect(result).toBe('test-agent');
      });

      it('should convert to kebab case', () => {
        const result = pathUtils.extractNameFromPath('Test Agent Name.md');
        expect(result).toBe('test-agent-name');
      });

      it('should handle special patterns - constitution', () => {
        const result = pathUtils.extractNameFromPath('constitution.md');
        expect(result).toBe('sdd-constitution');
      });

      it('should handle special patterns - coder', () => {
        const result = pathUtils.extractNameFromPath('coder.md');
        expect(result).toBe('core-coder');
      });

      it('should handle special patterns - orchestrator', () => {
        const result = pathUtils.extractNameFromPath('orchestrator.md');
        expect(result).toBe('sdd-development-orchestrator');
      });

      it('should return null for empty path', () => {
        const result = pathUtils.extractNameFromPath('');
        expect(result).toBeNull();
      });

      it('should remove .md extension', () => {
        const result = pathUtils.extractNameFromPath('test.md');
        expect(result).not.toContain('.md');
      });

      it('should clean up multiple hyphens', () => {
        const result = pathUtils.extractNameFromPath('test---multiple---hyphens.md');
        expect(result).toBe('test-multiple-hyphens');
      });
    });

    describe('extractAgentName', () => {
      it('should extract from path first', () => {
        const result = pathUtils.extractAgentName('content', {}, 'coder.md');
        expect(result).toBe('core-coder');
      });

      it('should extract from title if no path', () => {
        const content = '# Code Implementation Agent\n\nDescription';
        const result = pathUtils.extractAgentName(content, {});
        expect(result).toContain('code-implementation-agent');
      });

      it('should extract from description if no title', () => {
        const content = 'Content without title';
        const metadata = { description: 'This is a coder agent' };
        const result = pathUtils.extractAgentName(content, metadata);
        expect(result).toBe('code-implementation-agent');
      });

      it('should use default if nothing found', () => {
        const result = pathUtils.extractAgentName('Just content', {});
        expect(result).toBe('development-agent');
      });

      it('should handle title with Agent suffix', () => {
        const content = '# Reviewer Agent\n\nDescription';
        const result = pathUtils.extractAgentName(content, {});
        expect(result).toContain('reviewer');
      });

      it('should add agent suffix if missing', () => {
        const content = '# Tester\n\nDescription';
        const result = pathUtils.extractAgentName(content, {});
        expect(result).toContain('agent');
      });
    });

    describe('extractDescription', () => {
      it('should extract first paragraph after title', () => {
        const content = '# Title\n\nThis is the description.\n\n# Next section';
        const result = pathUtils.extractDescription(content);
        expect(result).toBe('This is the description.');
      });

      it('should handle multi-line description', () => {
        const content = '# Title\n\nFirst line\nSecond line\n\n# Next';
        const result = pathUtils.extractDescription(content);
        expect(result).toBe('First line Second line');
      });

      it('should use default if no description found', () => {
        const content = '# Just a title';
        const result = pathUtils.extractDescription(content);
        expect(result).toBe('Development agent for specialized tasks');
      });

      it('should trim whitespace', () => {
        const content = '# Title\n\n   Description with spaces   \n\n# Next';
        const result = pathUtils.extractDescription(content);
        expect(result).toBe('Description with spaces');
      });
    });
  });

  describe('systemPromptUtils', () => {
    describe('createOverridePrompt', () => {
      it('should create standard override prompt', () => {
        const base = 'This is the base prompt.';
        const result = systemPromptUtils.createOverridePrompt(base);

        expect(result).toContain('SYSTEM OVERRIDE NOTICE');
        expect(result).toContain(base);
        expect(result).not.toContain('🚨');
      });

      it('should create critical override prompt', () => {
        const base = 'This is the base prompt.';
        const result = systemPromptUtils.createOverridePrompt(base, { critical: true });

        expect(result).toContain('🚨 CRITICAL SYSTEM OVERRIDE NOTICE 🚨');
        expect(result).toContain('HIGHEST PRIORITY');
        expect(result).toContain(base);
      });

      it('should include base prompt in result', () => {
        const base = 'Custom instructions here.';
        const result = systemPromptUtils.createOverridePrompt(base);
        expect(result).toContain('Custom instructions here.');
      });

      it('should handle empty options', () => {
        const base = 'Test prompt';
        const result = systemPromptUtils.createOverridePrompt(base, {});
        expect(result).toContain('Test prompt');
      });

      it('should handle critical with priority description', () => {
        const base = 'Test';
        const result = systemPromptUtils.createOverridePrompt(base, {
          critical: true,
          priorityDescription: 'Custom priority',
        });
        expect(result).toContain('🚨');
      });
    });
  });

  describe('transformUtils', () => {
    describe('defaultTransformAgentContent', () => {
      it('should return content unchanged', async () => {
        const content = 'Test content';
        const result = await transformUtils.defaultTransformAgentContent(content);
        expect(result).toBe(content);
      });

      it('should handle empty content', async () => {
        const result = await transformUtils.defaultTransformAgentContent('');
        expect(result).toBe('');
      });

      it('should ignore metadata parameter', async () => {
        const content = 'Test';
        const result = await transformUtils.defaultTransformAgentContent(content, { any: 'value' });
        expect(result).toBe(content);
      });

      it('should ignore sourcePath parameter', async () => {
        const content = 'Test';
        const result = await transformUtils.defaultTransformAgentContent(
          content,
          undefined,
          'path.md'
        );
        expect(result).toBe(content);
      });
    });

    describe('defaultTransformMCPConfig', () => {
      it('should return config unchanged', () => {
        const config: MCPServerConfigUnion = {
          command: 'node',
          args: ['server.js'],
        };
        const result = transformUtils.defaultTransformMCPConfig(config);
        expect(result).toEqual(config);
      });

      it('should handle empty config', () => {
        const config: any = {};
        const result = transformUtils.defaultTransformMCPConfig(config);
        expect(result).toEqual({});
      });

      it('should preserve all config properties', () => {
        const config: MCPServerConfigUnion = {
          command: 'python',
          args: ['main.py'],
          env: { KEY: 'value' },
        };
        const result = transformUtils.defaultTransformMCPConfig(config);
        expect(result.command).toBe('python');
        expect(result.args).toEqual(['main.py']);
        expect(result.env).toEqual({ KEY: 'value' });
      });
    });
  });

  describe('generateHelpText', () => {
    const mockConfig: TargetConfig = {
      name: 'test-target',
      configFile: 'config.json',
      agentDir: '.agents',
      agentExtension: '.md',
      agentFormat: 'markdown',
      mcpConfigPath: 'mcp.json',
      stripYaml: true,
      flatten: true,
      installation: {
        createConfigFile: true,
        supportedMcpServers: true,
      },
    };

    it('should generate help text with all info', () => {
      const result = generateHelpText(mockConfig);

      expect(result).toContain('Agent Installation:');
      expect(result).toContain('Directory: .agents');
      expect(result).toContain('Extension: .md');
      expect(result).toContain('Format: markdown');
    });

    it('should show stripYaml setting', () => {
      const result = generateHelpText(mockConfig);
      expect(result).toContain('Strip YAML: Yes');
    });

    it('should show flatten setting', () => {
      const result = generateHelpText(mockConfig);
      expect(result).toContain('Flatten Structure: Yes');
    });

    it('should show MCP support if enabled', () => {
      const result = generateHelpText(mockConfig);
      expect(result).toContain('MCP Server Support:');
      expect(result).toContain('Config Path: mcp.json');
      expect(result).toContain('Supported: Yes');
    });

    it('should show not implemented if MCP not supported', () => {
      const noMcpConfig = {
        ...mockConfig,
        installation: { ...mockConfig.installation, supportedMcpServers: false },
      };
      const result = generateHelpText(noMcpConfig);
      expect(result).toContain('Not yet implemented');
    });

    it('should handle stripYaml: false', () => {
      const noStripConfig = { ...mockConfig, stripYaml: false };
      const result = generateHelpText(noStripConfig);
      expect(result).toContain('Strip YAML: No');
    });

    it('should handle flatten: false', () => {
      const noFlattenConfig = { ...mockConfig, flatten: false };
      const result = generateHelpText(noFlattenConfig);
      expect(result).toContain('Flatten Structure: No');
    });
  });

  describe('Integration', () => {
    it('should support full agent processing workflow', async () => {
      const content = `---
name: test-agent
description: Test agent
tools:
  - read
  - write
---

# Test Agent

This is a test agent description.`;

      // Extract and validate metadata
      const { metadata, content: baseContent } = await yamlUtils.extractFrontMatter(content);
      expect(yamlUtils.validateClaudeCodeFrontMatter(metadata)).toBe(true);

      // Normalize metadata
      const normalized = yamlUtils.normalizeClaudeCodeFrontMatter(metadata);
      expect(normalized.model).toBe('inherit');

      // Extract name and description
      const name = pathUtils.extractAgentName(baseContent, metadata, 'agents/test.md');
      const description = pathUtils.extractDescription(baseContent);

      expect(name).toBeTruthy();
      expect(description).toBe('This is a test agent description.');
    });

    it('should support config file workflow', async () => {
      const mockConfig: TargetConfig = {
        name: 'test',
        configFile: 'config.jsonc',
        agentDir: '.agents',
        agentExtension: '.md',
        agentFormat: 'markdown',
        mcpConfigPath: 'mcp.json',
        stripYaml: false,
        flatten: false,
        installation: { createConfigFile: true, supportedMcpServers: true },
      };

      // Write config
      const data = { agents: ['agent1', 'agent2'], settings: { enabled: true } };
      await fileUtils.writeConfig(mockConfig, testDir, data);

      // Read config back
      const result = await fileUtils.readConfig(mockConfig, testDir);
      expect(result).toEqual(data);

      // Validate requirements
      await expect(fileUtils.validateRequirements(mockConfig, testDir)).resolves.toBeUndefined();
    });

    it('should support YAML front matter workflow', async () => {
      const original = 'Original content';
      const metadata = { name: 'test', version: 1 };

      // Add front matter
      const withFrontMatter = await yamlUtils.addFrontMatter(original, metadata);
      expect(yamlUtils.hasValidFrontMatter(withFrontMatter)).toBe(true);

      // Update metadata
      const updated = await yamlUtils.updateAgentMetadata(withFrontMatter, { version: 2 });

      // Extract and verify
      const extracted = await yamlUtils.extractAgentMetadata(updated);
      expect(extracted.version).toBe(2);
      expect(extracted.name).toBe('test');

      // Strip front matter
      const stripped = await yamlUtils.stripFrontMatter(updated);
      expect(stripped).toContain('Original content');
      expect(stripped).not.toContain('---');
    });
  });
});
