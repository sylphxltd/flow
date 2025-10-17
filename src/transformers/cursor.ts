import type { MCPServerConfigUnion } from '../types.js';
import type { TargetConfig } from '../types.js';
import { BaseTransformer } from './base.js';

/**
 * Cursor transformer implementation
 * Handles JSON agents and cursor.json configuration
 * Note: This is a placeholder for future implementation
 */
export class CursorTransformer extends BaseTransformer {
  constructor(config: TargetConfig) {
    super(config);
  }

  /**
   * Transform agent content for Cursor
   * Cursor uses JSON format, so we need to convert from YAML front matter
   */
  async transformAgentContent(content: string, metadata?: any, sourcePath?: string): Promise<string> {
    // Extract YAML front matter if present
    const { metadata: yamlMetadata, content: baseContent } = await this.extractYamlFrontMatter(content);

    // Combine YAML metadata with provided metadata
    const combinedMetadata = { ...yamlMetadata, ...metadata };

    // Create JSON agent structure
    const agentData = {
      name: combinedMetadata.name || 'Unnamed Agent',
      description: combinedMetadata.description || '',
      content: baseContent.trim(),
      ...combinedMetadata, // Include any other metadata fields
    };

    return JSON.stringify(agentData, null, 2);
  }

  /**
   * Transform MCP server configuration for Cursor
   * Note: MCP support for Cursor is not yet implemented
   */
  transformMCPConfig(config: MCPServerConfigUnion): any {
    // Cursor MCP integration is not yet implemented
    throw new Error('MCP server support for Cursor is not yet implemented');
  }

  /**
   * Read Cursor configuration
   */
  async readConfig(cwd: string): Promise<any> {
    const config = await super.readConfig(cwd);

    // Ensure the config has the expected structure for Cursor
    if (!config.rules) {
      config.rules = {};
    }

    return config;
  }

  /**
   * Write Cursor configuration
   */
  async writeConfig(cwd: string, config: any): Promise<void> {
    // Ensure the config has the expected structure for Cursor
    if (!config.rules) {
      config.rules = {};
    }

    await super.writeConfig(cwd, config);
  }

  /**
   * Validate Cursor-specific requirements
   */
  async validateRequirements(cwd: string): Promise<void> {
    await super.validateRequirements(cwd);

    // Cursor-specific validations could go here
    // For now, we just use the base validation
  }

  /**
   * Get Cursor-specific help text
   */
  getHelpText(): string {
    let help = super.getHelpText();

    help += `Cursor-Specific Information:\n`;
    help += `  Configuration File: cursor.json\n`;
    help += `  Agent Format: JSON\n`;
    help += `  MCP Integration: Not yet implemented\n\n`;

    help += `Example Agent Structure:\n`;
    help += `  {\n`;
    help += `    "name": "My Agent",\n`;
    help += `    "description": "Agent description",\n`;
    help += `    "content": "Agent content here..."\n`;
    help += `  }\n\n`;

    return help;
  }

  /**
   * Helper method to extract agent data from JSON content
   */
  extractAgentData(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON agent content: ${error}`);
    }
  }

  /**
   * Helper method to update agent data in JSON content
   */
  updateAgentData(content: string, updates: any): string {
    const agentData = this.extractAgentData(content);
    const updatedData = { ...agentData, ...updates };
    return JSON.stringify(updatedData, null, 2);
  }
}
