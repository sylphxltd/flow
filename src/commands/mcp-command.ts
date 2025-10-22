import { Effect } from 'effect';
import { getAllServerIDs, getServersRequiringAPIKeys } from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import { TerminalService } from '../services/service-types.js';
import { TerminalServiceLive } from '../services/terminal-service.js';
import type { CommandConfig, CommandHandler } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import {
  addMCPServersToTarget,
  configureMCPServerForTarget,
  listMCPServersForTarget,
  targetSupportsMCPServers,
  validateTarget,
} from '../utils/target-config.js';

// Helper to run terminal effects synchronously
const runTerminal = (effect: Effect.Effect<void, any, TerminalService>) => {
  Effect.runSync(effect.pipe(Effect.provide(TerminalServiceLive)));
};

// MCP start handler
const mcpStartHandler: CommandHandler = async () => {
  // Import and start the Sylphx Flow MCP server
  await import('../servers/sylphx-flow-mcp-server.js');

  runTerminal(
    Effect.gen(function* () {
      const terminal = yield* TerminalService;
      yield* terminal.print('🚀 Starting Sylphx Flow MCP Server...');
      yield* terminal.print('📍 Database: .sylphx-flow/memory.db');
      yield* terminal.print(
        '🔧 Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats'
      );
      yield* terminal.print('💡 Press Ctrl+C to stop the server');
    })
  );

  // The server is already initialized in the module
  // We just need to keep the process alive
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
    runTerminal(
      Effect.gen(function* () {
        const terminal = yield* TerminalService;
        yield* terminal.print(`🔧 Installing all available MCP tools for ${targetId}...`);
      })
    );
    const allServers = getAllServerIDs();

    if (options.dryRun) {
      runTerminal(
        Effect.gen(function* () {
          const terminal = yield* TerminalService;
          yield* terminal.print(
            `🔍 Dry run: Would install all MCP tools: ${allServers.join(', ')}`
          );
        })
      );
    } else {
      // Check for servers that need API keys and configure them first
      const serversNeedingKeys = getServersRequiringAPIKeys();
      const serversWithKeys: string[] = [];
      const serversWithoutKeys: string[] = [];

      if (serversNeedingKeys.length > 0) {
        runTerminal(
          Effect.gen(function* () {
            const terminal = yield* TerminalService;
            yield* terminal.print('\n🔑 Some MCP tools require API keys:');
          })
        );

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
        runTerminal(
          Effect.gen(function* () {
            const terminal = yield* TerminalService;
            yield* terminal.success(`MCP tools installed: ${serversToInstall.join(', ')}`);
          })
        );
      }

      if (serversWithoutKeys.length > 0) {
        runTerminal(
          Effect.gen(function* () {
            const terminal = yield* TerminalService;
            yield* terminal.warning(
              `Removed or skipped MCP tools (no API keys provided): ${serversWithoutKeys.join(', ')}`
            );
            yield* terminal.print(
              '   You can install them later with: sylphx-flow mcp config <server-name>'
            );
          })
        );
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
      runTerminal(
        Effect.gen(function* () {
          const terminal = yield* TerminalService;
          yield* terminal.warning(
            `Unknown MCP server '${server}'. Available: ${getAllServerIDs().join(', ')}`
          );
        })
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

  runTerminal(
    Effect.gen(function* () {
      const terminal = yield* TerminalService;
      yield* terminal.print(`🔧 Installing MCP tools for ${targetId}: ${validServers.join(', ')}`);
    })
  );
  if (options.dryRun) {
    runTerminal(
      Effect.gen(function* () {
        const terminal = yield* TerminalService;
        yield* terminal.print(`🔍 Dry run: Would install MCP tools: ${validServers.join(', ')}`);
      })
    );
  } else {
    // Check for servers that need API keys and configure them first
    const serversNeedingKeys = validServers.filter((server) =>
      getServersRequiringAPIKeys().includes(server as any)
    );
    const serversWithKeys: string[] = [];
    const serversWithoutKeys: string[] = [];

    if (serversNeedingKeys.length > 0) {
      runTerminal(
        Effect.gen(function* () {
          const terminal = yield* TerminalService;
          yield* terminal.print('\n🔑 Some MCP tools require API keys:');
        })
      );

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
      runTerminal(
        Effect.gen(function* () {
          const terminal = yield* TerminalService;
          yield* terminal.success(`MCP tools installed: ${serversToInstall.join(', ')}`);
        })
      );
    }

    if (serversWithoutKeys.length > 0) {
      runTerminal(
        Effect.gen(function* () {
          const terminal = yield* TerminalService;
          yield* terminal.warning(
            `Removed or skipped MCP tools (no API keys provided): ${serversWithoutKeys.join(', ')}`
          );
          yield* terminal.print(
            '   You can install them later with: sylphx-flow mcp config <server-name>'
          );
        })
      );
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
      options: [],
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
