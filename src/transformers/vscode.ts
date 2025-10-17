import type { MCPServerConfigUnion } from '../types.js';
import type { TargetConfig } from '../types.js';
import { BaseTransformer } from './base.js';

/**
 * VS Code transformer implementation
 * Handles markdown agents and settings.json configuration
 * Note: This is a placeholder for future implementation
 */
export class VSCodeTransformer extends BaseTransformer {
  constructor(config: TargetConfig) {
    super(config);
  }

  /**
   * Transform agent content for VS Code
   * VS Code uses plain markdown without YAML front matter
   */
  async transformAgentContent(content: string, metadata?: any, sourcePath?: string): Promise<string> {
    // Extract YAML front matter if present and strip it
    const { content: baseContent } = await this.extractYamlFrontMatter(content);

    // VS Code agents are plain markdown files
    // We could add metadata as comments if needed
    let transformedContent = baseContent;

    if (metadata && Object.keys(metadata).length > 0) {
      // Add metadata as HTML comments at the top
      const metadataComment = Object.entries(metadata)
        .map(([key, value]) => `<!-- ${key}: ${value} -->`)
        .join('\n');

      transformedContent = `${metadataComment}\n\n${baseContent}`;
    }

    return transformedContent;
  }

  /**
   * Transform MCP server configuration for VS Code
   * Note: MCP support for VS Code is not yet implemented
   */
  transformMCPConfig(config: MCPServerConfigUnion): any {
    // VS Code MCP integration is not yet implemented
    throw new Error('MCP server support for VS Code is not yet implemented');
  }

  /**
   * Read VS Code configuration
   */
  async readConfig(cwd: string): Promise<any> {
    const config = await super.readConfig(cwd);

    // VS Code uses standard settings.json format
    // No special structure required for agents
    return config;
  }

  /**
   * Write VS Code configuration
   */
  async writeConfig(cwd: string, config: any): Promise<void> {
    await super.writeConfig(cwd, config);
  }

  /**
   * Validate VS Code-specific requirements
   */
  async validateRequirements(cwd: string): Promise<void> {
    await super.validateRequirements(cwd);

    // VS Code-specific validations could go here
    // For now, we just use the base validation
  }

  /**
   * Get VS Code-specific help text
   */
  getHelpText(): string {
    let help = super.getHelpText();

    help += `VS Code-Specific Information:\n`;
    help += `  Configuration File: .vscode/settings.json\n`;
    help += `  Agent Format: Plain Markdown\n`;
    help += `  MCP Integration: Not yet implemented\n\n`;

    help += `Example Agent Structure:\n`;
    help += `  <!-- name: My Agent -->\n`;
    help += `  <!-- description: Agent description -->\n\n`;
    help += `  Agent content here...\n\n`;

    return help;
  }

  /**
   * Helper method to extract metadata from HTML comments
   */
  extractMetadataFromComments(content: string): any {
    const metadata: any = {};
    const commentRegex = /<!--\s*(\w+):\s*(.*?)\s*-->/g;
    let match;

    while ((match = commentRegex.exec(content)) !== null) {
      metadata[match[1]] = match[2];
    }

    return metadata;
  }

  /**
   * Helper method to remove metadata comments from content
   */
  removeMetadataComments(content: string): string {
    return content.replace(/<!--\s*\w+:\s*.*?\s*-->/g, '').trim();
  }

  /**
   * Helper method to update metadata comments in content
   */
  updateMetadataComments(content: string, updates: any): string {
    // Remove existing metadata comments
    const cleanContent = this.removeMetadataComments(content);

    // Add new metadata comments
    const metadataComment = Object.entries(updates)
      .map(([key, value]) => `<!-- ${key}: ${value} -->`)
      .join('\n');

    return `${metadataComment}\n\n${cleanContent}`;
  }
}
