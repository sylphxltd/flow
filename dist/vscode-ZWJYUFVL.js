import {
  BaseTransformer
} from "./chunk-76EOT6BH.js";

// src/transformers/vscode.ts
var VSCodeTransformer = class extends BaseTransformer {
  /**
   * Transform agent content for VS Code
   * VS Code uses plain markdown without YAML front matter
   */
  async transformAgentContent(content, metadata, _sourcePath) {
    const { content: baseContent } = await this.extractYamlFrontMatter(content);
    let transformedContent = baseContent;
    if (metadata && Object.keys(metadata).length > 0) {
      const metadataComment = Object.entries(metadata).map(([key, value]) => `<!-- ${key}: ${value} -->`).join("\n");
      transformedContent = `${metadataComment}

${baseContent}`;
    }
    return transformedContent;
  }
  /**
   * Transform MCP server configuration for VS Code
   * Note: MCP support for VS Code is not yet implemented
   */
  transformMCPConfig(_config) {
    throw new Error("MCP server support for VS Code is not yet implemented");
  }
  /**
   * Read VS Code configuration
   */
  async readConfig(cwd) {
    const config = await super.readConfig(cwd);
    return config;
  }
  /**
   * Write VS Code configuration
   */
  async writeConfig(cwd, config) {
    await super.writeConfig(cwd, config);
  }
  /**
   * Validate VS Code-specific requirements
   */
  async validateRequirements(cwd) {
    await super.validateRequirements(cwd);
  }
  /**
   * Get VS Code-specific help text
   */
  getHelpText() {
    let help = super.getHelpText();
    help += "VS Code-Specific Information:\n";
    help += "  Configuration File: .vscode/settings.json\n";
    help += "  Agent Format: Plain Markdown\n";
    help += "  MCP Integration: Not yet implemented\n\n";
    help += "Example Agent Structure:\n";
    help += "  <!-- name: My Agent -->\n";
    help += "  <!-- description: Agent description -->\n\n";
    help += "  Agent content here...\n\n";
    return help;
  }
  /**
   * Helper method to extract metadata from HTML comments
   */
  extractMetadataFromComments(content) {
    const metadata = {};
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
  removeMetadataComments(content) {
    return content.replace(/<!--\s*\w+:\s*.*?\s*-->/g, "").trim();
  }
  /**
   * Helper method to update metadata comments in content
   */
  updateMetadataComments(content, updates) {
    const cleanContent = this.removeMetadataComments(content);
    const metadataComment = Object.entries(updates).map(([key, value]) => `<!-- ${key}: ${value} -->`).join("\n");
    return `${metadataComment}

${cleanContent}`;
  }
};
export {
  VSCodeTransformer
};
