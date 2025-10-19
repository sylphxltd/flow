import {
  BaseTransformer
} from "./chunk-76EOT6BH.js";

// src/transformers/opencode.ts
var OpenCodeTransformer = class extends BaseTransformer {
  /**
   * Transform agent content for OpenCode
   * OpenCode uses YAML front matter, so we preserve it
   * Remove name field as OpenCode doesn't use it
   */
  async transformAgentContent(content, metadata, _sourcePath) {
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
   * Convert from Claude Code's optimal format to OpenCode's format
   */
  transformMCPConfig(config) {
    if (config.type === "stdio") {
      const openCodeConfig = {
        type: "local",
        command: [config.command]
      };
      if (config.args && config.args.length > 0) {
        openCodeConfig.command.push(...config.args);
      }
      if (config.env) {
        openCodeConfig.environment = config.env;
      }
      return openCodeConfig;
    }
    if (config.type === "http") {
      return {
        type: "remote",
        url: config.url,
        ...config.headers && { headers: config.headers }
      };
    }
    if (config.type === "local" || config.type === "remote") {
      return config;
    }
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
    help += "OpenCode-Specific Information:\n";
    help += "  Configuration File: opencode.jsonc\n";
    help += "  Schema: https://opencode.ai/config.json\n";
    help += "  Agent Format: Markdown with YAML front matter\n";
    help += "  MCP Integration: Automatic server discovery\n\n";
    help += "Example Agent Structure:\n";
    help += "  ---\n";
    help += `  name: "My Agent"
`;
    help += `  description: "Agent description"
`;
    help += "  ---\n\n";
    help += "  Agent content here...\n\n";
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
