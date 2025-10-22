import type { TargetConfig } from '../types.js';

/**
 * OpenCode transformer - converts agent content and MCP configuration for OpenCode format
 */
export class OpenCodeTransformer {
  constructor(private config: TargetConfig) {}

  /**
   * Transform agent content for OpenCode
   */
  async transformAgentContent(content: string): Promise<string> {
    const yamlUtils = await import('../utils/target-utils.js').then((m) => m.yamlUtils);
    const { metadata, content: baseContent } = await yamlUtils.extractFrontMatter(content);

    // Build new frontmatter without the 'name' field (OpenCode removes it)
    const newMetadata: any = {};

    // Copy all metadata except 'name'
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        if (key !== 'name') {
          newMetadata[key] = value;
        }
      }
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
   * Transform MCP configuration for OpenCode
   */
  transformMCPConfig(config: any): any {
    // If it's already in OpenCode format, return as-is
    if (config.type === 'local' || config.type === 'remote') {
      return config;
    }

    // Convert Claude Code stdio format to OpenCode local
    if (config.type === 'stdio') {
      const result: any = {
        type: 'local',
        command: [config.command],
      };

      if (config.args && config.args.length > 0) {
        result.command.push(...config.args);
      }

      if (config.env) {
        result.environment = config.env;
      }

      return result;
    }

    // Convert Claude Code http format to OpenCode remote
    if (config.type === 'http') {
      const result: any = {
        type: 'remote',
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
