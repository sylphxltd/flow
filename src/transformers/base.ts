import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { MCPServerConfigUnion, TargetConfig, TargetTransformer } from '../types.js';

/**
 * Abstract base transformer that provides common functionality
 * for all target transformers
 */
export abstract class BaseTransformer implements TargetTransformer {
  protected config: TargetConfig;

  constructor(config: TargetConfig) {
    this.config = config;
  }

  /**
   * Transform agent content for the target
   * Must be implemented by concrete transformers
   */
  abstract transformAgentContent(content: string, metadata?: any, sourcePath?: string): Promise<string>;

  /**
   * Transform MCP server configuration for the target
   * Default implementation returns the config as-is
   */
  transformMCPConfig(config: MCPServerConfigUnion): any {
    return config;
  }

  /**
   * Get the configuration file path for the target
   */
  getConfigPath(cwd: string): string {
    return path.join(cwd, this.config.configFile);
  }

  /**
   * Read the target's configuration file
   * Default implementation reads JSON/JSONC files
   */
  async readConfig(cwd: string): Promise<any> {
    const configPath = this.getConfigPath(cwd);

    try {
      await fs.access(configPath);
    } catch {
      return {};
    }

    // Handle different file formats
    if (this.config.configFile.endsWith('.jsonc')) {
      const { readJSONCFile } = await import('../utils/jsonc.js');
      return readJSONCFile(configPath);
    } else if (this.config.configFile.endsWith('.json')) {
      const content = await fs.readFile(configPath, 'utf8');
      return JSON.parse(content);
    } else if (
      this.config.configFile.endsWith('.yaml') ||
      this.config.configFile.endsWith('.yml')
    ) {
      const content = await fs.readFile(configPath, 'utf8');
      // Note: You might want to add a YAML parser here
      throw new Error('YAML config files not yet supported');
    } else {
      throw new Error(`Unsupported config file format: ${this.config.configFile}`);
    }
  }

  /**
   * Write the target's configuration file
   * Default implementation writes JSON/JSONC files
   */
  async writeConfig(cwd: string, config: any): Promise<void> {
    const configPath = this.getConfigPath(cwd);

    // Ensure directory exists
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    // Handle different file formats
    if (this.config.configFile.endsWith('.jsonc')) {
      const { writeJSONCFile } = await import('../utils/jsonc.js');
      await writeJSONCFile(configPath, config, this.config.configSchema || undefined);
    } else if (this.config.configFile.endsWith('.json')) {
      const content = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, content, 'utf8');
    } else if (
      this.config.configFile.endsWith('.yaml') ||
      this.config.configFile.endsWith('.yml')
    ) {
      // Note: You might want to add a YAML stringifier here
      throw new Error('YAML config files not yet supported');
    } else {
      throw new Error(`Unsupported config file format: ${this.config.configFile}`);
    }
  }

  /**
   * Validate target-specific requirements
   * Default implementation checks basic requirements
   */
  async validateRequirements(cwd: string): Promise<void> {
    // Check if we can write to the agent directory
    const agentDir = path.join(cwd, this.config.agentDir);
    try {
      await fs.mkdir(agentDir, { recursive: true });

      // Test write permissions
      const testFile = path.join(agentDir, '.sylphx-test');
      await fs.writeFile(testFile, 'test', 'utf8');
      await fs.unlink(testFile);
    } catch (error) {
      throw new Error(`Cannot write to agent directory ${agentDir}: ${error}`);
    }

    // Check if we can write to the config file (if needed)
    if (this.config.installation.createConfigFile) {
      const configPath = this.getConfigPath(cwd);
      try {
        const configDir = path.dirname(configPath);
        await fs.mkdir(configDir, { recursive: true });

        // Test write permissions
        const testFile = path.join(configDir, '.sylphx-test');
        await fs.writeFile(testFile, 'test', 'utf8');
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
  getHelpText(): string {
    let help = '';

    help += `Agent Installation:\n`;
    help += `  Directory: ${this.config.agentDir}\n`;
    help += `  Extension: ${this.config.agentExtension}\n`;
    help += `  Format: ${this.config.agentFormat}\n`;
    help += `  Strip YAML: ${this.config.stripYaml ? 'Yes' : 'No'}\n`;
    help += `  Flatten Structure: ${this.config.flatten ? 'Yes' : 'No'}\n\n`;

    if (this.config.installation.supportedMcpServers) {
      help += `MCP Server Support:\n`;
      help += `  Config Path: ${this.config.mcpConfigPath}\n`;
      help += `  Supported: Yes\n\n`;
    } else {
      help += `MCP Server Support: Not yet implemented\n\n`;
    }

    return help;
  }

  /**
   * Helper method to extract YAML front matter from content
   */
  protected async extractYamlFrontMatter(content: string): Promise<{ metadata: any; content: string }> {
    const yamlRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(yamlRegex);

    if (match) {
      try {
        // Parse YAML content using the proper YAML library
        const parsedMetadata = parseYaml(match[1]);

        return {
          metadata: parsedMetadata,
          content: match[2],
        };
      } catch (error) {
        console.warn('Failed to parse YAML front matter:', error);
        return { metadata: {}, content: match[2] };
      }
    }

    return { metadata: {}, content };
  }

  /**
   * Helper method to add YAML front matter to content
   */
  protected async addYamlFrontMatter(content: string, metadata: any): Promise<string> {
    if (!metadata || Object.keys(metadata).length === 0) {
      return content;
    }

    try {
      // Use the YAML library to properly stringify the metadata
      const yamlStr = stringifyYaml(metadata);
      return `---\n${yamlStr}---\n\n${content}`;
    } catch (error) {
      console.warn('Failed to stringify YAML metadata:', error);
      // Fallback to JSON format (valid YAML)
      const yamlStr = JSON.stringify(metadata, null, 2);
      return `---\n${yamlStr}---\n\n${content}`;
    }
  }

  /**
   * Helper method to strip YAML front matter from content
   */
  protected async stripYamlFrontMatter(content: string): Promise<string> {
    const { content: strippedContent } = await this.extractYamlFrontMatter(content);
    return strippedContent;
  }

  /**
   * Helper method to flatten file paths
   */
  protected flattenPath(filePath: string): string {
    const parsed = path.parse(filePath);
    const dir = parsed.dir.replace(/[\/\\]/g, '-');
    return dir ? `${dir}-${parsed.name}` : parsed.name;
  }

  /**
   * Helper method to get agent file path
   */
  protected getAgentFilePath(sourcePath: string, agentDir: string): string {
    if (this.config.flatten) {
      const flattenedName = this.flattenPath(sourcePath);
      return path.join(agentDir, `${flattenedName}${this.config.agentExtension}`);
    } else {
      return path.join(agentDir, sourcePath);
    }
  }
}
