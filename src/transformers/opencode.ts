import type { MCPServerConfigUnion } from '../types.js';
import type { TargetConfig } from '../types.js';
import { BaseTransformer } from './base.js';

/**
 * OpenCode transformer implementation
 * Handles YAML front matter agents and opencode.jsonc configuration
 */
export class OpenCodeTransformer extends BaseTransformer {
  constructor(config: TargetConfig) {
    super(config);
  }

  /**
   * Transform agent content for OpenCode
   * OpenCode uses YAML front matter, so we preserve it
   */
  transformAgentContent(content: string, metadata?: any): string {
    // For OpenCode, we preserve YAML front matter
    // If metadata is provided, we merge it with existing front matter
    if (metadata) {
      const { metadata: existingMetadata, content: baseContent } =
        this.extractYamlFrontMatter(content);
      const mergedMetadata = { ...existingMetadata, ...metadata };
      return this.addYamlFrontMatter(baseContent, mergedMetadata);
    }

    // If no metadata provided, return content as-is (preserving existing YAML)
    return content;
  }

  /**
   * Transform MCP server configuration for OpenCode
   * OpenCode expects MCP config under the 'mcp' key
   */
  transformMCPConfig(config: MCPServerConfigUnion): any {
    // OpenCode uses the standard MCP config format
    return config;
  }

  /**
   * Read OpenCode configuration
   */
  async readConfig(cwd: string): Promise<any> {
    const config = await super.readConfig(cwd);

    // Ensure the config has the expected structure
    if (!config.mcp) {
      config.mcp = {};
    }

    return config;
  }

  /**
   * Write OpenCode configuration
   */
  async writeConfig(cwd: string, config: any): Promise<void> {
    // Ensure the config has the expected structure for OpenCode
    if (!config.mcp) {
      config.mcp = {};
    }

    await super.writeConfig(cwd, config);
  }

  /**
   * Validate OpenCode-specific requirements
   */
  async validateRequirements(cwd: string): Promise<void> {
    await super.validateRequirements(cwd);

    // OpenCode-specific validations could go here
    // For now, we just use the base validation
  }

  /**
   * Get OpenCode-specific help text
   */
  getHelpText(): string {
    let help = super.getHelpText();

    help += `OpenCode-Specific Information:\n`;
    help += `  Configuration File: opencode.jsonc\n`;
    help += `  Schema: https://opencode.ai/config.json\n`;
    help += `  Agent Format: Markdown with YAML front matter\n`;
    help += `  MCP Integration: Automatic server discovery\n\n`;

    help += `Example Agent Structure:\n`;
    help += `  ---\n`;
    help += `  name: "My Agent"\n`;
    help += `  description: "Agent description"\n`;
    help += `  ---\n\n`;
    help += `  Agent content here...\n\n`;

    return help;
  }

  /**
   * Helper method to extract agent metadata from YAML front matter
   */
  extractAgentMetadata(content: string): any {
    const { metadata } = this.extractYamlFrontMatter(content);

    if (typeof metadata === 'string') {
      try {
        // Try to parse as JSON first
        return JSON.parse(metadata);
      } catch {
        // If not JSON, return as string
        return { raw: metadata };
      }
    }

    return metadata || {};
  }

  /**
   * Helper method to update agent metadata in YAML front matter
   */
  updateAgentMetadata(content: string, updates: any): string {
    const { metadata: existingMetadata, content: baseContent } =
      this.extractYamlFrontMatter(content);
    const updatedMetadata = { ...existingMetadata, ...updates };
    return this.addYamlFrontMatter(baseContent, updatedMetadata);
  }

  /**
   * Helper method to check if content has valid YAML front matter
   */
  hasValidYamlFrontMatter(content: string): boolean {
    const yamlRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    return yamlRegex.test(content);
  }

  /**
   * Helper method to ensure content has YAML front matter
   */
  ensureYamlFrontMatter(content: string, defaultMetadata: any = {}): string {
    if (this.hasValidYamlFrontMatter(content)) {
      return content;
    }

    return this.addYamlFrontMatter(content, defaultMetadata);
  }
}
