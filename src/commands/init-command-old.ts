import { render } from 'ink';
import React from 'react';
import { InitFlowUI } from '../components/InitFlowUI.js';
import {
  getDefaultServers,
  getServersRequiringAPIKeys,
  getServersWithOptionalAPIKeys,
  MCP_SERVER_REGISTRY,
  type MCPServerID,
} from '../config/servers.js';
import { installAgents, installRules } from '../core/init.js';
import { targetManager } from '../core/target-manager.js';
import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { secretUtils } from '../utils/secret-utils.js';
import {
  targetSupportsMCPServers,
  validateTarget,
  getNestedProperty,
  setNestedProperty,
} from '../utils/target-config.js';

async function validateInitOptions(options: CommandOptions): Promise<void> {
  const targetId = await targetManager.resolveTarget({ target: options.target });
  options.target = targetId;

  try {
    validateTarget(targetId);
  } catch (error) {
    if (error instanceof Error) {
      throw new CLIError(error.message, 'UNSUPPORTED_TARGET');
    }
    throw error;
  }

  if (options.merge) {
    throw new CLIError('The --merge option is not supported with init command.', 'INVALID_OPTION');
  }
}

export const initCommand: CommandConfig = {
  name: 'init',
  description: 'Initialize project with Sylphx Flow development agents and MCP tools',
  options: [
    {
      flags: '--target <type>',
      description: `Force specific target (${targetManager.getImplementedTargetIDs().join(', ')}, default: opencode)`,
    },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without making changes' },
    { flags: '--clear', description: 'Clear obsolete items before processing' },
    { flags: '--no-mcp', description: 'Skip MCP tools installation' },
  ],
  handler: async (options: CommandOptions) => {
    await validateInitOptions(options);
    const targetId = options.target!;

    // Dry run - use old console output
    if (options.dryRun) {
      console.log('🚀 Sylphx Flow Setup (Dry Run)');
      console.log('======================');
      console.log(`🎯 Target: ${targetId}`);
      console.log('');

      if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
        const defaultServers = getDefaultServers();
        console.log('📦 Would install MCP tools:');
        console.log(`   • ${defaultServers.join(', ')}`);
      }

      console.log('📦 Would install agents');
      console.log('📦 Would install rules');
      console.log('\n✅ Dry run complete');
      return;
    }

    // Collect servers that need configuration
    const allServersNeedingConfiguration: MCPServerID[] = [];

    if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
      const serversNeedingKeys = getServersRequiringAPIKeys();
      const serversWithOptionalKeys = getServersWithOptionalAPIKeys();
      allServersNeedingConfiguration.push(...serversNeedingKeys, ...serversWithOptionalKeys);
    }

    // Run modern UI
    await new Promise<void>((resolve) => {
      const { waitUntilExit, clear } = render(
        React.createElement(InitFlowUI, {
          targetId,
          servers: allServersNeedingConfiguration,
          onComplete: async (serverConfigs) => {
            // Save MCP configurations
            if (targetSupportsMCPServers(targetId)) {
              const target = targetManager.getTarget(targetId);
              if (!target) {
                throw new Error(`Target not found: ${targetId}`);
              }

              const config = await target.readConfig(process.cwd());
              const mcpConfigPath = target.config.mcpConfigPath;
              const mcpSection = getNestedProperty(config, mcpConfigPath) || {};

              // Add configured servers
              for (const { id: serverId, values } of serverConfigs) {
                const server = MCP_SERVER_REGISTRY[serverId];
                const serverConfig_env =
                  server.config.type === 'local' ? server.config.environment : {};

                const updatedEnv = { ...serverConfig_env };
                for (const [key, value] of Object.entries(values)) {
                  if (value && value.trim() !== '') {
                    updatedEnv[key] = value;
                  }
                }

                mcpSection[server.name] = {
                  ...server.config,
                  environment: updatedEnv,
                };
              }

              // Add servers that don't need configuration
              const defaultServers = getDefaultServers();
              const serversNotNeedingKeys = defaultServers.filter(
                (server) => !allServersNeedingConfiguration.includes(server)
              );

              for (const serverId of serversNotNeedingKeys) {
                const server = MCP_SERVER_REGISTRY[serverId];
                mcpSection[server.name] = server.config;
              }

              setNestedProperty(config, mcpConfigPath, mcpSection);
              await target.writeConfig(process.cwd(), config);
            }

            // Setup secrets directory for OpenCode
            if (targetId === 'opencode') {
              await secretUtils.ensureSecretsDir(process.cwd());
              await secretUtils.addToGitignore(process.cwd());
            }

            // Install agents and rules
            await installAgents(options);
            await installRules(options);

            resolve();
          },
          onCancel: () => {
            console.log('\n❌ Setup cancelled');
            process.exit(0);
          },
        })
      );

      waitUntilExit().then(() => {
        clear();
        resolve();
      });
    });

    console.log('\n🎉 Setup complete! Start coding with Sylphx Flow.');
  },
};
