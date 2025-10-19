import {
  BaseTransformer
} from "./chunk-76EOT6BH.js";

// src/transformers/cursor.ts
var CursorTransformer = class extends BaseTransformer {
  /**
   * Transform agent content for Cursor
   * Cursor uses JSON format, so we need to convert from YAML front matter
   */
  async transformAgentContent(content, metadata, _sourcePath) {
    const { metadata: yamlMetadata, content: baseContent } = await this.extractYamlFrontMatter(content);
    const combinedMetadata = { ...yamlMetadata, ...metadata };
    const agentData = {
      name: combinedMetadata.name || "Unnamed Agent",
      description: combinedMetadata.description || "",
      content: baseContent.trim(),
      ...combinedMetadata
      // Include any other metadata fields
    };
    return JSON.stringify(agentData, null, 2);
  }
  /**
   * Transform MCP server configuration for Cursor
   * Note: MCP support for Cursor is not yet implemented
   */
  transformMCPConfig(_config) {
    throw new Error("MCP server support for Cursor is not yet implemented");
  }
  /**
   * Read Cursor configuration
   */
  async readConfig(cwd) {
    const config = await super.readConfig(cwd);
    if (!config.rules) {
      config.rules = {};
    }
    return config;
  }
  /**
   * Write Cursor configuration
   */
  async writeConfig(cwd, config) {
    if (!config.rules) {
      config.rules = {};
    }
    await super.writeConfig(cwd, config);
  }
  /**
   * Validate Cursor-specific requirements
   */
  async validateRequirements(cwd) {
    await super.validateRequirements(cwd);
  }
  /**
   * Get Cursor-specific help text
   */
  getHelpText() {
    let help = super.getHelpText();
    help += "Cursor-Specific Information:\n";
    help += "  Configuration File: cursor.json\n";
    help += "  Agent Format: JSON\n";
    help += "  MCP Integration: Not yet implemented\n\n";
    help += "Example Agent Structure:\n";
    help += "  {\n";
    help += `    "name": "My Agent",
`;
    help += `    "description": "Agent description",
`;
    help += `    "content": "Agent content here..."
`;
    help += "  }\n\n";
    return help;
  }
  /**
   * Helper method to extract agent data from JSON content
   */
  extractAgentData(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON agent content: ${error}`);
    }
  }
  /**
   * Helper method to update agent data in JSON content
   */
  updateAgentData(content, updates) {
    const agentData = this.extractAgentData(content);
    const updatedData = { ...agentData, ...updates };
    return JSON.stringify(updatedData, null, 2);
  }
};
export {
  CursorTransformer
};
