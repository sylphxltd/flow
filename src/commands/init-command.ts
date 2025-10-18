import { getDefaultServers, getServersRequiringAPIKeys } from '../config/servers.js';
import { installAgents } from '../core/init.js';
import { targetManager } from '../core/target-manager.js';
import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import {
  addMCPServersToTarget,
  configureMCPServerForTarget,
  getTargetHelpText,
  targetSupportsMCPServers,
  validateTarget,
} from '../utils/target-config.js';

async function validateInitOptions(options: CommandOptions): Promise<void> {
  // Resolve target (use specified, detect, or default)
  const targetId = await targetManager.resolveTarget({ target: options.target });
  options.target = targetId;

  // Validate target is implemented
  try {
    validateTarget(targetId);
  } catch (error) {
    if (error instanceof Error) {
      throw new CLIError(error.message, 'UNSUPPORTED_TARGET');
    }
    throw error;
  }

  // Remove unsupported options for init
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
      description: `Force specific target (${targetManager.getImplementedTargets().join(', ')}, default: opencode)`,
    },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without making changes' },
    { flags: '--clear', description: 'Clear obsolete items before processing' },
    { flags: '--no-mcp', description: 'Skip MCP tools installation' },
  ],
  handler: async (options: CommandOptions) => {
    await validateInitOptions(options);
    const targetId = options.target!;

    console.log('🚀 Sylphx Flow Setup');
    console.log('======================');
    console.log(`🎯 Target: ${targetId}`);
    console.log('');

    // Install MCP tools by default (unless --no-mcp is specified)
    if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
      console.log('📦 Installing MCP tools...');
      const defaultServers = getDefaultServers();

      if (options.dryRun) {
        console.log('🔍 Dry run: Would install all MCP servers');
        console.log(`   • ${defaultServers.join(', ')}`);
      } else {
        // First, identify servers that need API keys and configure them
        const serversNeedingKeys = getServersRequiringAPIKeys();
        const serversWithKeys: string[] = [];
        const serversWithoutKeys: string[] = [];

        if (serversNeedingKeys.length > 0) {
          console.log('\n🔑 Some MCP tools require API keys:');

          // Configure API keys first, before installing (handles all 4 cases)
          for (const serverType of serversNeedingKeys) {
            const shouldKeepOrInstall = await configureMCPServerForTarget(
              process.cwd(),
              targetId,
              serverType
            );
            if (shouldKeepOrInstall) {
              serversWithKeys.push(serverType);
            } else {
              serversWithoutKeys.push(serverType);
            }
          }
        }

        // Get servers that don't need API keys
        const serversNotNeedingKeys = defaultServers.filter(
          (server) => !serversNeedingKeys.includes(server)
        );

        // Combine servers that don't need keys with servers that have keys
        const serversToInstall = [...serversNotNeedingKeys, ...serversWithKeys];

        if (serversToInstall.length > 0) {
          await addMCPServersToTarget(process.cwd(), targetId, serversToInstall as any);
          console.log(`✅ MCP tools installed: ${serversToInstall.join(', ')}`);
        }

        if (serversWithoutKeys.length > 0) {
          console.log(
            `⚠️  Removed or skipped MCP tools (no API keys provided): ${serversWithoutKeys.join(', ')}`
          );
          console.log('   You can install them later with: sylphx-flow mcp install <server-name>');
        }
      }
      console.log('');
    } else if (options.mcp !== false && !targetSupportsMCPServers(targetId)) {
      console.log('⚠️  MCP tools are not supported for this target');
      console.log('');
    }

    // Install agents
    await installAgents(options);

    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('📋 Next steps:');

    // Target-specific next steps
    const target = targetManager.getTargetDefinition(targetId);
    if (targetId === 'opencode') {
      console.log('   • Open OpenCode and start using your agents!');
      if (options.mcp !== false) {
        console.log('   • MCP tools will be automatically loaded by OpenCode');
      }
    } else {
      console.log(`   • Start using your agents with ${target.name}!`);
      console.log(`   • Run 'sylphx-flow init --help' for target-specific information`);
    }
  },
};
