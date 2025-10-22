import { type ChildProcess, spawn } from 'node:child_process';
import { Array, Effect, HashMap, Layer, Option } from 'effect';
import {
  AppConfig,
  ConfigService,
  McpError,
  type McpServer,
  type McpServerConfig,
  type McpServerStatus,
  McpService,
} from './service-types.js';

// Re-export types and values for convenience
export type { McpService, McpServer, McpServerStatus, McpServerConfig };

export { McpError, ConfigService };

// ============================================================================
// MCP SERVICE STATE
// ============================================================================

/**
 * MCP server runtime state
 */
interface McpServerState {
  readonly server: McpServer;
  readonly process?: ChildProcess;
  readonly startTime?: Date;
}

/**
 * MCP service state
 */
interface McpServiceState {
  readonly servers: HashMap.HashMap<string, McpServerState>;
}

// ============================================================================
// MCP SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Create MCP service with Effect
 */
const makeMcpService = Effect.gen(function* () {
  const configService = yield* ConfigService;
  const config = yield* configService.load();

  // Initialize service state
  let serviceState: McpServiceState = {
    servers: HashMap.empty(),
  };

  // Initialize servers from config
  const initializeServers = Effect.gen(function* () {
    const serverEntries = Object.entries(config.mcp.servers);

    yield* Effect.forEach(serverEntries, ([id, serverConfig]) =>
      Effect.gen(function* () {
        const server: McpServer = {
          id,
          name: (serverConfig as any).command || id,
          config: serverConfig as McpServerConfig,
          status: 'stopped',
        };

        serviceState = {
          ...serviceState,
          servers: HashMap.set(serviceState.servers, id, { server }),
        };
      })
    );
  });

  // Start MCP server
  const start = (serverId: string) =>
    Effect.gen(function* () {
      const serverState = HashMap.get(serviceState.servers, serverId);

      if (Option.isNone(serverState)) {
        yield* Effect.fail(new McpError(`Server ${serverId} not found`, undefined, serverId));
        return;
      }

      const { server } = serverState.value;

      if (server.status === 'running') {
        yield* Effect.fail(
          new McpError(`Server ${serverId} is already running`, undefined, serverId)
        );
        return;
      }

      // Update status to starting
      const updatedServer: McpServer = {
        ...server,
        status: 'starting',
      };

      serviceState = {
        ...serviceState,
        servers: HashMap.set(serviceState.servers, serverId, {
          server: updatedServer,
          startTime: new Date(),
        }),
      };

      // Start the server process
      if (server.config.type === 'stdio' && server.config.command) {
        const childProcess = yield* Effect.tryPromise({
          try: () =>
            new Promise<ChildProcess>((resolve, reject) => {
              const proc = spawn(server.config.command!, server.config.args || [], {
                env: { ...process.env, ...server.config.env },
                stdio: ['pipe', 'pipe', 'pipe'],
              });

              proc.on('spawn', () => resolve(proc));
              proc.on('error', reject);
            }),
          catch: (error) =>
            new McpError(`Failed to start server ${serverId}: ${error}`, error as Error, serverId),
        });

        // Update server state with process
        serviceState = {
          ...serviceState,
          servers: HashMap.set(serviceState.servers, serverId, {
            server: {
              ...updatedServer,
              status: 'running',
              pid: childProcess.pid,
            },
            process: childProcess,
            startTime: new Date(),
          }),
        };

        // Handle process exit
        childProcess.on('exit', (code) => {
          serviceState = {
            ...serviceState,
            servers: HashMap.modify(serviceState.servers, serverId, (state) => ({
              ...state,
              server: {
                ...state.server,
                status: code === 0 ? 'stopped' : 'error',
              },
              process: undefined,
            })),
          };
        });

        yield* Effect.log(`MCP server ${serverId} started successfully`);
      } else if (server.config.type === 'http' && server.config.url) {
        // For HTTP servers, we just mark as running since we can't manage the process
        serviceState = {
          ...serviceState,
          servers: HashMap.set(serviceState.servers, serverId, {
            server: {
              ...updatedServer,
              status: 'running',
            },
            startTime: new Date(),
          }),
        };

        yield* Effect.log(`MCP HTTP server ${serverId} marked as running`);
      } else {
        yield* Effect.fail(
          new McpError(`Invalid server configuration for ${serverId}`, undefined, serverId)
        );
      }
    });

  // Stop MCP server
  const stop = (serverId: string) =>
    Effect.gen(function* () {
      const serverState = HashMap.get(serviceState.servers, serverId);

      if (Option.isNone(serverState)) {
        yield* Effect.fail(new McpError(`Server ${serverId} not found`, undefined, serverId));
        return;
      }

      const { server, process } = serverState.value;

      if (server.status === 'stopped') {
        yield* Effect.fail(
          new McpError(`Server ${serverId} is already stopped`, undefined, serverId)
        );
        return;
      }

      // Update status to stopping
      serviceState = {
        ...serviceState,
        servers: HashMap.set(serviceState.servers, serverId, {
          ...serverState.value,
          server: {
            ...server,
            status: 'stopping',
          },
        }),
      };

      if (process && server.config.type === 'stdio') {
        yield* Effect.tryPromise({
          try: () =>
            new Promise<void>((resolve, reject) => {
              process.on('exit', () => resolve());
              process.on('error', reject);
              process.kill('SIGTERM');

              // Force kill after timeout
              setTimeout(() => {
                if (!process.killed) {
                  process.kill('SIGKILL');
                }
              }, 5000);
            }),
          catch: (error) =>
            new McpError(`Failed to stop server ${serverId}: ${error}`, error as Error, serverId),
        });
      }

      // Update status to stopped
      serviceState = {
        ...serviceState,
        servers: HashMap.set(serviceState.servers, serverId, {
          ...serverState.value,
          server: {
            ...server,
            status: 'stopped',
            pid: undefined,
          },
          process: undefined,
        }),
      };

      yield* Effect.log(`MCP server ${serverId} stopped successfully`);
    });

  // List all MCP servers
  const list = () =>
    Effect.gen(function* () {
      const servers = Array.fromIterable(serviceState.servers).map(([_, state]) => state.server);
      return servers;
    });

  // Get server status
  const status = (serverId: string) =>
    Effect.gen(function* () {
      const serverState = HashMap.get(serviceState.servers, serverId);

      if (Option.isNone(serverState)) {
        yield* Effect.fail(new McpError(`Server ${serverId} not found`, undefined, serverId));
        return;
      }

      return serverState.value.server.status;
    });

  // Restart MCP server
  const restart = (serverId: string) =>
    Effect.gen(function* () {
      yield* stop(serverId);
      yield* start(serverId);
    });

  // Initialize servers on startup
  yield* initializeServers;

  return {
    start,
    stop,
    list,
    status,
    restart,
  } as McpService;
});

// ============================================================================
// SERVICE LAYERS
// ============================================================================

/**
 * MCP service layer
 */
export const McpServiceLive = Layer.effect(McpService, makeMcpService);

/**
 * Default MCP service layer
 */
export const DefaultMcpServiceLive = McpServiceLive;

// ============================================================================
// TEST LAYER
// ============================================================================

/**
 * In-memory MCP service for testing
 */
export const TestMcpServiceLive = Layer.effect(
  McpService,
  Effect.gen(function* () {
    // Mock server state for testing
    const mockServers: McpServer[] = [
      {
        id: 'test-server-1',
        name: 'Test Server 1',
        config: {
          type: 'stdio',
          command: 'echo',
          args: ['test'],
        },
        status: 'stopped',
      },
      {
        id: 'test-server-2',
        name: 'Test Server 2',
        config: {
          type: 'http',
          url: 'http://localhost:3000',
        },
        status: 'running',
        port: 3000,
      },
    ];

    const start = (serverId: string) =>
      Effect.gen(function* () {
        const serverIndex = mockServers.findIndex((s: any) => s.id === serverId);
        if (serverIndex === -1) {
          yield* Effect.fail(new McpError(`Server ${serverId} not found`, undefined, serverId));
          return;
        }

        const server = mockServers[serverIndex];
        if (server.status === 'running') {
          yield* Effect.fail(
            new McpError(`Server ${serverId} is already running`, undefined, serverId)
          );
          return;
        }

        mockServers[serverIndex] = {
          ...server,
          status: 'running' as const,
          pid: Math.floor(Math.random() * 10000),
        };
      });

    const stop = (serverId: string) =>
      Effect.gen(function* () {
        const serverIndex = mockServers.findIndex((s: any) => s.id === serverId);
        if (serverIndex === -1) {
          yield* Effect.fail(new McpError(`Server ${serverId} not found`, undefined, serverId));
          return;
        }

        const server = mockServers[serverIndex];
        if (server.status === 'stopped') {
          yield* Effect.fail(
            new McpError(`Server ${serverId} is already stopped`, undefined, serverId)
          );
          return;
        }

        mockServers[serverIndex] = {
          ...server,
          status: 'stopped' as const,
          pid: undefined,
        };
      });

    const list = () => Effect.succeed(mockServers);

    const status = (serverId: string) =>
      Effect.gen(function* () {
        const server = mockServers.find((s: any) => s.id === serverId);
        if (!server) {
          yield* Effect.fail(new McpError(`Server ${serverId} not found`, undefined, serverId));
          return;
        }
        return server.status;
      });

    const restart = (serverId: string) =>
      Effect.gen(function* () {
        yield* stop(serverId);
        yield* start(serverId);
      });

    return {
      start,
      stop,
      list,
      status,
      restart,
    } as McpService;
  })
);

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if server is running
 */
export const isServerRunning = (server: McpServer): boolean => {
  return server.status === 'running';
};

/**
 * Check if server can be started
 */
export const canStartServer = (server: McpServer): boolean => {
  return server.status === 'stopped' || server.status === 'error';
};

/**
 * Check if server can be stopped
 */
export const canStopServer = (server: McpServer): boolean => {
  return server.status === 'running';
};

/**
 * Get server display name
 */
export const getServerDisplayName = (server: McpServer): string => {
  return server.name || server.id;
};
