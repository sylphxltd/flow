import type { TargetConfig } from '../types.js';

/**
 * Claude Code transformer - converts agent content and MCP configuration for Claude Code format
 */
export class ClaudeCodeTransformer {
  constructor(private config: TargetConfig) {}

  /**
   * Transform agent content for Claude Code
   */
  async transformAgentContent(content: string): Promise<string> {
    const yamlUtils = await import('../utils/target-utils.js').then((m) => m.yamlUtils);
    const { metadata, content: baseContent } = await yamlUtils.extractFrontMatter(content);

    // Extract name from metadata or content title
    let name = metadata?.name;
    if (!name) {
      const titleMatch = baseContent.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        name = titleMatch[1].toLowerCase().replace(/\s+/g, '-');
      }
    }

    // Build new frontmatter with only Claude Code supported fields
    const newMetadata: any = {};

    if (name) {
      newMetadata.name = name;
    }

    if (metadata?.description) {
      newMetadata.description = metadata.description;
    }

    if (metadata?.model && metadata.model !== 'inherit') {
      newMetadata.model = metadata.model;
    }

    // Rebuild content
    if (Object.keys(newMetadata).length > 0) {
      const yaml = await import('yaml').then((m) => m.default);
      const frontmatter = yaml.stringify(newMetadata).trim();
      return `---\n${frontmatter}\n---\n\n${baseContent}`;
    }

    return baseContent;
  }

  /**
   * Transform MCP configuration for Claude Code
   */
  transformMCPConfig(config: any): any {
    // If it's already in Claude Code format, return as-is
    if (config.type === 'stdio' || config.type === 'http') {
      return config;
    }

    // Convert OpenCode local format to Claude Code stdio
    if (config.type === 'local') {
      const result: any = {
        type: 'stdio',
        command: config.command[0],
        args: config.command.slice(1),
      };

      if (config.environment) {
        result.env = config.environment;
      }

      return result;
    }

    // Convert OpenCode remote format to Claude Code http
    if (config.type === 'remote') {
      const result: any = {
        type: 'http',
        url: config.url,
      };

      if (config.headers) {
        result.headers = config.headers;
      }

      return result;
    }

    return config;
  }
}
