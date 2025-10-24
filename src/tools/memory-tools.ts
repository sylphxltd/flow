import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { type MemoryEntry, SeparatedMemoryStorage } from '../utils/separated-storage.js';

// Global memory storage instance
const memoryStorage = new SeparatedMemoryStorage();

// Logger utility
const Logger = {
  info: (message: string) => console.error(`[INFO] ${message}`),
  success: (message: string) => console.error(`[SUCCESS] ${message}`),
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  },
};

// Store a value in memory
async function memorySet(args: {
  key: string;
  value: string;
  namespace?: string;
}): Promise<CallToolResult> {
  try {
    const { key, value, namespace = 'default' } = args;
    const parsedValue = JSON.parse(value);

    await memoryStorage.set(key, parsedValue, namespace);

    Logger.info(`Stored memory: ${namespace}:${key}`);
    return {
      content: [
        {
          type: 'text',
          text: `✓ Stored memory: ${namespace}:${key}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Error storing memory', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error storing memory: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

// Retrieve a value from memory
async function memoryGet(args: {
  key: string;
  namespace?: string;
}): Promise<CallToolResult> {
  try {
    const { key, namespace = 'default' } = args;
    const memory = await memoryStorage.get(key, namespace);

    if (!memory) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Memory not found: ${namespace}:${key}`,
          },
        ],
        isError: true,
      };
    }

    const age = Date.now() - memory.timestamp;

    Logger.info(`Retrieved memory: ${namespace}:${key}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              key: `${namespace}:${key}`,
              value: memory.value,
              namespace: memory.namespace,
              timestamp: memory.timestamp,
              created_at: memory.created_at,
              updated_at: memory.updated_at,
              age_seconds: Math.floor(age / 1000),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Error retrieving memory', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error retrieving memory: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

// Search memory entries
async function memorySearch(args: {
  pattern: string;
  namespace?: string;
}): Promise<CallToolResult> {
  try {
    const { pattern, namespace } = args;
    const allEntries = await memoryStorage.getAll();
    const results = allEntries.filter((entry: MemoryEntry) => {
      const matchesPattern =
        entry.key.toLowerCase().includes(pattern.toLowerCase()) ||
        entry.namespace.toLowerCase().includes(pattern.toLowerCase()) ||
        JSON.stringify(entry.value).toLowerCase().includes(pattern.toLowerCase());

      const matchesNamespace = !namespace || entry.namespace === namespace;

      return matchesPattern && matchesNamespace;
    });

    Logger.info(`Searched memory: "${pattern}" (${results.length} results)`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              pattern,
              namespace: namespace || 'all',
              count: results.length,
              results: results.map((entry: MemoryEntry) => ({
                key: entry.key,
                namespace: entry.namespace,
                value: entry.value,
                timestamp: entry.timestamp,
                updated_at: entry.updated_at,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Error searching memory', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error searching memory: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

// List all memory entries
async function memoryList(args: {
  namespace?: string;
}): Promise<CallToolResult> {
  try {
    const { namespace } = args;
    const entries = await memoryStorage.getAll();

    Logger.info(`Listed memory: ${entries.length} entries`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              namespace: namespace || 'all',
              count: entries.length,
              entries: entries.map((entry: MemoryEntry) => ({
                key: entry.key,
                namespace: entry.namespace,
                value: entry.value,
                timestamp: entry.timestamp,
                updated_at: entry.updated_at,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Error listing memory', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error listing memory: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

// Delete a memory entry
async function memoryDelete(args: {
  key: string;
  namespace?: string;
}): Promise<CallToolResult> {
  try {
    const { key, namespace = 'default' } = args;
    const deleted = await memoryStorage.delete(key, namespace);

    if (!deleted) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Memory not found: ${namespace}:${key}`,
          },
        ],
        isError: true,
      };
    }

    Logger.info(`Deleted memory: ${namespace}:${key}`);
    return {
      content: [
        {
          type: 'text',
          text: `✓ Deleted memory: ${namespace}:${key}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Error deleting memory', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error deleting memory: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

// Clear memory entries
async function memoryClear(args: {
  namespace?: string;
}): Promise<CallToolResult> {
  try {
    const { namespace } = args;
    await memoryStorage.clear(namespace);

    Logger.info(`Cleared memory: ${namespace || 'all'}`);
    return {
      content: [
        {
          type: 'text',
          text: `✓ Cleared memory: ${namespace || 'all namespaces'}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Error clearing memory', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error clearing memory: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

// Get memory statistics
async function memoryStats(): Promise<CallToolResult> {
  try {
    const stats = await memoryStorage.getStats();

    Logger.info('Retrieved memory stats');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              total_entries: stats.totalEntries,
              namespaces: stats.namespaces,
              oldest_entry: stats.oldestEntry,
              newest_entry: stats.newestEntry,
              database_path: '.sylphx-flow/memory.db',
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Error getting memory stats', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error getting memory stats: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

// Register all memory tools
export function registerMemoryTools(server: McpServer) {
  server.registerTool(
    'memory_set',
    {
      description: 'Store a value in persistent memory for agent coordination',
      inputSchema: {
        key: z.string().describe("Memory key (e.g., 'swarm/coder/status')"),
        value: z.string().describe('Value to store (will be JSON stringified)'),
        namespace: z.string().optional().describe('Optional namespace for organization'),
      },
    },
    memorySet
  );

  server.registerTool(
    'memory_get',
    {
      description: 'Retrieve a value from persistent memory',
      inputSchema: {
        key: z.string().describe('Memory key to retrieve'),
        namespace: z.string().optional().describe('Optional namespace'),
      },
    },
    memoryGet
  );

  server.registerTool(
    'memory_search',
    {
      description: 'Search memory entries by pattern',
      inputSchema: {
        pattern: z.string().describe('Search pattern (matches keys, namespaces, and values)'),
        namespace: z.string().optional().describe('Optional namespace to limit search'),
      },
    },
    memorySearch
  );

  server.registerTool(
    'memory_list',
    {
      description: 'List all memory entries',
      inputSchema: {
        namespace: z.string().optional().describe('Optional namespace to filter by'),
      },
    },
    memoryList
  );

  server.registerTool(
    'memory_delete',
    {
      description: 'Delete a memory entry',
      inputSchema: {
        key: z.string().describe('Memory key to delete'),
        namespace: z.string().optional().describe('Optional namespace'),
      },
    },
    memoryDelete
  );

  server.registerTool(
    'memory_clear',
    {
      description: 'Clear memory entries',
      inputSchema: {
        namespace: z
          .string()
          .optional()
          .describe('Optional namespace to clear (omits to clear all)'),
      },
    },
    memoryClear
  );

  server.registerTool(
    'memory_stats',
    {
      description: 'Get memory storage statistics',
      inputSchema: {},
    },
    memoryStats
  );
}
