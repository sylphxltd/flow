import fs from 'node:fs';
import path from 'node:path';
import type { Target } from '../types.js';
import {
  fileUtils,
  generateHelpText,
  pathUtils,
  systemPromptUtils,
  yamlUtils,
} from '../utils/target-utils.js';

/**
 * Claude Code target - composition approach with all original functionality
 */
export const claudeCodeTarget: Target = {
  id: 'claude-code',
  name: 'Claude Code',
  description: 'Claude Code CLI with YAML front matter agents (.claude/agents/*.md)',
  category: 'cli',
  isImplemented: true,
  isDefault: false,

  config: {
    agentDir: '.claude/agents',
    agentExtension: '.md',
    agentFormat: 'yaml-frontmatter',
    stripYaml: false,
    flatten: false,
    configFile: '.mcp.json',
    configSchema: null,
    mcpConfigPath: 'mcpServers',
    rulesFile: 'CLAUDE.md',
    installation: {
      createAgentDir: true,
      createConfigFile: true,
      supportedMcpServers: true,
    },
  },

  /**
   * Transform agent content for Claude Code
   * Convert OpenCode format to Claude Code format with proper name/description extraction
   */
  async transformAgentContent(
    content: string,
    metadata?: any,
    sourcePath?: string
  ): Promise<string> {
    const { metadata: existingMetadata, content: baseContent } =
      await yamlUtils.extractFrontMatter(content);

    // Convert OpenCode format to Claude Code format
    const claudeCodeMetadata = convertToClaudeCodeFormat(existingMetadata, baseContent, sourcePath);

    // If additional metadata is provided, merge it
    if (metadata) {
      Object.assign(claudeCodeMetadata, metadata);
    }

    return yamlUtils.addFrontMatter(baseContent, claudeCodeMetadata);
  },

  /**
   * Transform MCP server configuration for Claude Code
   * Convert from various formats to Claude Code's optimal format
   */
  transformMCPConfig(config: any): any {
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
  },

  getConfigPath: (cwd: string) =>
    Promise.resolve(fileUtils.getConfigPath(claudeCodeTarget.config, cwd)),

  /**
   * Read Claude Code configuration with structure normalization
   */
  async readConfig(cwd: string): Promise<any> {
    const config = await fileUtils.readConfig(claudeCodeTarget.config, cwd);

    // Ensure the config has the expected structure for Claude Code
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    return config;
  },

  /**
   * Write Claude Code configuration with structure normalization
   */
  async writeConfig(cwd: string, config: any): Promise<void> {
    // Ensure the config has the expected structure for Claude Code
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    await fileUtils.writeConfig(claudeCodeTarget.config, cwd, config);
  },

  validateRequirements: (cwd: string) =>
    fileUtils.validateRequirements(claudeCodeTarget.config, cwd),

  /**
   * Get detailed Claude Code-specific help text
   */
  getHelpText(): string {
    let help = generateHelpText(claudeCodeTarget.config);

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
  },

  /**
   * Execute command using Claude Code with system prompt and user prompt
   */
  async executeCommand(
    systemPrompt: string,
    userPrompt: string,
    options: { verbose?: boolean; dryRun?: boolean } = {}
  ): Promise<void> {
    // Add summary request to system prompt
    const enhancedSystemPrompt = `${systemPrompt}

Please begin your response with a comprehensive summary of all the instructions and context provided above.`;

    if (options.dryRun) {
      console.log('🔍 Dry run: Would execute Claude Code with --append-system-prompt');
      console.log('📝 System prompt to append length:', enhancedSystemPrompt.length, 'characters');
      console.log('📝 User prompt length:', userPrompt.length, 'characters');
      console.log('✅ Dry run completed successfully');
      return;
    }

    const { spawn } = await import('node:child_process');
    const { CLIError } = await import('../utils/error-handler.js');

    return new Promise((resolve, reject) => {
      const args = ['--system-prompt', enhancedSystemPrompt, '--dangerously-skip-permissions'];

      if (userPrompt.trim() !== '') {
        args.push(userPrompt);
      }

      if (options.verbose) {
        console.log(`🚀 Executing Claude Code with system prompt`);
        console.log(`📝 System prompt length: ${enhancedSystemPrompt.length} characters`);
        console.log(`📝 User prompt length: ${userPrompt.length} characters`);
      }

      const child = spawn('claude', args, {
        stdio: 'inherit',
        shell: false,
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new CLIError(`Claude Code exited with code ${code}`, 'CLAUDE_ERROR'));
        }
      });

      child.on('error', (error) => {
        reject(new CLIError(`Failed to execute Claude Code: ${error.message}`, 'CLAUDE_NOT_FOUND'));
      });
    });
  },

  /**
   * Detect if this target is being used in the current environment
   */
  detectFromEnvironment(): boolean {
    try {
      const cwd = process.cwd();
      return fs.existsSync(path.join(cwd, '.mcp.json'));
    } catch {
      return false;
    }
  },
};

/**
 * Convert OpenCode frontmatter to Claude Code format
 */
function convertToClaudeCodeFormat(
  openCodeMetadata: any,
  content: string,
  sourcePath?: string
): any {
  // Use explicit name from metadata if available, otherwise extract from content or path
  const agentName =
    openCodeMetadata.name || pathUtils.extractAgentName(content, openCodeMetadata, sourcePath);

  // Extract description from metadata or content
  const description = openCodeMetadata.description || pathUtils.extractDescription(content);

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
