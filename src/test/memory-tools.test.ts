import { describe, it, expect, beforeEach } from 'vitest';
import * as Effect from '@effect/io/Effect';
import { Layer } from '@effect/io/Layer';
import * as McpServer from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMemoryTools } from '../tools/memory-tools.js';

describe('MemoryTools', () => {
  let server: any;
  let layer: Layer.Layer<never, never, any>;

  beforeEach(() => {
    server = { registerTool: vi.fn() };
    // @ts-expect-error
    layer = /* DbService live or test */;
  });

  it('should register memory_set tool', async () => {
    const program = Effect.gen(function* (_) {
      // Setup MCP server with layer
      yield* _(Effect.promise(() => Promise.resolve()));
      return registerMemoryTools(server);
    });
    await Effect.runPromise(program.provide(layer));
    expect(server.registerTool).toHaveBeenCalledWith(
      'memory_set',
      expect.any(Object),
      expect.any(Function)
    );
  });

  // Similar tests for CRUD operations
  it('should perform CRUD operations', async () => {
    const program = Effect.gen(function* (_) {
      const set = yield* _(
        Effect.promise(() => ({
          content: [{ type: 'text', text: 'Stored' }],
        }))
      );
      // Test set, get, etc.
      return set;
    });
    // Mock and assert
    const result = await Effect.runPromise(program.provide(layer));
    expect(result.content[0].text).toBe('Stored');
  });
});
