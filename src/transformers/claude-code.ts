import type { MCPServerConfigUnion } from '../types.js';
import type { TargetConfig } from '../types.js';
import { BaseTransformer } from './base.js';

/**
 * Claude Code transformer implementation
 * Handles YAML front matter agents and .mcp.json configuration
 */
export class ClaudeCodeTransformer extends BaseTransformer {
  /**
   * Transform agent content for Claude Code
   * Claude Code uses YAML front matter with specific fields
   */
  async transformAgentContent(
    content: string,
    metadata?: any,
    sourcePath?: string
  ): Promise<string> {
    const { metadata: existingMetadata, content: baseContent } =
      await this.extractYamlFrontMatter(content);

    // Convert OpenCode format to Claude Code format
    const claudeCodeMetadata = this.convertToClaudeCodeFormat(
      existingMetadata,
      baseContent,
      sourcePath
    );

    // If additional metadata is provided, merge it
    if (metadata) {
      Object.assign(claudeCodeMetadata, metadata);
    }

    return this.addYamlFrontMatter(baseContent, claudeCodeMetadata);
  }

  /**
   * Convert OpenCode frontmatter to Claude Code format
   */
  private convertToClaudeCodeFormat(
    openCodeMetadata: any,
    content: string,
    sourcePath?: string
  ): any {
    // Use explicit name from metadata if available, otherwise extract from content or path
    const agentName =
      openCodeMetadata.name || this.extractAgentName(content, openCodeMetadata, sourcePath);

    // Extract description from metadata or content
    const description = openCodeMetadata.description || this.extractDescription(content);

    // Only keep supported fields for Claude Code
    const result: any = {
      name: agentName,
      description: description,
    };

    // Only add model if it exists and is not 'inherit' (default)
    if (openCodeMetadata.model && openCodeMetadata.model !== 'inherit') {
      result.model = openCodeMetadata.model;
    }

    // Remove unsupported fields that might cause issues
    // - tools: removed to allow all tools by default
    // - mode: not supported by Claude Code
    // - temperature: not supported by Claude Code
    // - Other custom fields should also be removed for compatibility

    return result;
  }

  /**
   * Extract agent name from content, file path, or generate one
   */
  private extractAgentName(content: string, metadata: any, sourcePath?: string): string {
    // Try to extract from file path first (most reliable)
    if (sourcePath) {
      const pathName = this.extractNameFromPath(sourcePath);
      if (pathName) {
        return pathName;
      }
    }

    // Try to extract from content title
    const titleMatch = content.match(/^#\s+(.+?)(?:\s+Agent)?$/m);
    if (titleMatch) {
      const title = titleMatch[1].trim().toLowerCase();
      // Convert to kebab-case and add appropriate suffix
      return (
        title.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') +
        (title.includes('agent') ? '' : '-agent')
      );
    }

    // Try to extract from filename or description
    if (metadata.description) {
      const desc = metadata.description.toLowerCase();
      if (desc.includes('coder')) {
        return 'code-implementation-agent';
      }
      if (desc.includes('reviewer')) {
        return 'code-reviewer';
      }
      if (desc.includes('planner')) {
        return 'development-planner';
      }
      if (desc.includes('researcher')) {
        return 'research-specialist';
      }
      if (desc.includes('tester')) {
        return 'quality-tester';
      }
      if (desc.includes('analyze')) {
        return 'analysis-specialist';
      }
      if (desc.includes('orchestrator')) {
        return 'development-orchestrator';
      }
    }

    // Default fallback
    return 'development-agent';
  }

  /**
   * Extract agent name from file path
   */
  private extractNameFromPath(sourcePath: string): string | null {
    if (!sourcePath) {
      return null;
    }

    // Remove .md extension and convert to kebab-case
    const pathWithoutExt = sourcePath.replace(/\.md$/, '');

    // Extract filename from path
    const filename = pathWithoutExt.split('/').pop() || pathWithoutExt;

    // Convert to lowercase kebab-case
    const kebabName = filename
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Handle specific patterns
    if (kebabName.includes('constitution')) {
      return 'sdd-constitution';
    }
    if (kebabName.includes('implement')) {
      return 'sdd-implement';
    }
    if (kebabName.includes('clarify')) {
      return 'sdd-clarify';
    }
    if (kebabName.includes('release')) {
      return 'sdd-release';
    }
    if (kebabName.includes('task')) {
      return 'sdd-task';
    }
    if (kebabName.includes('plan')) {
      return 'sdd-plan';
    }
    if (kebabName.includes('specify')) {
      return 'sdd-specify';
    }
    if (kebabName.includes('analyze')) {
      return 'sdd-analyze';
    }
    if (kebabName.includes('orchestrator')) {
      return 'sdd-development-orchestrator';
    }

    if (kebabName.includes('coder')) {
      return 'core-coder';
    }
    if (kebabName.includes('planner')) {
      return 'core-planner';
    }
    if (kebabName.includes('researcher')) {
      return 'core-researcher';
    }
    if (kebabName.includes('reviewer')) {
      return 'core-reviewer';
    }
    if (kebabName.includes('tester')) {
      return 'core-tester';
    }

    if (kebabName.includes('scout')) {
      return 'hive-mind-scout-explorer';
    }
    if (kebabName.includes('collective')) {
      return 'hive-mind-collective-intelligence-coordinator';
    }
    if (kebabName.includes('worker')) {
      return 'hive-mind-worker-specialist';
    }
    if (kebabName.includes('memory')) {
      return 'hive-mind-swarm-memory-manager';
    }
    if (kebabName.includes('queen')) {
      return 'hive-mind-queen-coordinator';
    }

    // Return the kebab-case name if no specific pattern matched
    return kebabName || null;
  }

  /**
   * Extract description from metadata or content
   */
  private extractDescription(content: string): string {
    // Try to find the first paragraph after the title
    const firstParagraph = content.match(/^#\s+.+?\n\n(.+?)(?:\n\n|\n#|$)/s);
    if (firstParagraph) {
      return firstParagraph[1].trim().replace(/\n+/g, ' ');
    }

    return 'Development agent for specialized tasks';
  }

  /**
   * Transform MCP server configuration for Claude Code
   * Convert from various formats to Claude Code's optimal format
   */
  transformMCPConfig(config: MCPServerConfigUnion): any {
    // Handle legacy OpenCode 'local' type
    if (config.type === 'local') {
      // Convert OpenCode 'local' array command to Claude Code format
      const [command, ...args] = config.command;
      return {
        type: 'stdio',
        command,
        ...(args && args.length > 0 && { args }),
        ...(config.environment && { env: config.environment }),
      };
    }

    // Handle new stdio format (already optimized for Claude Code)
    if (config.type === 'stdio') {
      return {
        type: 'stdio',
        command: config.command,
        ...(config.args && config.args.length > 0 && { args: config.args }),
        ...(config.env && { env: config.env }),
      };
    }

    // Handle legacy OpenCode 'remote' type
    if (config.type === 'remote') {
      return {
        type: 'http',
        url: config.url,
        ...(config.headers && { headers: config.headers }),
      };
    }

    // Handle new http format (already optimized for Claude Code)
    if (config.type === 'http') {
      return {
        type: 'http',
        url: config.url,
        ...(config.headers && { headers: config.headers }),
      };
    }

    return config;
  }

  /**
   * Read Claude Code configuration
   */
  async readConfig(cwd: string): Promise<any> {
    const config = await super.readConfig(cwd);

    // Ensure the config has the expected structure for Claude Code
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    return config;
  }

  /**
   * Write Claude Code configuration
   */
  async writeConfig(cwd: string, config: any): Promise<void> {
    // Ensure the config has the expected structure for Claude Code
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    await super.writeConfig(cwd, config);
  }

  /**
   * Validate Claude Code-specific requirements
   */
  async validateRequirements(cwd: string): Promise<void> {
    await super.validateRequirements(cwd);

    // Claude Code-specific validations could go here
    // For now, we just use the base validation
  }

  /**
   * Get Claude Code-specific help text
   */
  getHelpText(): string {
    let help = super.getHelpText();

    help += 'Claude Code-Specific Information:\n';
    help += '  Configuration File: .mcp.json\n';
    help += '  Agent Format: Markdown with YAML front matter\n';
    help += '  MCP Integration: Full server support\n\n';

    help += 'Example Agent Structure:\n';
    help += '  ---\n';
    help += `  name: "code-reviewer"\n`;
    help += `  description: "Expert code review specialist"\n`;
    help += '  ---\n\n';
    help += '  Agent content here...\n\n';
    help += `Note: Only 'name' and 'description' fields are supported.\n`;
    help += 'Tools field omitted to allow all tools by default (whitelist model limitation).\n';
    help += 'Unsupported fields (mode, temperature, etc.) are automatically removed.\n\n';

    help += 'Example MCP Configuration:\n';
    help += '  {\n';
    help += `    "mcpServers": {\n`;
    help += `      "filesystem": {\n`;
    help += `        "type": "stdio",\n`;
    help += `        "command": "npx",\n`;
    help += `        "args": ["@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"]\n`;
    help += '      },\n';
    help += `      "git": {\n`;
    help += `        "type": "stdio",\n`;
    help += `        "command": "npx",\n`;
    help += `        "args": ["@modelcontextprotocol/server-git", "."],\n`;
    help += `        "env": {\n`;
    help += `          "GIT_TRACE": "1"\n`;
    help += '        }\n';
    help += '      },\n';
    help += `      "api-server": {\n`;
    help += `        "type": "http",\n`;
    help += `        "url": "https://api.example.com/mcp",\n`;
    help += `        "headers": {\n`;
    help += `          "Authorization": "Bearer $API_KEY"\n`;
    help += '        }\n';
    help += '      }\n';
    help += '    }\n';
    help += '  }\n\n';
    help +=
      'Note: Environment variables can be expanded in command, args, env, url, and headers.\n\n';

    return help;
  }

  /**
   * Helper method to extract agent metadata from YAML front matter
   */
  async extractAgentMetadata(content: string): Promise<any> {
    const { metadata } = await this.extractYamlFrontMatter(content);

    if (typeof metadata === 'string') {
      try {
        // Try to parse as JSON first
        return JSON.parse(metadata);
      } catch {
        // If not JSON, return as string
        return { raw: metadata };
      }
    }

    return metadata || {};
  }

  /**
   * Helper method to update agent metadata in YAML front matter
   */
  async updateAgentMetadata(content: string, updates: any): Promise<string> {
    const { metadata: existingMetadata, content: baseContent } =
      await this.extractYamlFrontMatter(content);
    const updatedMetadata = { ...existingMetadata, ...updates };
    return this.addYamlFrontMatter(baseContent, updatedMetadata);
  }

  /**
   * Helper method to check if content has valid YAML front matter
   */
  hasValidYamlFrontMatter(content: string): boolean {
    const yamlRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    return yamlRegex.test(content);
  }

  /**
   * Helper method to ensure content has YAML front matter
   */
  async ensureYamlFrontMatter(content: string, defaultMetadata: any = {}): Promise<string> {
    if (this.hasValidYamlFrontMatter(content)) {
      return content;
    }

    return this.addYamlFrontMatter(content, defaultMetadata);
  }

  /**
   * Helper method to validate Claude Code agent front matter
   */
  validateClaudeCodeFrontMatter(metadata: any): boolean {
    // Check for required fields according to Claude Code specification
    const requiredFields = ['name', 'description'];

    if (typeof metadata !== 'object' || metadata === null) {
      return false;
    }

    for (const field of requiredFields) {
      if (!metadata[field]) {
        return false;
      }
    }

    // Validate tools field if present
    if (metadata.tools && !Array.isArray(metadata.tools)) {
      return false;
    }

    return true;
  }

  /**
   * Helper method to normalize Claude Code agent front matter
   */
  normalizeClaudeCodeFrontMatter(metadata: any): any {
    const normalized = { ...metadata };

    // Ensure tools is an array
    if (normalized.tools && typeof normalized.tools === 'string') {
      normalized.tools = [normalized.tools];
    }

    // Set default model if not specified
    if (!normalized.model) {
      normalized.model = 'inherit';
    }

    return normalized;
  }
}
