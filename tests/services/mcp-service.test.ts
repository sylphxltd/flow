import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ConfigService,
  McpError,
  McpServerStatus,
  TestMcpServiceLive,
} from '../../src/services/mcp-service.js';
import { type AppConfig, McpService } from '../../src/services/service-types.js';

// Mock ConfigService for testing
const MockConfigServiceLive = Layer.effect(
  ConfigService,
  Effect.succeed({
    load: () =>
      Effect.succeed({
        version: '1.0.0',
        dataDir: '/tmp',
        logLevel: 'info' as const,
        targets: {},
        mcp: {
          enabled: true,
          servers: {
            'test-server-1': {
              type: 'stdio',
              command: 'echo',
              args: ['test'],
            },
            'test-server-2': {
              type: 'http',
              url: 'http://localhost:3000',
            },
          },
        },
        memory: {
          defaultNamespace: 'default',
          maxEntries: 1000,
          retentionDays: 30,
        },
      } as AppConfig),
    save: () => Effect.void,
    get: () => Effect.succeed({} as any),
    set: () => Effect.void,
    validate: () => Effect.succeed({} as AppConfig),
  })
);

describe('McpService', () => {
  const runTest = (testEffect: Effect.Effect<any, any, any>) => {
    const TestLayer = Layer.provide(TestMcpServiceLive, MockConfigServiceLive);
    return Effect.runSync(Effect.provide(testEffect, TestLayer)) as any;
  };

  describe('server listing', () => {
    it('should list all servers', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;
          const servers = yield* mcp.list();

          expect(servers).toHaveLength(2);
          expect(servers[0].id).toBe('test-server-1');
          expect(servers[1].id).toBe('test-server-2');
        })
      ));

    it('should return servers with correct configuration', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;
          const servers = yield* mcp.list();

          const stdioServer = servers.find((s) => s.id === 'test-server-1');
          const httpServer = servers.find((s) => s.id === 'test-server-2');

          expect(stdioServer).toBeDefined();
          expect(stdioServer?.config.type).toBe('stdio');
          expect(stdioServer?.config.command).toBe('echo');

          expect(httpServer).toBeDefined();
          expect(httpServer?.config.type).toBe('http');
          expect(httpServer?.config.url).toBe('http://localhost:3000');
        })
      ));
  });

  describe('server status', () => {
    it('should get server status for existing server', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;
          const status = yield* mcp.status('test-server-1');

          expect(status).toBe('stopped');
        })
      ));

    it('should get server status for running server', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;
          const status = yield* mcp.status('test-server-2');

          expect(status).toBe('running');
        })
      ));

    it('should fail for non-existent server', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;

          const result = yield* Effect.either(mcp.status('non-existent'));
          expect(result._tag).toBe('Left');
          if (result._tag === 'Left') {
            expect(result.left).toBeInstanceOf(McpError);
            expect(result.left.message).toContain('not found');
            expect(result.left.serverId).toBe('non-existent');
          }
        })
      ));
  });

  describe('server lifecycle', () => {
    it('should start a stopped server', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;

          yield* mcp.start('test-server-1');
          const status = yield* mcp.status('test-server-1');

          expect(status).toBe('running');
        })
      ));

    it('should stop a running server', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;

          // First stop the running server
          yield* mcp.stop('test-server-2');
          const status = yield* mcp.status('test-server-2');

          expect(status).toBe('stopped');
        })
      ));

    it('should fail to start an already running server', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;

          const result = yield* Effect.either(mcp.start('test-server-2')); // Already running
          expect(result._tag).toBe('Left');
          if (result._tag === 'Left') {
            expect(result.left).toBeInstanceOf(McpError);
            expect(result.left.message).toContain('already running');
          }
        })
      ));

    it('should fail to stop an already stopped server', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;

          const result = yield* Effect.either(mcp.stop('test-server-1')); // Already stopped
          expect(result._tag).toBe('Left');
          if (result._tag === 'Left') {
            expect(result.left).toBeInstanceOf(McpError);
            expect(result.left.message).toContain('already stopped');
          }
        })
      ));

    it('should restart a server', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;

          // Restart the running server
          yield* mcp.restart('test-server-2');
          const status = yield* mcp.status('test-server-2');

          expect(status).toBe('running');
        })
      ));

    it('should fail to start non-existent server', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;

          const result = yield* Effect.either(mcp.start('non-existent'));
          expect(result._tag).toBe('Left');
          if (result._tag === 'Left') {
            expect(result.left).toBeInstanceOf(McpError);
            expect(result.left.serverId).toBe('non-existent');
          }
        })
      ));

    it('should fail to stop non-existent server', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;

          const result = yield* Effect.either(mcp.stop('non-existent'));
          expect(result._tag).toBe('Left');
          if (result._tag === 'Left') {
            expect(result.left).toBeInstanceOf(McpError);
            expect(result.left.serverId).toBe('non-existent');
          }
        })
      ));
  });

  describe('server state persistence', () => {
    it('should maintain server state across operations', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;

          // Start server
          yield* mcp.start('test-server-1');
          let servers = yield* mcp.list();
          let server1 = servers.find((s) => s.id === 'test-server-1');
          expect(server1?.status).toBe('running');
          expect(server1?.pid).toBeDefined();

          // Stop server
          yield* mcp.stop('test-server-1');
          servers = yield* mcp.list();
          server1 = servers.find((s) => s.id === 'test-server-1');
          expect(server1?.status).toBe('stopped');
          expect(server1?.pid).toBeUndefined();
        })
      ));
  });

  describe('error handling', () => {
    it('should handle McpError with proper properties', () =>
      runTest(
        Effect.gen(function* () {
          const mcp = yield* McpService;

          const result = yield* Effect.either(mcp.status('invalid-server'));
          expect(result._tag).toBe('Left');
          if (result._tag === 'Left') {
            const mcpError = result.left;
            expect(mcpError._tag).toBe('McpError');
            expect(mcpError.name).toBe('McpError');
            expect(mcpError.serverId).toBe('invalid-server');
            expect(mcpError.message).toContain('not found');
          }
        })
      ));
  });
});
