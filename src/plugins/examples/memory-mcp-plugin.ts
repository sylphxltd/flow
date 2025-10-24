/**
 * Memory MCP Tool Plugin Example
 *
 * Example plugin that implements memory management tools for MCP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MCPToolPlugin } from '../interfaces.js';
import { PluginMetadata } from '../plugin-manager.js';
import type { MemoryService } from '../../services/memory.service.js';

const SetMemoryArgsSchema = z.object({
  key: z.string().describe('The memory key to store'),
  value: z.string().describe('The value to store'),
  namespace: z.string().optional().describe('Namespace for the memory (default: default)'),
});

const GetMemoryArgsSchema = z.object({
  key: z.string().describe('The memory key to retrieve'),
  namespace: z.string().optional().describe('Namespace for the memory (default: default)'),
});

const DeleteMemoryArgsSchema = z.object({
  key: z.string().describe('The memory key to delete'),
  namespace: z.string().optional().describe('Namespace for the memory (default: default)'),
});

const ListMemoryArgsSchema = z.object({
  namespace: z.string().optional().describe('Namespace to list (default: default)'),
  limit: z.number().optional().describe('Maximum number of keys to return'),
});

const SearchMemoryArgsSchema = z.object({
  query: z.string().describe('Search query'),
  namespace: z.string().optional().describe('Namespace to search (default: all)'),
  limit: z.number().optional().describe('Maximum number of results'),
});

const ClearMemoryArgsSchema = z.object({
  namespace: z.string().optional().describe('Namespace to clear (default: default)'),
  confirm: z.boolean().optional().describe('Confirmation flag'),
});

export class MemoryMCPPlugin extends MCPToolPlugin {
  private memoryService?: MemoryService;

  protected async onInitialize(): Promise<void> {
    // Memory service will be injected through DI container
    this.logger?.info('Memory MCP Plugin initialized');
  }

  async initialize(container: any): Promise<void> {
    await super.initialize(container);

    // Resolve memory service from container
    try {
      this.memoryService = await container.resolve('memoryService');
    } catch (error) {
      this.logger?.warn('Memory service not available in container');
    }
  }

  get metadata(): PluginMetadata {
    return {
      name: 'memory-mcp-plugin',
      version: '1.0.0',
      description: 'MCP plugin for memory management operations',
      author: 'Sylphx Flow Team',
      category: 'mcp',
      enabled: true,
      priority: 10, // High priority for core functionality
    };
  }

  getToolNames(): string[] {
    return [
      'memory_set',
      'memory_get',
      'memory_delete',
      'memory_list',
      'memory_search',
      'memory_clear',
      'memory_stats',
    ];
  }

  getToolSchemas(): Record<string, any> {
    return {
      memory_set: {
        name: 'memory_set',
        description: 'Store a value in memory with optional namespace',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'The memory key to store' },
            value: { type: 'string', description: 'The value to store' },
            namespace: { type: 'string', description: 'Namespace for the memory (default: default)' },
          },
          required: ['key', 'value'],
        },
      },
      memory_get: {
        name: 'memory_get',
        description: 'Retrieve a value from memory',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'The memory key to retrieve' },
            namespace: { type: 'string', description: 'Namespace for the memory (default: default)' },
          },
          required: ['key'],
        },
      },
      memory_delete: {
        name: 'memory_delete',
        description: 'Delete a value from memory',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'The memory key to delete' },
            namespace: { type: 'string', description: 'Namespace for the memory (default: default)' },
          },
          required: ['key'],
        },
      },
      memory_list: {
        name: 'memory_list',
        description: 'List all keys in a namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Namespace to list (default: default)' },
            limit: { type: 'number', description: 'Maximum number of keys to return' },
          },
        },
      },
      memory_search: {
        name: 'memory_search',
        description: 'Search memory entries',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            namespace: { type: 'string', description: 'Namespace to search (default: all)' },
            limit: { type: 'number', description: 'Maximum number of results' },
          },
          required: ['query'],
        },
      },
      memory_clear: {
        name: 'memory_clear',
        description: 'Clear all entries in a namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Namespace to clear (default: default)' },
            confirm: { type: 'boolean', description: 'Confirmation flag' },
          },
        },
      },
      memory_stats: {
        name: 'memory_stats',
        description: 'Get memory statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    };
  }

  async registerTools(server: McpServer): Promise<void> {
    // Register memory_set tool
    server.tool(
      'memory_set',
      'Store a value in memory with optional namespace',
      SetMemoryArgsSchema.shape,
      this.createToolHandler(
        async (args) => {
          if (!this.memoryService) {
            throw new Error('Memory service not available');
          }

          const { key, value, namespace = 'default' } = args;
          const result = await this.memoryService.set(key, value, namespace);

          if (!result.success) {
            throw new Error(result.error || 'Failed to set memory');
          }

          return {
            content: [
              {
                type: 'text',
                text: `✓ Memory set: ${key} in namespace: ${namespace}`,
              },
            ],
          };
        },
        { name: 'memory_set', description: 'Store memory value' }
      )
    );

    // Register memory_get tool
    server.tool(
      'memory_get',
      'Retrieve a value from memory',
      GetMemoryArgsSchema.shape,
      this.createToolHandler(
        async (args) => {
          if (!this.memoryService) {
            throw new Error('Memory service not available');
          }

          const { key, namespace = 'default' } = args;
          const result = await this.memoryService.get(key, namespace);

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✗ ${result.error || 'Memory entry not found'}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `📝 Memory value for ${key} (${namespace}):\n\`\`\`\n${result.data}\n\`\`\``,
              },
            ],
          };
        },
        { name: 'memory_get', description: 'Get memory value' }
      )
    );

    // Register memory_delete tool
    server.tool(
      'memory_delete',
      'Delete a value from memory',
      DeleteMemoryArgsSchema.shape,
      this.createToolHandler(
        async (args) => {
          if (!this.memoryService) {
            throw new Error('Memory service not available');
          }

          const { key, namespace = 'default' } = args;
          const result = await this.memoryService.delete(key, namespace);

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✗ ${result.error || 'Failed to delete memory'}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `🗑️ Memory deleted: ${key} from namespace: ${namespace}`,
              },
            ],
          };
        },
        { name: 'memory_delete', description: 'Delete memory value' }
      )
    );

    // Register memory_list tool
    server.tool(
      'memory_list',
      'List all keys in a namespace',
      ListMemoryArgsSchema.shape,
      this.createToolHandler(
        async (args) => {
          if (!this.memoryService) {
            throw new Error('Memory service not available');
          }

          const { namespace = 'default', limit } = args;
          const result = await this.memoryService.list(namespace);

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✗ ${result.error || 'Failed to list memory'}`,
                },
              ],
            };
          }

          let keys = result.data || [];
          if (limit && limit > 0) {
            keys = keys.slice(0, limit);
          }

          if (keys.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `📭 No memory entries found in namespace: ${namespace}`,
                },
              ],
            };
          }

          const keyList = keys.map(key => `  • ${key}`).join('\n');
          return {
            content: [
              {
                type: 'text',
                text: `📋 Memory keys in namespace '${namespace}':\n${keyList}`,
              },
            ],
          };
        },
        { name: 'memory_list', description: 'List memory keys' }
      )
    );

    // Register memory_search tool
    server.tool(
      'memory_search',
      'Search memory entries',
      SearchMemoryArgsSchema.shape,
      this.createToolHandler(
        async (args) => {
          if (!this.memoryService) {
            throw new Error('Memory service not available');
          }

          const { query, namespace, limit = 10 } = args;
          const searchParams: any = { limit };

          if (namespace) {
            searchParams.namespace = namespace;
          }

          // Use key pattern for simple search
          searchParams.keyPattern = query;

          const result = await this.memoryService.search(searchParams);

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✗ ${result.error || 'Search failed'}`,
                },
              ],
            };
          }

          const entries = result.data || [];
          if (entries.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `🔍 No results found for query: ${query}`,
                },
              ],
            };
          }

          const searchResults = entries
            .slice(0, limit)
            .map((entry: any, index: number) => {
              const preview = entry.value ? entry.value.substring(0, 100) + (entry.value.length > 100 ? '...' : '') : '';
              return `${index + 1}. **${entry.key}** (${entry.namespace})\n   📝 ${preview}`;
            })
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `🔍 Search results for "${query}":\n\n${searchResults}`,
              },
            ],
          };
        },
        { name: 'memory_search', description: 'Search memory entries' }
      )
    );

    // Register memory_clear tool
    server.tool(
      'memory_clear',
      'Clear all entries in a namespace',
      ClearMemoryArgsSchema.shape,
      this.createToolHandler(
        async (args) => {
          if (!this.memoryService) {
            throw new Error('Memory service not available');
          }

          const { namespace = 'default', confirm = false } = args;

          if (!confirm) {
            return {
              content: [
                {
                  type: 'text',
                  text: '⚠️ This will delete all memory entries in the namespace. Please set confirm: true to proceed.',
                },
              ],
            };
          }

          const result = await this.memoryService.clear(namespace);

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✗ ${result.error || 'Failed to clear memory'}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `🧹 Cleared ${result.data} entries from namespace: ${namespace}`,
              },
            ],
          };
        },
        { name: 'memory_clear', description: 'Clear memory namespace' }
      )
    );

    // Register memory_stats tool
    server.tool(
      'memory_stats',
      'Get memory statistics',
      z.object({}).shape,
      this.createToolHandler(
        async () => {
          if (!this.memoryService) {
            throw new Error('Memory service not available');
          }

          const result = await this.memoryService.getStats();

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✗ ${result.error || 'Failed to get memory stats'}`,
                },
              ],
            };
          }

          const stats = result.data;
          const statsText = [
            '📊 **Memory Statistics**',
            '',
            `**Total Entries:** ${stats.totalEntries}`,
            `**Total Size:** ${(stats.totalSize / 1024).toFixed(2)} KB`,
            '',
            '**Namespaces:**',
            ...stats.namespaces.map((ns: any) =>
              `  • **${ns.name}:** ${ns.count} entries`
            ),
          ].join('\n');

          return {
            content: [
              {
                type: 'text',
                text: statsText,
              },
            ],
          };
        },
        { name: 'memory_stats', description: 'Get memory statistics' }
      )
    );

    this.logger?.info(`Registered ${this.getToolNames().length} memory tools`);
  }

  protected async onHealthCheck(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.memoryService) {
      return { healthy: false, error: 'Memory service not available' };
    }

    try {
      // Try a simple memory operation
      const testResult = await this.memoryService.get('_health_check');
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}