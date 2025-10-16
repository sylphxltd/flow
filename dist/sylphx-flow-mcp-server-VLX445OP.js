#!/usr/bin/env node
import {
  LibSQLMemoryStorage
} from "./chunk-VBFBG4QV.js";

// src/servers/sylphx-flow-mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
var DEFAULT_CONFIG = {
  name: "flow_memory",
  version: "1.0.0",
  description: "Sylphx Flow MCP server providing memory coordination tools for AI agents. Persistent SQLite-based storage with namespace support for agent coordination and state management."
};
var Logger = {
  info: (message) => console.error(`[INFO] ${message}`),
  success: (message) => console.error(`[SUCCESS] ${message}`),
  error: (message, error) => {
    console.error(`[ERROR] ${message}`);
    if (error) console.error(error);
  }
};
Logger.info("\u{1F680} Starting Sylphx Flow MCP Server...");
Logger.info(`\u{1F4CB} Description: ${DEFAULT_CONFIG.description.substring(0, 100)}...`);
var server = new McpServer({
  name: DEFAULT_CONFIG.name,
  version: DEFAULT_CONFIG.version,
  description: DEFAULT_CONFIG.description
});
var memoryStorage = new LibSQLMemoryStorage();
Logger.success("\u2705 Memory storage initialized");
server.registerTool(
  "memory_set",
  {
    description: "Store a value in persistent memory for agent coordination",
    inputSchema: {
      key: z.string().describe("Memory key (e.g., 'swarm/coder/status')"),
      value: z.string().describe("Value to store (will be JSON stringified)"),
      namespace: z.string().optional().describe("Optional namespace for organization")
    }
  },
  async (args) => {
    try {
      const { key, value, namespace = "default" } = args;
      const parsedValue = JSON.parse(value);
      await memoryStorage.set(key, parsedValue, namespace);
      Logger.info(`Stored memory: ${namespace}:${key}`);
      return {
        content: [
          {
            type: "text",
            text: `\u2705 Stored memory: ${namespace}:${key}`
          }
        ]
      };
    } catch (error) {
      Logger.error("Error storing memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error storing memory: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);
server.registerTool(
  "memory_get",
  {
    description: "Retrieve a value from persistent memory",
    inputSchema: {
      key: z.string().describe("Memory key to retrieve"),
      namespace: z.string().optional().describe("Optional namespace")
    }
  },
  async (args) => {
    try {
      const { key, namespace = "default" } = args;
      const memory = await memoryStorage.get(key, namespace);
      if (!memory) {
        return {
          content: [
            {
              type: "text",
              text: `\u274C Memory not found: ${namespace}:${key}`
            }
          ],
          isError: true
        };
      }
      const age = Date.now() - memory.timestamp;
      Logger.info(`Retrieved memory: ${namespace}:${key}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                key: `${namespace}:${key}`,
                value: memory.value,
                namespace: memory.namespace,
                timestamp: memory.timestamp,
                created_at: memory.created_at,
                updated_at: memory.updated_at,
                age_seconds: Math.floor(age / 1e3)
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      Logger.error("Error retrieving memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error retrieving memory: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);
server.registerTool(
  "memory_search",
  {
    description: "Search memory entries by pattern",
    inputSchema: {
      pattern: z.string().describe("Search pattern (matches keys, namespaces, and values)"),
      namespace: z.string().optional().describe("Optional namespace to limit search")
    }
  },
  async (args) => {
    try {
      const { pattern, namespace } = args;
      const allEntries = await memoryStorage.getAll();
      const results = allEntries.filter((entry) => {
        const matchesPattern = entry.key.toLowerCase().includes(pattern.toLowerCase()) || entry.namespace.toLowerCase().includes(pattern.toLowerCase()) || JSON.stringify(entry.value).toLowerCase().includes(pattern.toLowerCase());
        const matchesNamespace = !namespace || entry.namespace === namespace;
        return matchesPattern && matchesNamespace;
      });
      Logger.info(`Searched memory: "${pattern}" (${results.length} results)`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                pattern,
                namespace: namespace || "all",
                count: results.length,
                results: results.map((entry) => ({
                  key: entry.key,
                  namespace: entry.namespace,
                  value: entry.value,
                  timestamp: entry.timestamp,
                  updated_at: entry.updated_at
                }))
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      Logger.error("Error searching memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error searching memory: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);
server.registerTool(
  "memory_list",
  {
    description: "List all memory entries",
    inputSchema: {
      namespace: z.string().optional().describe("Optional namespace to filter by")
    }
  },
  async (args) => {
    try {
      const { namespace } = args;
      const entries = await memoryStorage.getAll();
      Logger.info(`Listed memory: ${entries.length} entries`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                namespace: namespace || "all",
                count: entries.length,
                entries: entries.map((entry) => ({
                  key: entry.key,
                  namespace: entry.namespace,
                  value: entry.value,
                  timestamp: entry.timestamp,
                  updated_at: entry.updated_at
                }))
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      Logger.error("Error listing memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error listing memory: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);
server.registerTool(
  "memory_delete",
  {
    description: "Delete a memory entry",
    inputSchema: {
      key: z.string().describe("Memory key to delete"),
      namespace: z.string().optional().describe("Optional namespace")
    }
  },
  async (args) => {
    try {
      const { key, namespace = "default" } = args;
      const deleted = await memoryStorage.delete(key, namespace);
      if (!deleted) {
        return {
          content: [
            {
              type: "text",
              text: `\u274C Memory not found: ${namespace}:${key}`
            }
          ],
          isError: true
        };
      }
      Logger.info(`Deleted memory: ${namespace}:${key}`);
      return {
        content: [
          {
            type: "text",
            text: `\u2705 Deleted memory: ${namespace}:${key}`
          }
        ]
      };
    } catch (error) {
      Logger.error("Error deleting memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error deleting memory: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);
server.registerTool(
  "memory_clear",
  {
    description: "Clear memory entries",
    inputSchema: {
      namespace: z.string().optional().describe("Optional namespace to clear (omits to clear all)")
    }
  },
  async (args) => {
    try {
      const { namespace } = args;
      await memoryStorage.clear(namespace);
      Logger.info(`Cleared memory: ${namespace || "all"}`);
      return {
        content: [
          {
            type: "text",
            text: `\u2705 Cleared memory: ${namespace || "all namespaces"}`
          }
        ]
      };
    } catch (error) {
      Logger.error("Error clearing memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error clearing memory: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);
server.registerTool(
  "memory_stats",
  {
    description: "Get memory storage statistics",
    inputSchema: {}
  },
  async () => {
    try {
      const stats = await memoryStorage.getStats();
      Logger.info("Retrieved memory stats");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total_entries: stats.totalEntries,
                namespaces: stats.namespaces,
                oldest_entry: stats.oldestEntry,
                newest_entry: stats.newestEntry,
                database_path: ".sylphx-flow/memory.db"
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      Logger.error("Error getting memory stats", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error getting memory stats: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    Logger.success("\u2705 MCP Server connected and ready");
  } catch (error) {
    Logger.error("Failed to start MCP server", error);
    process.exit(1);
  }
}
process.on("SIGINT", () => {
  Logger.info("\u{1F6D1} Shutting down MCP server...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  Logger.info("\u{1F6D1} Shutting down MCP server...");
  process.exit(0);
});
main().catch((error) => {
  Logger.error("Fatal error starting server", error);
  process.exit(1);
});
