import {
  BaseTransformer
} from "./chunk-3BIGIZWG.js";

// src/transformers/claude-code.ts
var ClaudeCodeTransformer = class extends BaseTransformer {
  constructor(config) {
    super(config);
  }
  /**
   * Transform agent content for Claude Code
   * Claude Code uses YAML front matter with specific fields
   */
  transformAgentContent(content, metadata) {
    if (metadata) {
      const { metadata: existingMetadata, content: baseContent } = this.extractYamlFrontMatter(content);
      const mergedMetadata = { ...existingMetadata, ...metadata };
      return this.addYamlFrontMatter(baseContent, mergedMetadata);
    }
    return content;
  }
  /**
   * Transform MCP server configuration for Claude Code
   * Claude Code expects MCP config under the 'mcpServers' key
   */
  transformMCPConfig(config) {
    return config;
  }
  /**
   * Read Claude Code configuration
   */
  async readConfig(cwd) {
    const config = await super.readConfig(cwd);
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    return config;
  }
  /**
   * Write Claude Code configuration
   */
  async writeConfig(cwd, config) {
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    await super.writeConfig(cwd, config);
  }
  /**
   * Validate Claude Code-specific requirements
   */
  async validateRequirements(cwd) {
    await super.validateRequirements(cwd);
  }
  /**
   * Get Claude Code-specific help text
   */
  getHelpText() {
    let help = super.getHelpText();
    help += `Claude Code-Specific Information:
`;
    help += `  Configuration File: .mcp.json
`;
    help += `  Agent Format: Markdown with YAML front matter
`;
    help += `  MCP Integration: Full server support

`;
    help += `Example Agent Structure:
`;
    help += `  ---
`;
    help += `  name: "code-reviewer"
`;
    help += `  description: "Expert code review specialist"
`;
    help += `  tools: ["Read", "Grep", "Glob", "Bash"]
`;
    help += `  model: "inherit"
`;
    help += `  ---

`;
    help += `  Agent content here...

`;
    help += `Example MCP Configuration:
`;
    help += `  {
`;
    help += `    "mcpServers": {
`;
    help += `      "api-server": {
`;
    help += `        "type": "http",
`;
    help += `        "url": "https://api.example.com/mcp",
`;
    help += `        "headers": {
`;
    help += `          "Authorization": "Bearer YOUR_API_KEY"
`;
    help += `        }
`;
    help += `      }
`;
    help += `    }
`;
    help += `  }

`;
    return help;
  }
  /**
   * Helper method to extract agent metadata from YAML front matter
   */
  extractAgentMetadata(content) {
    const { metadata } = this.extractYamlFrontMatter(content);
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
  updateAgentMetadata(content, updates) {
    const { metadata: existingMetadata, content: baseContent } = this.extractYamlFrontMatter(content);
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
  ensureYamlFrontMatter(content, defaultMetadata = {}) {
    if (this.hasValidYamlFrontMatter(content)) {
      return content;
    }
    return this.addYamlFrontMatter(content, defaultMetadata);
  }
  /**
   * Helper method to validate Claude Code agent front matter
   */
  validateClaudeCodeFrontMatter(metadata) {
    const requiredFields = ["name", "description"];
    if (typeof metadata !== "object" || metadata === null) {
      return false;
    }
    for (const field of requiredFields) {
      if (!metadata[field]) {
        return false;
      }
    }
    if (metadata.tools && !Array.isArray(metadata.tools)) {
      return false;
    }
    return true;
  }
  /**
   * Helper method to normalize Claude Code agent front matter
   */
  normalizeClaudeCodeFrontMatter(metadata) {
    const normalized = { ...metadata };
    if (normalized.tools && typeof normalized.tools === "string") {
      normalized.tools = [normalized.tools];
    }
    if (!normalized.model) {
      normalized.model = "inherit";
    }
    return normalized;
  }
};
export {
  ClaudeCodeTransformer
};
