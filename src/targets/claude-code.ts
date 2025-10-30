import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import type { MCPServerConfigUnion, Target } from '../types.js';
import type { AgentMetadata, ClaudeCodeMetadata } from '../types/target-config.types.js';
import { CLIError } from '../utils/error-handler.js';
import { commandSecurity, sanitize } from '../utils/security.js';
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

  mcpServerConfig: {
    disableMemory: true,
    disableTime: true,
    disableProjectStartup: false,
    disableKnowledge: false,
    disableCodebase: true,
  },

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
      useSecretFiles: false,
    },
  },

  /**
   * Transform agent content for Claude Code
   * Convert OpenCode format to Claude Code format with proper name/description extraction
   */
  async transformAgentContent(
    content: string,
    metadata?: AgentMetadata,
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
  transformMCPConfig(config: MCPServerConfigUnion, _serverId?: string): Record<string, unknown> {
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
  async writeConfig(cwd: string, config: Record<string, unknown>): Promise<void> {
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
    // Sanitize and validate inputs
    const sanitizedSystemPrompt = sanitize.yamlContent(systemPrompt);
    // Remove dangerous control characters but don't limit length for user prompts
    const sanitizedUserPrompt = userPrompt.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Add summary request to system prompt
    const enhancedSystemPrompt = `${sanitizedSystemPrompt}

Please begin your response with a comprehensive summary of all the instructions and context provided above.`;

    if (options.dryRun) {
      console.log('Dry run: Would execute Claude Code with --system-prompt');
      console.log('System prompt to append length:', enhancedSystemPrompt.length, 'characters');
      console.log('User prompt length:', sanitizedUserPrompt.length, 'characters');
      console.log('✓ Dry run completed successfully');
      return;
    }

    try {
      // Build arguments
      const args = ['--dangerously-skip-permissions'];

      args.push('--system-prompt', enhancedSystemPrompt);
      if (options.verbose) {
        console.log('🚀 Executing Claude Code');
        console.log(`📝 System prompt length: ${enhancedSystemPrompt.length} characters`);
      }

      if (sanitizedUserPrompt.trim() !== '') {
        args.push(sanitizedUserPrompt);
      }

      if (options.verbose) {
        console.log(`📝 User prompt length: ${sanitizedUserPrompt.length} characters`);
      }

      // Use child_process directly to bypass security validation for this specific case
      // This is safe because we're controlling the command and just passing the prompt as an argument

      await new Promise<void>((resolve, reject) => {
        const child = spawn('claude', args, {
          stdio: 'inherit',
          shell: false,
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            const error = new Error(`Claude Code exited with code ${code}`) as any;
            error.code = code;
            reject(error);
          }
        });

        child.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new CLIError('Claude Code not found. Please install it first.', 'CLAUDE_NOT_FOUND');
      }
      if (error.code) {
        throw new CLIError(`Claude Code exited with code ${error.code}`, 'CLAUDE_ERROR');
      }
      throw new CLIError(`Failed to execute Claude Code: ${error.message}`, 'CLAUDE_ERROR');
    }
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

  /**
   * Update .claude/settings.local.json to approve MCP servers
   */
  async approveMCPServers(cwd: string, serverNames: string[]): Promise<void> {
    const settingsPath = path.join(cwd, '.claude', 'settings.local.json');

    try {
      // Read existing settings or create new
      let settings: Record<string, unknown> = {};

      try {
        const content = await fsPromises.readFile(settingsPath, 'utf8');
        settings = JSON.parse(content);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, will create new
      }

      // Get existing approved servers
      const existingServers = Array.isArray(settings.enabledMcpjsonServers)
        ? settings.enabledMcpjsonServers
        : [];

      // Merge with new servers (deduplicate)
      const allServers = [...new Set([...existingServers, ...serverNames])];

      // Update settings
      settings.enabledMcpjsonServers = allServers;

      // Ensure .claude directory exists
      await fsPromises.mkdir(path.dirname(settingsPath), { recursive: true });

      // Write updated settings
      await fsPromises.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
    } catch (error) {
      throw new Error(
        `Failed to approve MCP servers: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  /**
   * Transform rules content for Claude Code
   * Claude Code doesn't need front matter in rules files (CLAUDE.md)
   */
  async transformRulesContent(content: string): Promise<string> {
    return yamlUtils.stripFrontMatter(content);
  },

  /**
   * Setup Claude Code-specific configuration including hooks
   */
  async setup(
    cwd: string,
    options?: Record<string, unknown>
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await this.setupClaudeCodeHooks(cwd);
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Could not setup Claude Code hooks: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  /**
   * Setup Claude Code hooks for system information display
   */
  async setupClaudeCodeHooks(cwd: string): Promise<{ success: boolean; message?: string }> {
    const claudeConfigDir = path.join(cwd, '.claude');
    const settingsPath = path.join(claudeConfigDir, 'settings.json');

    try {
      // Ensure .claude directory exists
      if (!fs.existsSync(claudeConfigDir)) {
        fs.mkdirSync(claudeConfigDir, { recursive: true });
      }

      // Read existing settings or create new ones
      let settings = {};
      if (fs.existsSync(settingsPath)) {
        try {
          const settingsContent = fs.readFileSync(settingsPath, 'utf-8');
          settings = JSON.parse(settingsContent);
        } catch (error) {
          console.warn(
            chalk.yellow(
              '  Warning: Could not parse existing Claude Code settings, creating new ones'
            )
          );
        }
      }

      // Add or update hooks configuration
      settings = {
        ...settings,
        hooks: {
          ...((settings as any).hooks || {}),
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'npx -y github:sylphxltd/flow sysinfo --hook session',
                },
              ],
            },
          ],
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'npx -y github:sylphxltd/flow sysinfo --hook message',
                },
              ],
            },
          ],
        },
      };

      // Write updated settings
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      return {
        success: true,
        message: `Claude Code hooks configured: SessionStart (static info) + UserPromptSubmit (dynamic info)`,
      };
    } catch (error) {
      throw error;
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
