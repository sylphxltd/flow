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
        await addMCPServersToTarget(process.cwd(), targetId, defaultServers);

        // Prompt for API keys for servers that need them
        const serversNeedingKeys = getServersRequiringAPIKeys();

        if (serversNeedingKeys.length > 0) {
          console.log('\n🔑 Some MCP tools require API keys:');

          // Update configs with API keys
          for (const serverType of serversNeedingKeys) {
            await configureMCPServerForTarget(process.cwd(), targetId, serverType);
          }
        }

        console.log('✅ MCP tools configured');
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
