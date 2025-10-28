import fs from 'node:fs';
import path from 'node:path';
import type { MCPServerConfigUnion, Target } from '../types.js';
import type { AgentMetadata } from '../types/target-config.types.js';
import { secretUtils } from '../utils/secret-utils.js';
import { fileUtils, generateHelpText, pathUtils, yamlUtils } from '../utils/target-utils.js';
import { MCP_SERVER_REGISTRY } from '../config/servers.js';

/**
 * OpenCode target - composition approach with all original functionality
 */
export const opencodeTarget: Target = {
  id: 'opencode',
  name: 'OpenCode',
  description: 'OpenCode IDE with YAML front matter agents (.opencode/agent/*.md)',
  category: 'ide',
  isImplemented: true,
  isDefault: true,

  mcpServerConfig: {
    disableMemory: true, // OpenCode also doesn't need memory
    disableTime: false,
    disableProjectStartup: false,
    disableKnowledge: false,
    disableCodebase: false,
  },

  config: {
    agentDir: '.opencode/agent',
    agentExtension: '.md',
    agentFormat: 'yaml-frontmatter',
    stripYaml: false,
    flatten: false,
    configFile: 'opencode.jsonc',
    configSchema: 'https://opencode.ai/config.json',
    mcpConfigPath: 'mcp',
    rulesFile: 'AGENTS.md',
    installation: {
      createAgentDir: true,
      createConfigFile: true,
      supportedMcpServers: true,
      useSecretFiles: true,
    },
  },

  /**
   * Transform agent content for OpenCode
   * OpenCode uses YAML front matter, but removes name field as it doesn't use it
   */
  async transformAgentContent(
    content: string,
    metadata?: AgentMetadata,
    _sourcePath?: string
  ): Promise<string> {
    // For OpenCode, we preserve YAML front matter but remove name field
    const { metadata: existingMetadata, content: baseContent } =
      await yamlUtils.extractFrontMatter(content);

    // Remove name field from metadata
    const { name, ...metadataWithoutName } = existingMetadata;

    // If additional metadata is provided, merge it (but exclude name)
    if (metadata) {
      const { name: additionalName, ...additionalMetadataWithoutName } = metadata;
      const mergedMetadata = { ...metadataWithoutName, ...additionalMetadataWithoutName };
      return yamlUtils.addFrontMatter(baseContent, mergedMetadata);
    }

    // If no metadata provided, return content without name field
    return yamlUtils.addFrontMatter(baseContent, metadataWithoutName);
  },

  /**
   * Transform MCP server configuration for OpenCode
   * Convert from Claude Code's optimal format to OpenCode's format
   */
  transformMCPConfig(config: MCPServerConfigUnion, _serverId?: string): Record<string, unknown> {
    // Handle new Claude Code stdio format
    if (config.type === 'stdio') {
      // Convert Claude Code format to OpenCode format
      const openCodeConfig: Record<string, unknown> = {
        type: 'local',
        command: [config.command],
      };

      if (config.args && config.args.length > 0) {
        openCodeConfig.command.push(...config.args);
      }

      if (config.env) {
        openCodeConfig.environment = config.env;
      }

      return openCodeConfig;
    }

    // Handle new Claude Code http format
    if (config.type === 'http') {
      // Claude Code http format is compatible with OpenCode remote format
      return {
        type: 'remote',
        url: config.url,
        ...(config.headers && { headers: config.headers }),
      };
    }

    // Handle legacy OpenCode formats (pass through)
    if (config.type === 'local' || config.type === 'remote') {
      return config;
    }

    return config;
  },

  getConfigPath: (cwd: string) =>
    Promise.resolve(fileUtils.getConfigPath(opencodeTarget.config, cwd)),

  /**
   * Read OpenCode configuration with structure normalization
   */
  async readConfig(cwd: string): Promise<any> {
    const config = await fileUtils.readConfig(opencodeTarget.config, cwd);

    // Resolve any file references in the configuration
    const resolvedConfig = await secretUtils.resolveFileReferences(cwd, config);

    // Ensure the config has the expected structure
    if (!resolvedConfig.mcp) {
      resolvedConfig.mcp = {};
    }

    return resolvedConfig;
  },

  /**
   * Write OpenCode configuration with structure normalization
   */
  async writeConfig(cwd: string, config: Record<string, unknown>): Promise<void> {
    // Ensure the config has the expected structure for OpenCode
    if (!config.mcp) {
      config.mcp = {};
    }

    // Convert secrets to file references if secret files are enabled
    if (opencodeTarget.config.installation?.useSecretFiles) {
      
      // Process each MCP server's environment variables
      for (const [serverId, serverConfig] of Object.entries(config.mcp || {})) {
        if (serverConfig && typeof serverConfig === 'object' && 'environment' in serverConfig) {
          const envVars = serverConfig.environment as Record<string, string>;
          if (envVars && typeof envVars === 'object') {
            // Find the corresponding server definition to get secret env vars
            const serverDef = Object.values(MCP_SERVER_REGISTRY).find((s) => s.name === serverId);
            if (serverDef?.envVars) {
              // Separate secret and non-secret variables
              const secretEnvVars: Record<string, string> = {};
              const nonSecretEnvVars: Record<string, string> = {};

              for (const [key, value] of Object.entries(envVars)) {
                const envConfig = serverDef.envVars[key];
                if (envConfig?.secret && value && !secretUtils.isFileReference(value)) {
                  secretEnvVars[key] = value;
                } else {
                  nonSecretEnvVars[key] = value;
                }
              }

              // Convert only secret variables
              const convertedSecrets = await secretUtils.convertSecretsToFileReferences(
                cwd,
                secretEnvVars
              );

              // Merge back
              serverConfig.environment = { ...nonSecretEnvVars, ...convertedSecrets };
            }
          }
        }
      }
    }

    await fileUtils.writeConfig(opencodeTarget.config, cwd, config);
  },

  validateRequirements: (cwd: string) => fileUtils.validateRequirements(opencodeTarget.config, cwd),

  /**
   * Get detailed OpenCode-specific help text
   */
  getHelpText(): string {
    let help = generateHelpText(opencodeTarget.config);

    help += 'OpenCode-Specific Information:\n';
    help += '  Configuration File: opencode.jsonc\n';
    help += '  Schema: https://opencode.ai/config.json\n';
    help += '  Agent Format: Markdown with YAML front matter\n';
    help += '  MCP Integration: Automatic server discovery\n\n';

    help += 'Example Agent Structure:\n';
    help += '  ---\n';
    help += `  name: "My Agent"\n`;
    help += `  description: "Agent description"\n`;
    help += '  ---\n\n';
    help += '  Agent content here...\n\n';

    return help;
  },

  /**
   * Detect if this target is being used in the current environment
   */
  detectFromEnvironment(): boolean {
    try {
      const cwd = process.cwd();
      return fs.existsSync(path.join(cwd, 'opencode.jsonc'));
    } catch {
      return false;
    }
  },
};
