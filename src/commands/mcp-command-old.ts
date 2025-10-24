import { render } from 'ink';
import React from 'react';
import { MCPConfigUI } from '../components/MCPConfigUI.js';
import { getAllServerIDs, getServersRequiringAPIKeys } from '../config/servers.js';
import type { MCPServerID } from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import { startSylphxFlowMCPServer } from '../servers/sylphx-flow-mcp-server.js';
import type { CommandConfig, CommandHandler, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import {
  addMCPServersToTarget,
  configureMCPServerForTarget,
  listMCPServersForTarget,
  targetSupportsMCPServers,
  validateTarget,
} from '../utils/target-config.js';

// MCP start handler
const mcpStartHandler: CommandHandler = async (options: CommandOptions) => {
  // Apply disable flags (new approach - whitelist by default, disable specified)
  let config = {
    disableMemory: options.disableMemory === true,
    disableTime: options.disableTime === true,
    disableProjectStartup: options.disableProjectStartup === true,
    disableKnowledge: options.disableKnowledge === true,
    disableCodebaseSearch: options.disableCodebaseSearch === true,
  };

  if (options.preset) {
    switch (options.preset) {
      case 'opencode':
        config = {
          disableMemory: true, // Disable memory
          disableTime: false, // Enable time
          disableProjectStartup: true, // Disable project startup
          disableKnowledge: false, // Enable knowledge
          disableCodebaseSearch: false, // Enable codebase search
        };
        break;
      case 'claude-code':
        config = {
          disableMemory: true, // Disable memory
          disableTime: false, // Enable time
          disableProjectStartup: false, // Enable project startup
          disableKnowledge: false, // Enable knowledge
          disableCodebaseSearch: false, // Enable codebase search
        };
        break;
      case 'minimal':
        config = {
          disableMemory: true, // Disable all
          disableTime: true,
          disableProjectStartup: true,
          disableKnowledge: true,
          disableCodebaseSearch: true,
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

  // Resolve target
  const targetId = await targetManager.resolveTarget({ target: options.target });

  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
  }

  // Get existing configuration values from environment and config
  const existingValues: Record<string, string> = {};

  // If no server specified, show server selection UI
  if (!server) {
    const { waitUntilExit } = render(
      React.createElement(MCPConfigUI, {
        existingValues,
        targetId,
        cwd: process.cwd(),
        onSave: async (values: Record<string, string>, selectedServerId?: MCPServerID) => {
          if (selectedServerId) {
            console.log('✅ Configuration saved successfully!');
          }
        },
        onCancel: () => {
          console.log('Configuration cancelled');
          process.exit(0);
        },
      })
    );
    await waitUntilExit();
    return;
  }

  // Validate server
  if (!getAllServerIDs().includes(server as any)) {
    const availableServers = getAllServerIDs();
    throw new CLIError(
      `Invalid MCP server: ${server}. Available: ${availableServers.join(', ')}`,
      'INVALID_MCP_SERVER'
    );
  }

  // Show configuration UI for specific server
  const { waitUntilExit } = render(
    React.createElement(MCPConfigUI, {
      serverId: server as MCPServerID,
      existingValues,
      targetId,
      cwd: process.cwd(),
      onSave: async (values: Record<string, string>) => {
        console.log('✅ Configuration saved successfully!');
      },
      onCancel: () => {
        console.log('Configuration cancelled');
        process.exit(0);
      },
    })
  );
  await waitUntilExit();
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
          flags: '--disable-memory',
          description: 'Disable memory tools',
        },
        {
          flags: '--disable-time',
          description: 'Disable time tools',
        },
        {
          flags: '--disable-project-startup',
          description: 'Disable project startup tools',
        },
        {
          flags: '--disable-knowledge',
          description: 'Disable knowledge tools',
        },
        {
          flags: '--disable-codebase-search',
          description: 'Disable codebase search tools',
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
          description: `MCP server to configure (${getServersRequiringAPIKeys().join(', ')}) - optional, will show selection UI if not provided`,
          required: false,
        },
      ],
      options: [],
      handler: mcpConfigHandler,
    },
  ],
};
