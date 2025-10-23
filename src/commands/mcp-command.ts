import { getAllServerIDs, getServersRequiringAPIKeys } from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import type { CommandConfig, CommandHandler, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import {
  addMCPServersToTarget,
  configureMCPServerForTarget,
  listMCPServersForTarget,
  targetSupportsMCPServers,
  validateTarget,
} from '../utils/target-config.js';
import { startSylphxFlowMCPServer } from '../servers/sylphx-flow-mcp-server.js';

// MCP start handler
const mcpStartHandler: CommandHandler = async (options: CommandOptions) => {
  // Apply presets if specified
  let config = {
    enableMemory: options.memory === true,
    enableTime: options.time === true,
    enableProjectStartup: options.projectStartup === true,
    enableKnowledge: options.knowledge === true,
    knowledgeAsTools: options.knowledgeAsTools === true,
  };

  if (options.preset) {
    switch (options.preset) {
      case 'opencode':
        config = {
          enableMemory: false,
          enableTime: true,
          enableProjectStartup: false,
          enableKnowledge: true,
          knowledgeAsTools: true,
        };
        break;
      case 'claude-code':
        config = {
          enableMemory: false,
          enableTime: true,
          enableProjectStartup: true,
          enableKnowledge: true,
          knowledgeAsTools: false,
        };
        break;
      case 'claude-code':
        config = {
          enableMemory: true,
          enableTime: false,
          enableProjectStartup: true,
          enableKnowledge: true,
          knowledgeAsTools: false,
        };
        break;
      case 'minimal':
        config = {
          enableMemory: false,
          enableTime: false,
          enableProjectStartup: false,
          enableKnowledge: false,
          knowledgeAsTools: false,
        };
        break;
      default:
        throw new CLIError(
          `Unknown preset: ${options.preset}. Available: opencode, claude-code, minimal`,
          'INVALID_PRESET'
        );
    }
  }

  await startSylphxFlowMCPServer(config);

  // Keep the process alive
  process.stdin.resume();
};

// MCP install handler
const mcpInstallHandler: CommandHandler = async (options: {
  servers?: string[];
  all?: boolean;
  dryRun?: boolean;
  target?: string;
}) => {
  // Resolve target
  const targetId = await targetManager.resolveTarget({ target: options.target });

  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
  }

  const servers = options.servers || [];

  if (options.all) {
    console.log(`🔧 Installing all available MCP tools for ${targetId}...`);
    const allServers = getAllServerIDs();

    if (options.dryRun) {
      console.log(`🔍 Dry run: Would install all MCP tools: ${allServers.join(', ')}`);
    } else {
      // Check for servers that need API keys and configure them first
      const serversNeedingKeys = getServersRequiringAPIKeys();
      const serversWithKeys: string[] = [];
      const serversWithoutKeys: string[] = [];

      if (serversNeedingKeys.length > 0) {
        console.log('\n🔑 Some MCP tools require API keys:');

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
      const serversNotNeedingKeys = allServers.filter(
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
        console.log('   You can install them later with: sylphx-flow mcp config <server-name>');
      }
    }
    return;
  }

  if (servers.length === 0) {
    throw new CLIError('Please specify MCP tools to install or use --all', 'NO_SERVERS_SPECIFIED');
  }

  // Validate server types
  const validServers: string[] = [];
  for (const server of servers) {
    if (getAllServerIDs().includes(server as any)) {
      validServers.push(server);
    } else {
      console.warn(
        `Warning: Unknown MCP server '${server}'. Available: ${getAllServerIDs().join(', ')}`
      );
    }
  }

  if (validServers.length === 0) {
    const availableServers = getAllServerIDs();
    throw new CLIError(
      `Invalid MCP tools. Available: ${availableServers.join(', ')}`,
      'INVALID_MCP_SERVERS'
    );
  }

  console.log(`🔧 Installing MCP tools for ${targetId}: ${validServers.join(', ')}`);
  if (options.dryRun) {
    console.log('🔍 Dry run: Would install MCP tools:', validServers.join(', '));
  } else {
    // Check for servers that need API keys and configure them first
    const serversNeedingKeys = validServers.filter((server) =>
      getServersRequiringAPIKeys().includes(server as any)
    );
    const serversWithKeys: string[] = [];
    const serversWithoutKeys: string[] = [];

    if (serversNeedingKeys.length > 0) {
      console.log('\n🔑 Some MCP tools require API keys:');

      for (const serverType of serversNeedingKeys) {
        const shouldKeepOrInstall = await configureMCPServerForTarget(
          process.cwd(),
          targetId,
          serverType as any
        );
        if (shouldKeepOrInstall) {
          serversWithKeys.push(serverType);
        } else {
          serversWithoutKeys.push(serverType);
        }
      }
    }

    // Get servers that don't need API keys
    const serversNotNeedingKeys = validServers.filter(
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
      console.log('   You can install them later with: sylphx-flow mcp config <server-name>');
    }
  }
};

// MCP list handler
const mcpListHandler: CommandHandler = async (options) => {
  // Resolve target
  const targetId = await targetManager.resolveTarget({ target: options?.target });
  await listMCPServersForTarget(process.cwd(), targetId);
};

// MCP config handler
const mcpConfigHandler: CommandHandler = async (options) => {
  const server = options.server as string;
  if (!server) {
    throw new CLIError('Please specify a server to configure', 'NO_SERVER_SPECIFIED');
  }

  // Resolve target
  const targetId = await targetManager.resolveTarget({ target: options.target });

  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
  }

  // Validate server
  if (!getAllServerIDs().includes(server as any)) {
    const availableServers = getAllServerIDs();
    throw new CLIError(
      `Invalid MCP server: ${server}. Available: ${availableServers.join(', ')}`,
      'INVALID_MCP_SERVER'
    );
  }

  await configureMCPServerForTarget(process.cwd(), targetId, server as any);
};

export const mcpCommand: CommandConfig = {
  name: 'mcp',
  description: 'Manage MCP (Model Context Protocol) tools and servers',
  options: [
    {
      flags: '--target <type>',
      description: `Target platform (${targetManager.getImplementedTargets().join(', ')}, default: auto-detect)`,
    },
  ],
  subcommands: [
    {
      name: 'start',
      description: 'Start the Sylphx Flow MCP server',
      options: [
        {
          flags: '--preset <type>',
          description: 'Use preset configuration (opencode, claude-code, minimal)',
        },
        {
          flags: '--enable-memory',
          description: 'Enable memory tools',
        },
        {
          flags: '--enable-time',
          description: 'Enable time tools',
        },
        {
          flags: '--enable-project-startup',
          description: 'Enable project startup tools',
        },
        {
          flags: '--enable-knowledge',
          description: 'Enable knowledge resources',
        },
        {
          flags: '--knowledge-as-tools',
          description: 'Register knowledge as tools instead of resources',
        },
      ],
      handler: mcpStartHandler,
    },
    {
      name: 'install',
      description: 'Install MCP tools for the target platform',
      arguments: [
        {
          name: 'servers',
          description: `MCP tools to install (${getAllServerIDs().join(', ')})`,
          required: false,
        },
      ],
      options: [
        { flags: '--all', description: 'Install all available MCP tools' },
        { flags: '--dry-run', description: 'Show what would be done without making changes' },
      ],
      handler: mcpInstallHandler,
    },
    {
      name: 'list',
      description: 'List configured MCP tools for the target platform',
      options: [],
      handler: mcpListHandler,
    },
    {
      name: 'config',
      description: 'Configure API keys for MCP tools',
      arguments: [
        {
          name: 'server',
          description: `MCP server to configure (${getServersRequiringAPIKeys().join(', ')})`,
          required: true,
        },
      ],
      options: [],
      handler: mcpConfigHandler,
    },
  ],
};
