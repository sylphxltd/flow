#!/usr/bin/env node
import {
  LibSQLMemoryStorage
} from "./chunk-YAGG6WK2.js";

// src/servers/sylphx-flow-mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
var DEFAULT_CONFIG = {
  name: "sylphx_flow",
  version: "1.0.0",
  description: "Sylphx Flow MCP server providing coordination tools for AI agents. Persistent SQLite-based storage with namespace support for agent coordination and state management."
};
var Logger = {
  info: (message) => console.error(`[INFO] ${message}`),
  success: (message) => console.error(`[SUCCESS] ${message}`),
  error: (message, error) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Error storing memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error storing memory: ${errorMessage}`
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Error retrieving memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error retrieving memory: ${errorMessage}`
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Error searching memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error searching memory: ${errorMessage}`
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Error listing memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error listing memory: ${errorMessage}`
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Error deleting memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error deleting memory: ${errorMessage}`
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Error clearing memory", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error clearing memory: ${errorMessage}`
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Error getting memory stats", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error getting memory stats: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
);
function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(void 0, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
function isValidTimeFormat(time) {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}
server.registerTool(
  "get_current_time",
  {
    description: "Get current time in a specific timezone or system timezone",
    inputSchema: {
      timezone: z.string().describe("IANA timezone name (e.g., 'America/New_York', 'Europe/London')")
    }
  },
  (args) => {
    try {
      const { timezone } = args;
      if (!isValidTimezone(timezone)) {
        return {
          content: [
            {
              type: "text",
              text: `\u274C Invalid timezone: ${timezone}. Please use a valid IANA timezone name (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo').`
            }
          ],
          isError: true
        };
      }
      const now = /* @__PURE__ */ new Date();
      const timeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "long",
        hour12: false
      });
      const parts = timeFormatter.formatToParts(now);
      const formatObject = {};
      for (const part of parts) {
        formatObject[part.type] = part.value;
      }
      const time24 = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(now);
      const isoString = now.toLocaleString("sv-SE", { timeZone: timezone });
      Logger.info(`Retrieved current time for timezone: ${timezone}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                timezone,
                current_time: {
                  date: `${formatObject.month} ${formatObject.day}, ${formatObject.year}`,
                  time_24h: time24,
                  time_with_seconds: timeFormatter.format(now),
                  timezone_name: formatObject.timeZoneName,
                  iso_format: `${isoString.replace(" ", "T")}Z`,
                  unix_timestamp: Math.floor(now.getTime() / 1e3)
                }
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Error getting current time", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error getting current time: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
);
server.registerTool(
  "convert_time",
  {
    description: "Convert time between timezones",
    inputSchema: {
      source_timezone: z.string().describe("Source IANA timezone name"),
      time: z.string().describe("Time in 24-hour format (HH:MM)"),
      target_timezone: z.string().describe("Target IANA timezone name")
    }
  },
  (args) => {
    try {
      const { source_timezone, time, target_timezone } = args;
      if (!isValidTimezone(source_timezone)) {
        return {
          content: [
            {
              type: "text",
              text: `\u274C Invalid source timezone: ${source_timezone}. Please use a valid IANA timezone name.`
            }
          ],
          isError: true
        };
      }
      if (!isValidTimezone(target_timezone)) {
        return {
          content: [
            {
              type: "text",
              text: `\u274C Invalid target timezone: ${target_timezone}. Please use a valid IANA timezone name.`
            }
          ],
          isError: true
        };
      }
      if (!isValidTimeFormat(time)) {
        return {
          content: [
            {
              type: "text",
              text: `\u274C Invalid time format: ${time}. Please use 24-hour format (HH:MM).`
            }
          ],
          isError: true
        };
      }
      const [hours, minutes] = time.split(":").map(Number);
      const now = /* @__PURE__ */ new Date();
      const sourceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      const sourceFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: source_timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      const sourceParts = sourceFormatter.formatToParts(sourceDate);
      const sourceFormatObject = {};
      for (const part of sourceParts) {
        sourceFormatObject[part.type] = part.value;
      }
      const targetFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: target_timezone,
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "long",
        hour12: false
      });
      const targetTime24 = new Intl.DateTimeFormat("en-US", {
        timeZone: target_timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(sourceDate);
      const targetParts = targetFormatter.formatToParts(sourceDate);
      const targetFormatObject = {};
      for (const part of targetParts) {
        targetFormatObject[part.type] = part.value;
      }
      const targetDate = new Date(
        sourceDate.toLocaleString("en-US", { timeZone: target_timezone })
      );
      const timeDiffMs = targetDate.getTime() - sourceDate.getTime();
      const timeDiffHours = Math.round(timeDiffMs / (1e3 * 60 * 60));
      Logger.info(`Converted time from ${source_timezone} to ${target_timezone}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                conversion: {
                  source: {
                    timezone: source_timezone,
                    time,
                    formatted: sourceFormatter.format(sourceDate)
                  },
                  target: {
                    timezone: target_timezone,
                    time_24h: targetTime24,
                    formatted: targetFormatter.format(sourceDate),
                    date: `${targetFormatObject.month} ${targetFormatObject.day}, ${targetFormatObject.year}`,
                    timezone_name: targetFormatObject.timeZoneName
                  },
                  time_difference_hours: timeDiffHours
                }
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Error converting time", error);
      return {
        content: [
          {
            type: "text",
            text: `\u274C Error converting time: ${errorMessage}`
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
