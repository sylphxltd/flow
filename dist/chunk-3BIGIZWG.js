// src/transformers/base.ts
import fs from "fs/promises";
import path from "path";
var BaseTransformer = class {
  config;
  constructor(config) {
    this.config = config;
  }
  /**
   * Transform MCP server configuration for the target
   * Default implementation returns the config as-is
   */
  transformMCPConfig(config) {
    return config;
  }
  /**
   * Get the configuration file path for the target
   */
  getConfigPath(cwd) {
    return path.join(cwd, this.config.configFile);
  }
  /**
   * Read the target's configuration file
   * Default implementation reads JSON/JSONC files
   */
  async readConfig(cwd) {
    const configPath = this.getConfigPath(cwd);
    try {
      await fs.access(configPath);
    } catch {
      return {};
    }
    if (this.config.configFile.endsWith(".jsonc")) {
      const { readJSONCFile } = await import("./jsonc-6K4NEAWM.js");
      return readJSONCFile(configPath);
    } else if (this.config.configFile.endsWith(".json")) {
      const content = await fs.readFile(configPath, "utf8");
      return JSON.parse(content);
    } else if (this.config.configFile.endsWith(".yaml") || this.config.configFile.endsWith(".yml")) {
      const content = await fs.readFile(configPath, "utf8");
      throw new Error("YAML config files not yet supported");
    } else {
      throw new Error(`Unsupported config file format: ${this.config.configFile}`);
    }
  }
  /**
   * Write the target's configuration file
   * Default implementation writes JSON/JSONC files
   */
  async writeConfig(cwd, config) {
    const configPath = this.getConfigPath(cwd);
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    if (this.config.configFile.endsWith(".jsonc")) {
      const { writeJSONCFile } = await import("./jsonc-6K4NEAWM.js");
      await writeJSONCFile(configPath, config, this.config.configSchema || void 0);
    } else if (this.config.configFile.endsWith(".json")) {
      const content = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, content, "utf8");
    } else if (this.config.configFile.endsWith(".yaml") || this.config.configFile.endsWith(".yml")) {
      throw new Error("YAML config files not yet supported");
    } else {
      throw new Error(`Unsupported config file format: ${this.config.configFile}`);
    }
  }
  /**
   * Validate target-specific requirements
   * Default implementation checks basic requirements
   */
  async validateRequirements(cwd) {
    const agentDir = path.join(cwd, this.config.agentDir);
    try {
      await fs.mkdir(agentDir, { recursive: true });
      const testFile = path.join(agentDir, ".sylphx-test");
      await fs.writeFile(testFile, "test", "utf8");
      await fs.unlink(testFile);
    } catch (error) {
      throw new Error(`Cannot write to agent directory ${agentDir}: ${error}`);
    }
    if (this.config.installation.createConfigFile) {
      const configPath = this.getConfigPath(cwd);
      try {
        const configDir = path.dirname(configPath);
        await fs.mkdir(configDir, { recursive: true });
        const testFile = path.join(configDir, ".sylphx-test");
        await fs.writeFile(testFile, "test", "utf8");
        await fs.unlink(testFile);
      } catch (error) {
        throw new Error(`Cannot write to config file location ${configPath}: ${error}`);
      }
    }
  }
  /**
   * Get target-specific help text
   * Default implementation provides basic information
   */
  getHelpText() {
    let help = "";
    help += `Agent Installation:
`;
    help += `  Directory: ${this.config.agentDir}
`;
    help += `  Extension: ${this.config.agentExtension}
`;
    help += `  Format: ${this.config.agentFormat}
`;
    help += `  Strip YAML: ${this.config.stripYaml ? "Yes" : "No"}
`;
    help += `  Flatten Structure: ${this.config.flatten ? "Yes" : "No"}

`;
    if (this.config.installation.supportedMcpServers) {
      help += `MCP Server Support:
`;
      help += `  Config Path: ${this.config.mcpConfigPath}
`;
      help += `  Supported: Yes

`;
    } else {
      help += `MCP Server Support: Not yet implemented

`;
    }
    return help;
  }
  /**
   * Helper method to extract YAML front matter from content
   */
  extractYamlFrontMatter(content) {
    const yamlRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(yamlRegex);
    if (match) {
      try {
        return {
          metadata: match[1],
          content: match[2]
        };
      } catch {
        return { metadata: {}, content };
      }
    }
    return { metadata: {}, content };
  }
  /**
   * Helper method to add YAML front matter to content
   */
  addYamlFrontMatter(content, metadata) {
    if (!metadata || Object.keys(metadata).length === 0) {
      return content;
    }
    const yamlStr = typeof metadata === "string" ? metadata : JSON.stringify(metadata, null, 2);
    return `---
${yamlStr}
---

${content}`;
  }
  /**
   * Helper method to strip YAML front matter from content
   */
  stripYamlFrontMatter(content) {
    const { content: strippedContent } = this.extractYamlFrontMatter(content);
    return strippedContent;
  }
  /**
   * Helper method to flatten file paths
   */
  flattenPath(filePath) {
    const parsed = path.parse(filePath);
    const dir = parsed.dir.replace(/[\/\\]/g, "-");
    return dir ? `${dir}-${parsed.name}` : parsed.name;
  }
  /**
   * Helper method to get agent file path
   */
  getAgentFilePath(sourcePath, agentDir) {
    if (this.config.flatten) {
      const flattenedName = this.flattenPath(sourcePath);
      return path.join(agentDir, `${flattenedName}${this.config.agentExtension}`);
    } else {
      return path.join(agentDir, sourcePath);
    }
  }
};

export {
  BaseTransformer
};
