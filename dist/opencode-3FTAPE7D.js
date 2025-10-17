import {
  BaseTransformer
} from "./chunk-B6EYWZ4T.js";

// src/transformers/opencode.ts
var OpenCodeTransformer = class extends BaseTransformer {
  constructor(config) {
    super(config);
  }
  /**
   * Transform agent content for OpenCode
   * OpenCode uses YAML front matter, so we preserve it
   * Remove name field as OpenCode doesn't use it
   */
  async transformAgentContent(content, metadata, sourcePath) {
    const { metadata: existingMetadata, content: baseContent } = await this.extractYamlFrontMatter(content);
    const { name, ...metadataWithoutName } = existingMetadata;
    if (metadata) {
      const { name: additionalName, ...additionalMetadataWithoutName } = metadata;
      const mergedMetadata = { ...metadataWithoutName, ...additionalMetadataWithoutName };
      return this.addYamlFrontMatter(baseContent, mergedMetadata);
    }
    return this.addYamlFrontMatter(baseContent, metadataWithoutName);
  }
  /**
   * Transform MCP server configuration for OpenCode
   * OpenCode expects MCP config under the 'mcp' key
   */
  transformMCPConfig(config) {
    return config;
  }
  /**
   * Read OpenCode configuration
   */
  async readConfig(cwd) {
    const config = await super.readConfig(cwd);
    if (!config.mcp) {
      config.mcp = {};
    }
    return config;
  }
  /**
   * Write OpenCode configuration
   */
  async writeConfig(cwd, config) {
    if (!config.mcp) {
      config.mcp = {};
    }
    await super.writeConfig(cwd, config);
  }
  /**
   * Validate OpenCode-specific requirements
   */
  async validateRequirements(cwd) {
    await super.validateRequirements(cwd);
  }
  /**
   * Get OpenCode-specific help text
   */
  getHelpText() {
    let help = super.getHelpText();
    help += `OpenCode-Specific Information:
`;
    help += `  Configuration File: opencode.jsonc
`;
    help += `  Schema: https://opencode.ai/config.json
`;
    help += `  Agent Format: Markdown with YAML front matter
`;
    help += `  MCP Integration: Automatic server discovery

`;
    help += `Example Agent Structure:
`;
    help += `  ---
`;
    help += `  name: "My Agent"
`;
    help += `  description: "Agent description"
`;
    help += `  ---

`;
    help += `  Agent content here...

`;
    return help;
  }
  /**
   * Helper method to extract agent metadata from YAML front matter
   */
  async extractAgentMetadata(content) {
    const { metadata } = await this.extractYamlFrontMatter(content);
    if (typeof metadata === "string") {
      try {
        return JSON.parse(metadata);
      } catch {
        return { raw: metadata };
      }
    }
    return metadata || {};
  }
  /**
   * Helper method to update agent metadata in YAML front matter
   */
  async updateAgentMetadata(content, updates) {
    const { metadata: existingMetadata, content: baseContent } = await this.extractYamlFrontMatter(content);
    const updatedMetadata = { ...existingMetadata, ...updates };
    return this.addYamlFrontMatter(baseContent, updatedMetadata);
  }
  /**
   * Helper method to check if content has valid YAML front matter
   */
  hasValidYamlFrontMatter(content) {
    const yamlRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    return yamlRegex.test(content);
  }
  /**
   * Helper method to ensure content has YAML front matter
   */
  async ensureYamlFrontMatter(content, defaultMetadata = {}) {
    if (this.hasValidYamlFrontMatter(content)) {
      return content;
    }
    return this.addYamlFrontMatter(content, defaultMetadata);
  }
};
export {
  OpenCodeTransformer
};
