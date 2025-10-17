import type { MCPServerConfigUnion } from '../types.js';
import type { TargetConfig } from '../types.js';
import { BaseTransformer } from './base.js';

/**
 * Claude Code transformer implementation
 * Handles YAML front matter agents and .mcp.json configuration
 */
export class ClaudeCodeTransformer extends BaseTransformer {
  constructor(config: TargetConfig) {
    super(config);
  }

  /**
   * Transform agent content for Claude Code
   * Claude Code uses YAML front matter with specific fields
   */
  transformAgentContent(content: string, metadata?: any): string {
    // For Claude Code, we preserve YAML front matter
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
   * Transform MCP server configuration for Claude Code
   * Claude Code expects MCP config under the 'mcpServers' key
   */
  transformMCPConfig(config: MCPServerConfigUnion): any {
    // Claude Code uses the standard MCP config format
    return config;
  }

  /**
   * Read Claude Code configuration
   */
  async readConfig(cwd: string): Promise<any> {
    const config = await super.readConfig(cwd);

    // Ensure the config has the expected structure for Claude Code
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    return config;
  }

  /**
   * Write Claude Code configuration
   */
  async writeConfig(cwd: string, config: any): Promise<void> {
    // Ensure the config has the expected structure for Claude Code
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    await super.writeConfig(cwd, config);
  }

  /**
   * Validate Claude Code-specific requirements
   */
  async validateRequirements(cwd: string): Promise<void> {
    await super.validateRequirements(cwd);

    // Claude Code-specific validations could go here
    // For now, we just use the base validation
  }

  /**
   * Get Claude Code-specific help text
   */
  getHelpText(): string {
    let help = super.getHelpText();

    help += `Claude Code-Specific Information:\n`;
    help += `  Configuration File: .mcp.json\n`;
    help += `  Agent Format: Markdown with YAML front matter\n`;
    help += `  MCP Integration: Full server support\n\n`;

    help += `Example Agent Structure:\n`;
    help += `  ---\n`;
    help += `  name: "code-reviewer"\n`;
    help += `  description: "Expert code review specialist"\n`;
    help += `  tools: ["Read", "Grep", "Glob", "Bash"]\n`;
    help += `  model: "inherit"\n`;
    help += `  ---\n\n`;
    help += `  Agent content here...\n\n`;

    help += `Example MCP Configuration:\n`;
    help += `  {\n`;
    help += `    "mcpServers": {\n`;
    help += `      "api-server": {\n`;
    help += `        "type": "http",\n`;
    help += `        "url": "https://api.example.com/mcp",\n`;
    help += `        "headers": {\n`;
    help += `          "Authorization": "Bearer YOUR_API_KEY"\n`;
    help += `        }\n`;
    help += `      }\n`;
    help += `    }\n`;
    help += `  }\n\n`;

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

  /**
   * Helper method to validate Claude Code agent front matter
   */
  validateClaudeCodeFrontMatter(metadata: any): boolean {
    // Check for required fields according to Claude Code specification
    const requiredFields = ['name', 'description'];

    if (typeof metadata !== 'object' || metadata === null) {
      return false;
    }

    for (const field of requiredFields) {
      if (!metadata[field]) {
        return false;
      }
    }

    // Validate tools field if present
    if (metadata.tools && !Array.isArray(metadata.tools)) {
      return false;
    }

    return true;
  }

  /**
   * Helper method to normalize Claude Code agent front matter
   */
  normalizeClaudeCodeFrontMatter(metadata: any): any {
    const normalized = { ...metadata };

    // Ensure tools is an array
    if (normalized.tools && typeof normalized.tools === 'string') {
      normalized.tools = [normalized.tools];
    }

    // Set default model if not specified
    if (!normalized.model) {
      normalized.model = 'inherit';
    }

    return normalized;
  }
}