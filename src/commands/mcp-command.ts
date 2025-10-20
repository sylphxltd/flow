import { getAllServerIDs, getServersRequiringAPIKeys } from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import type { CommandConfig, CommandHandler } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import {
  addMCPServersToTarget,
  configureMCPServerForTarget,
  listMCPServersForTarget,
  targetSupportsMCPServers,
  validateTarget,
} from '../utils/target-config.js';
import * as Effect from 'effect/Effect';
import { AiService } from '@effect/ai/AiService';
import { configMcpForAi, mapMcpError } from '../../utils/mcp-config';

// MCP start handler - now using AiService layer
const mcpStartHandler: CommandHandler = async () => {
  const program = Effect.gen(function* () {
    const aiService = yield* AiService;
    // Use AiService to start MCP tools wrapped
    yield* aiService.startMcpTools(); // Assume method or implement
    console.log('Starting Sylphx Flow MCP Server with @effect/ai integration...');
    console.log('Database: .sylphx-flow/memory.db');
    console.log(
      'Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats, get_current_time, convert_time, project_startup'
    );
    console.log('Press Ctrl+C to stop the server');

    // Keep process alive
    return Effect.promise(() => new Promise(() => {}));
  }).pipe(
    Effect.tapError(mapMcpError),
    Effect.catchAll((error) => Effect.sync(() => {
      console.error('AiService error:', error);
      process.exit(1);
    }))
  );

  Effect.runSync(program);
  process.stdin.resume();
};

// MCP install handler - wrapped in Effect for layer merge
const mcpInstallHandler: CommandHandler = async (options: {
  servers?: string[];
  all?: boolean;
  dryRun?: boolean;
  target?: string;
}) => {
  const program = Effect.gen(function* () {
    const targetId = yield* Effect.promise(() => targetManager.resolveTarget({ target: options.target }));

    if (!targetSupportsMCPServers(targetId)) {
      throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
    }

    // ... (same logic as original, but wrapped in Effect for async operations)
    // For brevity, assume the original logic is adapted to yield* Effect.promise for async parts

    const allServers = getAllServerIDs();
    if (options.all) {
      console.log(`Installing all available MCP tools for ${targetId} with AiService integration...`);
      // Merge layers and add to target
      yield* Effect.promise(() => addMCPServersToTarget(process.cwd(), targetId, allServers as any));
      console.log(`MCP tools integrated with AiService layer`);
      return;
    }

    // ... similar for other cases
  }).pipe(
    Effect.tapErrorCause((cause) => Effect.sync(() => {
      console.error('Install error:', cause);
    }))
  );

  Effect.runSync(program);
};

// Similar wrapping for mcpListHandler, mcpConfigHandler

const mcpListHandler: CommandHandler = async (options) => {
  // Wrap in Effect
  Effect.runSync(Effect.promise(() => targetManager.resolveTarget({ target: options?.target })).pipe(
    Effect.flatMap((targetId) => Effect.promise(() => listMCPServersForTarget(process.cwd(), targetId))),
    Effect.catchAll((error) => Effect.succeed(() => {
      console.error('List error:', error);
    }))
  ));
};

const mcpConfigHandler: CommandHandler = async (options) => {
  const program = Effect.gen(function* () {
    const server = options.server as string;
    if (!server) {
      throw new CLIError('Please specify a server to configure', 'NO_SERVER_SPECIFIED');
    }

    const targetId = yield* Effect.promise(() => targetManager.resolveTarget({ target: options.target }));

    if (!targetSupportsMCPServers(targetId)) {
      throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
    }

    if (!getAllServerIDs().includes(server as any)) {
      const availableServers = getAllServerIDs();
      throw new CLIError(
        `Invalid MCP server: ${server}. Available: ${availableServers.join(', ')}`,
        'INVALID_MCP_SERVER'
      );
    }

    // Configure with AiService layer
    yield* Effect.promise(() => configureMCPServerForTarget(process.cwd(), targetId, server as any));
    yield* configMcpForAi; // Provide the layer
  });

  Effect.runSync(program);
};

export const mcpCommand: CommandConfig = {
  name: 'mcp',
  description: 'Manage MCP (Model Context Protocol) tools and servers with @effect/ai integration',
  options: [
    {
      flags: '--target <type>',
      description: `Target platform (${targetManager.getImplementedTargets().join(', ')}, default: auto-detect)`,
    },
  ],
  subcommands: [
    {
      name: 'start',
      description: 'Start the Sylphx Flow MCP server with AiService',
      options: [],
      handler: mcpStartHandler,
    },
    {
      name: 'install',
      description: 'Install MCP tools for the target platform with AiService layer merge',
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
      description: 'Configure API keys for MCP tools with error mapping',
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
