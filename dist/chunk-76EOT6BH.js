// src/transformers/base.ts
import fs from "fs/promises";
import path from "path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
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
    }
    if (this.config.configFile.endsWith(".json")) {
      const content = await fs.readFile(configPath, "utf8");
      return JSON.parse(content);
    }
    if (this.config.configFile.endsWith(".yaml") || this.config.configFile.endsWith(".yml")) {
      const _content = await fs.readFile(configPath, "utf8");
      throw new Error("YAML config files not yet supported");
    }
    throw new Error(`Unsupported config file format: ${this.config.configFile}`);
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
    help += "Agent Installation:\n";
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
      help += "MCP Server Support:\n";
      help += `  Config Path: ${this.config.mcpConfigPath}
`;
      help += "  Supported: Yes\n\n";
    } else {
      help += "MCP Server Support: Not yet implemented\n\n";
    }
    return help;
  }
  /**
   * Helper method to extract YAML front matter from content
   */
  async extractYamlFrontMatter(content) {
    const yamlRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(yamlRegex);
    if (match) {
      try {
        const parsedMetadata = parseYaml(match[1]);
        return {
          metadata: parsedMetadata,
          content: match[2]
        };
      } catch (error) {
        console.warn("Failed to parse YAML front matter:", error);
        return { metadata: {}, content: match[2] };
      }
    }
    return { metadata: {}, content };
  }
  /**
   * Helper method to add YAML front matter to content
   */
  async addYamlFrontMatter(content, metadata) {
    if (!metadata || Object.keys(metadata).length === 0) {
      return content;
    }
    try {
      const yamlStr = stringifyYaml(metadata);
      return `---
${yamlStr}---

${content}`;
    } catch (error) {
      console.warn("Failed to stringify YAML metadata:", error);
      const yamlStr = JSON.stringify(metadata, null, 2);
      return `---
${yamlStr}---

${content}`;
    }
  }
  /**
   * Helper method to strip YAML front matter from content
   */
  async stripYamlFrontMatter(content) {
    const { content: strippedContent } = await this.extractYamlFrontMatter(content);
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
    }
    return path.join(agentDir, sourcePath);
  }
};

export {
  BaseTransformer
};
