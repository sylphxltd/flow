#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/servers/sylphx-flow-mcp-server.ts
var sylphx_flow_mcp_server_exports = {};
__export(sylphx_flow_mcp_server_exports, {
  default: () => sylphx_flow_mcp_server_default
});
async function startServer() {
  const transport = new import_stdio.StdioServerTransport();
  await server.connect(transport);
  Logger.info("\u{1F517} Server connected via stdio transport");
}
var import_mcp, import_stdio, import_zod, fs4, path5, MemoryStorage, Logger, DEFAULT_CONFIG, server, memoryStorage, sylphx_flow_mcp_server_default;
var init_sylphx_flow_mcp_server = __esm({
  "src/servers/sylphx-flow-mcp-server.ts"() {
    "use strict";
    import_mcp = require("@modelcontextprotocol/sdk/server/mcp.js");
    import_stdio = require("@modelcontextprotocol/sdk/server/stdio.js");
    import_zod = require("zod");
    fs4 = __toESM(require("fs/promises"), 1);
    path5 = __toESM(require("path"), 1);
    MemoryStorage = class {
      data = /* @__PURE__ */ new Map();
      memoryDir;
      filePath;
      constructor() {
        this.memoryDir = path5.join(process.cwd(), ".memory");
        this.filePath = path5.join(this.memoryDir, "memory.json");
        fs4.mkdir(this.memoryDir, { recursive: true }).catch(() => {
        });
        this.loadData();
      }
      getFullKey(key, namespace) {
        return `${namespace}:${key}`;
      }
      async loadData() {
        try {
          const data = await fs4.readFile(this.filePath, "utf8");
          const parsed = JSON.parse(data);
          this.data = new Map(Object.entries(parsed));
        } catch {
          this.data = /* @__PURE__ */ new Map();
        }
      }
      async saveData() {
        try {
          const data = Object.fromEntries(this.data);
          await fs4.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
        } catch (error) {
          console.warn("Warning: Could not save memory data:", error);
        }
      }
      set(key, value, namespace = "default") {
        const fullKey = this.getFullKey(key, namespace);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const timestamp = Date.now();
        const existing = this.data.get(fullKey);
        this.data.set(fullKey, {
          key,
          namespace,
          value,
          timestamp,
          created_at: existing?.created_at || now,
          updated_at: now
        });
        this.saveData().catch(() => {
        });
      }
      get(key, namespace = "default") {
        const fullKey = this.getFullKey(key, namespace);
        return this.data.get(fullKey) || null;
      }
      search(pattern, namespace) {
        const searchPattern = pattern.replace(/\*/g, ".*");
        const regex = new RegExp(searchPattern);
        const results2 = [];
        for (const entry of this.data.values()) {
          if (namespace && entry.namespace !== namespace) {
            continue;
          }
          if (regex.test(entry.key)) {
            results2.push(entry);
          }
        }
        return results2.sort((a, b) => b.timestamp - a.timestamp);
      }
      list(namespace) {
        const results2 = [];
        for (const entry of this.data.values()) {
          if (namespace && entry.namespace !== namespace) {
            continue;
          }
          results2.push(entry);
        }
        return results2.sort((a, b) => b.timestamp - a.timestamp);
      }
      delete(key, namespace = "default") {
        const fullKey = this.getFullKey(key, namespace);
        const deleted = this.data.delete(fullKey);
        if (deleted) {
          this.saveData().catch(() => {
          });
        }
        return deleted;
      }
      clear(namespace) {
        let count = 0;
        if (namespace) {
          const keysToDelete = [];
          for (const [fullKey, entry] of this.data.entries()) {
            if (entry.namespace === namespace) {
              keysToDelete.push(fullKey);
            }
          }
          for (const key of keysToDelete) {
            this.data.delete(key);
            count++;
          }
        } else {
          count = this.data.size;
          this.data.clear();
        }
        if (count > 0) {
          this.saveData().catch(() => {
          });
        }
        return count;
      }
      getStats() {
        const entries = Array.from(this.data.values());
        const namespaces = [...new Set(entries.map((entry) => entry.namespace))];
        const namespaceStats = namespaces.map((ns) => ({
          namespace: ns,
          count: entries.filter((entry) => entry.namespace === ns).length
        }));
        const timestamps = entries.map((entry) => entry.timestamp);
        const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
        const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;
        return {
          total_entries: entries.length,
          namespaces: namespaceStats,
          oldest_entry: oldestEntry,
          newest_entry: newestEntry
        };
      }
    };
    Logger = class {
      static logLevel = process.env.LOG_LEVEL || "info";
      static info(message, ...args) {
        if (["info", "debug"].includes(this.logLevel)) {
          console.log(`\u2139\uFE0F  ${message}`, ...args);
        }
      }
      static debug(message, ...args) {
        if (this.logLevel === "debug") {
          console.log(`\u{1F41B} ${message}`, ...args);
        }
      }
      static warn(message, ...args) {
        console.warn(`\u26A0\uFE0F  ${message}`, ...args);
      }
      static error(message, error) {
        console.error(`\u274C ${message}`);
        if (error) {
          console.error(`   Error details:`, error instanceof Error ? error.message : error);
          if (error instanceof Error && error.stack) {
            console.error(`   Stack trace:`, error.stack);
          }
        }
      }
      static success(message, ...args) {
        console.log(`\u2705 ${message}`, ...args);
      }
    };
    DEFAULT_CONFIG = {
      name: "sylphx-flow-mcp-server",
      version: "1.0.0",
      description: "Sylphx Flow MCP server providing memory coordination tools for AI agents. Persistent JSON-based storage with namespace support for agent coordination and state management."
    };
    Logger.info("\u{1F680} Starting Sylphx Flow MCP Server...");
    Logger.info(`\u{1F4CB} Description: ${DEFAULT_CONFIG.description.substring(0, 100)}...`);
    server = new import_mcp.McpServer({
      name: DEFAULT_CONFIG.name,
      version: DEFAULT_CONFIG.version,
      description: DEFAULT_CONFIG.description
    });
    memoryStorage = new MemoryStorage();
    Logger.success("\u2705 Memory storage initialized");
    server.registerTool(
      "memory_set",
      {
        description: "Store a value in persistent memory for agent coordination",
        inputSchema: {
          key: import_zod.z.string().describe("Memory key (e.g., 'swarm/coder/status')"),
          value: import_zod.z.string().describe("Value to store (will be JSON stringified)"),
          namespace: import_zod.z.string().optional().describe("Optional namespace for organization")
        }
      },
      async (args) => {
        try {
          const { key, value, namespace = "default" } = args;
          const parsedValue = JSON.parse(value);
          memoryStorage.set(key, parsedValue, namespace);
          Logger.info(`Stored memory: ${namespace}:${key}`);
          return {
            content: [{
              type: "text",
              text: `\u2705 Stored memory: ${namespace}:${key}`
            }]
          };
        } catch (error) {
          Logger.error("Error storing memory", error);
          return {
            content: [{
              type: "text",
              text: `\u274C Error storing memory: ${error.message}`
            }],
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
          key: import_zod.z.string().describe("Memory key to retrieve"),
          namespace: import_zod.z.string().optional().describe("Optional namespace")
        }
      },
      async (args) => {
        try {
          const { key, namespace = "default" } = args;
          const memory = memoryStorage.get(key, namespace);
          if (!memory) {
            return {
              content: [{
                type: "text",
                text: `\u274C Memory not found: ${namespace}:${key}`
              }],
              isError: true
            };
          }
          const age = Date.now() - memory.timestamp;
          Logger.info(`Retrieved memory: ${namespace}:${key}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                key: `${namespace}:${key}`,
                value: memory.value,
                timestamp: memory.timestamp,
                created_at: memory.created_at,
                updated_at: memory.updated_at,
                namespace: memory.namespace,
                age
              }, null, 2)
            }]
          };
        } catch (error) {
          Logger.error("Error retrieving memory", error);
          return {
            content: [{
              type: "text",
              text: `\u274C Error retrieving memory: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );
    server.registerTool(
      "memory_search",
      {
        description: "Search memory keys by pattern with optional namespace filtering",
        inputSchema: {
          pattern: import_zod.z.string().describe("Search pattern (supports * wildcards)"),
          namespace: import_zod.z.string().optional().describe("Optional namespace to limit search")
        }
      },
      async (args) => {
        try {
          const { pattern, namespace } = args;
          const results2 = memoryStorage.search(pattern, namespace);
          const processedResults = results2.map((memory) => ({
            key: `${memory.namespace}:${memory.key}`,
            value: memory.value,
            timestamp: memory.timestamp,
            created_at: memory.created_at,
            updated_at: memory.updated_at,
            namespace: memory.namespace,
            age: Date.now() - memory.timestamp
          }));
          Logger.info(`Searched memory: ${pattern} (${results2.length} results)`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                pattern,
                namespace: namespace || "all",
                count: results2.length,
                results: processedResults
              }, null, 2)
            }]
          };
        } catch (error) {
          Logger.error("Error searching memory", error);
          return {
            content: [{
              type: "text",
              text: `\u274C Error searching memory: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );
    server.registerTool(
      "memory_list",
      {
        description: "List all memory keys, optionally filtered by namespace",
        inputSchema: {
          namespace: import_zod.z.string().optional().describe("Optional namespace to filter")
        }
      },
      async (args) => {
        try {
          const { namespace } = args;
          const entries = memoryStorage.list(namespace);
          const processedEntries = entries.map((memory) => ({
            key: `${memory.namespace}:${memory.key}`,
            namespace: memory.namespace,
            timestamp: memory.timestamp,
            created_at: memory.created_at,
            updated_at: memory.updated_at,
            age: Date.now() - memory.timestamp
          }));
          Logger.info(`Listed memory: ${namespace || "all"} (${entries.length} entries)`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                namespace: namespace || "all",
                count: entries.length,
                keys: processedEntries
              }, null, 2)
            }]
          };
        } catch (error) {
          Logger.error("Error listing memory", error);
          return {
            content: [{
              type: "text",
              text: `\u274C Error listing memory: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );
    server.registerTool(
      "memory_delete",
      {
        description: "Delete a specific memory entry",
        inputSchema: {
          key: import_zod.z.string().describe("Memory key to delete"),
          namespace: import_zod.z.string().optional().describe("Optional namespace")
        }
      },
      async (args) => {
        try {
          const { key, namespace = "default" } = args;
          const deleted = memoryStorage.delete(key, namespace);
          if (deleted) {
            Logger.info(`Deleted memory: ${namespace}:${key}`);
            return {
              content: [{
                type: "text",
                text: `\u2705 Deleted memory: ${namespace}:${key}`
              }]
            };
          } else {
            return {
              content: [{
                type: "text",
                text: `\u274C Memory not found: ${namespace}:${key}`
              }],
              isError: true
            };
          }
        } catch (error) {
          Logger.error("Error deleting memory", error);
          return {
            content: [{
              type: "text",
              text: `\u274C Error deleting memory: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );
    server.registerTool(
      "memory_clear",
      {
        description: "Clear all memory or specific namespace",
        inputSchema: {
          namespace: import_zod.z.string().optional().describe("Optional namespace to clear"),
          confirm: import_zod.z.boolean().optional().describe("Confirmation required for clearing all memory")
        }
      },
      async (args) => {
        try {
          const { namespace, confirm } = args;
          if (!namespace && !confirm) {
            return {
              content: [{
                type: "text",
                text: `\u274C Confirmation required. Set confirm: true to clear all memory.`
              }],
              isError: true
            };
          }
          const count = memoryStorage.clear(namespace);
          if (namespace) {
            Logger.info(`Cleared memory namespace: ${namespace} (${count} entries)`);
            return {
              content: [{
                type: "text",
                text: `\u2705 Cleared ${count} memories from namespace: ${namespace}`
              }]
            };
          } else {
            Logger.info(`Cleared all memory (${count} entries)`);
            return {
              content: [{
                type: "text",
                text: `\u2705 Cleared all ${count} memory entries`
              }]
            };
          }
        } catch (error) {
          Logger.error("Error clearing memory", error);
          return {
            content: [{
              type: "text",
              text: `\u274C Error clearing memory: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );
    server.registerTool(
      "memory_stats",
      {
        description: "Get statistics about the memory storage",
        inputSchema: {
          // No input parameters required
        }
      },
      async (args) => {
        try {
          const stats = memoryStorage.getStats();
          Logger.info(`Retrieved memory statistics`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                ...stats,
                database_path: path5.join(process.cwd(), ".memory", "memory.json"),
                age_days: stats.oldest_entry > 0 ? Math.floor((Date.now() - stats.oldest_entry) / (1e3 * 60 * 60 * 24)) : 0
              }, null, 2)
            }]
          };
        } catch (error) {
          Logger.error("Error getting memory statistics", error);
          return {
            content: [{
              type: "text",
              text: `\u274C Error getting memory statistics: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );
    process.on("SIGINT", () => {
      Logger.info("\u{1F6D1} Received SIGINT, shutting down gracefully...");
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      Logger.info("\u{1F6D1} Received SIGTERM, shutting down gracefully...");
      process.exit(0);
    });
    process.on("uncaughtException", (error) => {
      Logger.error("Uncaught Exception", error);
      process.exit(1);
    });
    process.on("unhandledRejection", (reason, promise) => {
      Logger.error("Unhandled Rejection", reason);
      process.exit(1);
    });
    Logger.success("\u{1F680} Sylphx Flow MCP Server ready!");
    Logger.info(`\u{1F4CD} Storage: ${path5.join(process.cwd(), ".memory", "memory.json")}`);
    Logger.info(`\u{1F527} Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats`);
    startServer().catch((error) => {
      Logger.error("Failed to start server", error);
      process.exit(1);
    });
    sylphx_flow_mcp_server_default = server;
  }
});

// src/cli.ts
var import_commander2 = require("commander");

// src/utils/command-builder.ts
var import_commander = require("commander");

// src/utils/error-handler.ts
var CLIError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "CLIError";
  }
};
function handleError(error, context) {
  const message = error instanceof Error ? error.message : String(error);
  const contextMsg = context ? ` (${context})` : "";
  console.error(`\u274C Error${contextMsg}: ${message}`);
  if (error instanceof CLIError && error.code) {
    console.error(`   Code: ${error.code}`);
  }
  process.exit(1);
}
function createAsyncHandler(handler, context) {
  return async (options) => {
    try {
      await handler(options);
    } catch (error) {
      handleError(error, context);
    }
  };
}

// src/utils/command-builder.ts
function createCommand(config) {
  const command = new import_commander.Command(config.name);
  command.description(config.description);
  config.options.forEach((option) => {
    command.option(option.flags, option.description);
  });
  if (config.subcommands) {
    config.subcommands.forEach((subcommand) => {
      command.addCommand(createCommand(subcommand));
    });
  }
  if (config.handler) {
    const handler = createAsyncHandler(config.handler, config.name);
    if (config.validator) {
      command.action((options) => {
        config.validator(options);
        return handler(options);
      });
    } else {
      command.action(handler);
    }
  }
  return command;
}
var COMMON_OPTIONS = [
  { flags: "--agent <type>", description: "Force specific agent" },
  { flags: "--verbose", description: "Show detailed output" },
  { flags: "--dry-run", description: "Show what would be done without making changes" },
  { flags: "--clear", description: "Clear obsolete items before processing" },
  { flags: "--merge", description: "Merge all items into a single file" },
  { flags: "--mcp [servers...]", description: "Install MCP servers (memory, everything)" }
];

// src/utils/help.ts
function showDefaultHelp() {
  console.log("\u{1F680} Sylphx Flow CLI - Type-safe development flow");
  console.log("=========================================");
  console.log("");
  console.log("Available commands:");
  console.log("  sync     Sync development flow to your project");
  console.log("  install  Install workflow agents for OpenCode");
  console.log("  mcp      Start the MCP server");
  console.log("");
  console.log("Examples:");
  console.log("  sylphx-flow sync");
  console.log("  sylphx-flow mcp");
  console.log("  sylphx-flow sync --agent cursor");
  console.log("  sylphx-flow sync --dry-run");
  console.log("  sylphx-flow sync --clear");
  console.log("  sylphx-flow sync --merge");
  console.log("  sylphx-flow install --agent opencode");
  console.log("");
  console.log('Run "sylphx-flow <command> --help" for more information about a command.');
}

// src/core/sync.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);
var readline = __toESM(require("readline"), 1);
var cliProgress = __toESM(require("cli-progress"), 1);
var import_cli_table3 = __toESM(require("cli-table3"), 1);
var import_url = require("url");
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = path.dirname(__filename);
var COLORS = {
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  reset: "\x1B[0m"
};
var AGENT_CONFIGS = {
  cursor: {
    name: "Cursor",
    dir: ".cursor",
    extension: ".mdc",
    stripYaml: false,
    flatten: false,
    description: "Cursor (.cursor/rules/*.mdc with YAML front matter)"
  },
  kilocode: {
    name: "Kilocode",
    dir: ".kilocode",
    extension: ".md",
    stripYaml: true,
    flatten: true,
    description: "Kilocode (.kilocode/rules/*.md without YAML front matter, flattened with category prefix)"
  },
  roocode: {
    name: "RooCode",
    dir: ".roo",
    extension: ".md",
    stripYaml: true,
    flatten: true,
    description: "RooCode (.roo/rules/*.md without YAML front matter, flattened with category prefix)"
  }
};
var BATCH_SIZE = 5;
var RULES_DIR_NAME = "rules";
var results = [];
var log = (message, color = "reset") => {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
};
var getSupportedAgents = () => Object.keys(AGENT_CONFIGS);
var getAgentConfig = (agent) => AGENT_CONFIGS[agent];
async function promptForAgent() {
  const agents = getSupportedAgents();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve2) => {
    console.log("\n\u{1F680} Rules Sync Tool");
    console.log("================");
    console.log("Please select your AI agent:");
    console.log("");
    agents.forEach((agent, index) => {
      const config = getAgentConfig(agent);
      console.log(`${index + 1}. ${config.name} - ${config.description}`);
    });
    console.log("");
    const askChoice = () => {
      rl.question("Enter your choice (1-" + agents.length + "): ", (answer) => {
        const choice = parseInt(answer.trim());
        if (choice >= 1 && choice <= agents.length) {
          rl.close();
          resolve2(agents[choice - 1]);
        } else {
          console.log(`\u274C Invalid choice. Please enter a number between 1 and ${agents.length}.`);
          askChoice();
        }
      });
    };
    askChoice();
  });
}
function detectAgentTool() {
  const cwd = process.cwd();
  const agentArg = process.argv.find((arg) => arg.startsWith("--agent="));
  if (agentArg) {
    const agent = agentArg.split("=")[1].toLowerCase();
    if (getSupportedAgents().includes(agent)) {
      return agent;
    }
  }
  for (const agent of getSupportedAgents()) {
    const config = getAgentConfig(agent);
    if (fs.existsSync(path.join(cwd, config.dir))) {
      return agent;
    }
  }
  for (const agent of getSupportedAgents()) {
    const config = getAgentConfig(agent);
    if (fs.existsSync(path.join(cwd, config.dir, RULES_DIR_NAME))) {
      return agent;
    }
  }
  return "cursor";
}
function getLocalFileInfo(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, "utf8");
    return { content, exists: true };
  } catch {
    return null;
  }
}
async function getRuleFiles() {
  const scriptDir = __dirname;
  let projectRoot;
  if (scriptDir.includes("/dist/src/")) {
    projectRoot = path.resolve(scriptDir, "../../..");
  } else {
    projectRoot = path.resolve(scriptDir, "..");
  }
  const docsRulesDir = path.join(projectRoot, "docs", RULES_DIR_NAME);
  const files = [];
  const collectFiles2 = (dir, relativePath) => {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        const itemRelative = path.join(relativePath, item.name);
        if (item.isDirectory()) {
          collectFiles2(itemPath, itemRelative);
        } else if (item.isFile() && (item.name.endsWith(".mdc") || item.name.endsWith(".md"))) {
          files.push(itemRelative);
        }
      }
    } catch {
    }
  };
  try {
    collectFiles2(docsRulesDir, RULES_DIR_NAME);
  } catch {
    console.warn("\u26A0\uFE0F  Could not read local rules directory, returning empty list");
    return [];
  }
  return files;
}
function stripYamlFrontMatter(content) {
  const lines = content.split("\n");
  if (lines.length > 0 && lines[0].trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        return lines.slice(i + 1).join("\n").trim();
      }
    }
  }
  return content;
}
function getDescriptionForFile(filePath) {
  if (!filePath) return "Development flow";
  const baseName = path.basename(filePath, path.extname(filePath));
  return `Development flow for ${baseName.replace(/-/g, " ")}`;
}
function createContentProcessor(config) {
  return (content, filePath) => {
    if (config.stripYaml) {
      return stripYamlFrontMatter(content);
    } else {
      const yamlFrontMatter = `---
description: ${getDescriptionForFile(filePath)}
globs: ["**/*"]
alwaysApply: true
---

`;
      return yamlFrontMatter + content;
    }
  };
}
function getDestinationPath(filePath, rulesDir, config) {
  const relativeToRules = filePath.substring(`${RULES_DIR_NAME}/`.length);
  const parsedPath = path.parse(relativeToRules);
  const { name: baseName, dir } = parsedPath;
  if (config.flatten) {
    const flattenedName = dir ? `${dir.replace(/[\/\\]/g, "-")}-${baseName}` : baseName;
    const relativePath = `${flattenedName}${config.extension}`;
    return { relativePath, destPath: path.join(rulesDir, relativePath) };
  } else {
    const targetDir = dir ? path.join(rulesDir, dir) : rulesDir;
    const relativePath = path.join(dir, `${baseName}${config.extension}`);
    return { relativePath, destPath: path.join(targetDir, `${baseName}${config.extension}`), targetDir };
  }
}
async function processFile(filePath, rulesDir, config, processContent, progressBar) {
  try {
    const { relativePath, destPath, targetDir } = getDestinationPath(filePath, rulesDir, config);
    if (targetDir && !fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const localInfo = getLocalFileInfo(destPath);
    const isNew = !localInfo;
    let projectRoot;
    if (__dirname.includes("/dist/src/")) {
      projectRoot = path.resolve(__dirname, "../../..");
    } else {
      projectRoot = path.resolve(__dirname, "..");
    }
    const sourcePath = path.join(projectRoot, "docs", filePath);
    let content = fs.readFileSync(sourcePath, "utf8");
    content = processContent(content, filePath);
    const localProcessed = localInfo ? processContent(localInfo.content, filePath) : "";
    const contentChanged = !localInfo || localProcessed !== content;
    if (contentChanged) {
      fs.writeFileSync(destPath, content, "utf8");
    }
    results.push({
      file: relativePath,
      status: contentChanged ? isNew ? "added" : "updated" : "current",
      action: contentChanged ? isNew ? "Added" : "Updated" : "Already current"
    });
    progressBar.increment();
    return contentChanged;
  } catch (error) {
    results.push({
      file: filePath,
      status: "error",
      action: `Error: ${error.message}`
    });
    progressBar.increment();
    return false;
  }
}
async function processBatch(batch, rulesDir, config, processContent, progressBar) {
  const promises = batch.map(
    (filePath) => processFile(filePath, rulesDir, config, processContent, progressBar)
  );
  await Promise.all(promises);
}
function createStatusTable(title, items) {
  if (items.length === 0) return;
  console.log(`
${title} (${items.length}):`);
  const table = new import_cli_table3.default({
    head: ["File", "Action"],
    colWidths: [50, 20],
    style: { head: ["cyan"], border: ["gray"] },
    chars: {
      "top": "\u2550",
      "top-mid": "\u2564",
      "top-left": "\u2554",
      "top-right": "\u2557",
      "bottom": "\u2550",
      "bottom-mid": "\u2567",
      "bottom-left": "\u255A",
      "bottom-right": "\u255D",
      "left": "\u2551",
      "left-mid": "",
      "mid": "",
      "mid-mid": "",
      "right": "\u2551",
      "right-mid": "",
      "middle": "\u2502"
    }
  });
  items.forEach((result) => {
    table.push([
      result.file.length > 47 ? result.file.substring(0, 47) + "..." : result.file,
      { content: result.action, vAlign: "center" }
    ]);
  });
  console.log(table.toString());
}
function displayResults(results2, rulesDir, agentName) {
  const statusGroups = {
    removed: results2.filter((r) => r.status === "removed"),
    added: results2.filter((r) => r.status === "added"),
    updated: results2.filter((r) => r.status === "updated"),
    current: results2.filter((r) => r.status === "current"),
    errors: results2.filter((r) => r.status === "error")
  };
  console.log("\n\u{1F4CA} Sync Results:");
  createStatusTable("\u{1F5D1}\uFE0F Removed", statusGroups.removed);
  createStatusTable("\u{1F195} Added", statusGroups.added);
  createStatusTable("\u{1F504} Updated", statusGroups.updated);
  createStatusTable("\u23ED\uFE0F Already Current", statusGroups.current);
  if (statusGroups.errors.length > 0) createStatusTable("\u274C Errors", statusGroups.errors);
  console.log(`
\u{1F389} Sync completed!`);
  console.log(`\u{1F4CD} Location: ${rulesDir}`);
  const summary = [
    statusGroups.removed.length && `${statusGroups.removed.length} removed`,
    statusGroups.added.length && `${statusGroups.added.length} added`,
    statusGroups.updated.length && `${statusGroups.updated.length} updated`,
    statusGroups.current.length && `${statusGroups.current.length} current`,
    statusGroups.errors.length && `${statusGroups.errors.length} errors`
  ].filter(Boolean);
  console.log(`\u{1F4C8} Summary: ${summary.join(", ")}`);
  console.log(`\u{1F4A1} Rules will be automatically loaded by ${agentName}`);
}
async function clearObsoleteFiles(rulesDir, config, merge) {
  if (!fs.existsSync(rulesDir)) return;
  console.log(`\u{1F9F9} Clearing obsolete rules in ${rulesDir}...`);
  let expectedFiles;
  if (merge) {
    expectedFiles = /* @__PURE__ */ new Set([`all-rules${config.extension}`]);
  } else {
    const ruleFiles = await getRuleFiles();
    expectedFiles = new Set(
      ruleFiles.map((filePath) => {
        const { relativePath } = getDestinationPath(filePath, rulesDir, config);
        return relativePath;
      })
    );
  }
  const existingFiles = fs.readdirSync(rulesDir, { recursive: true }).filter((file) => typeof file === "string" && (file.endsWith(".mdc") || file.endsWith(".md"))).map((file) => path.join(rulesDir, file));
  for (const file of existingFiles) {
    const relativePath = path.relative(rulesDir, file);
    if (!expectedFiles.has(relativePath)) {
      try {
        fs.unlinkSync(file);
        results.push({
          file: relativePath,
          status: "removed",
          action: "Removed"
        });
      } catch (error) {
        results.push({
          file: relativePath,
          status: "error",
          action: `Error removing: ${error.message}`
        });
      }
    }
  }
}
async function mergeAllRules(ruleFiles, rulesDir, config, processContent) {
  const mergedFileName = `all-rules${config.extension}`;
  const mergedFilePath = path.join(rulesDir, mergedFileName);
  console.log(`\u{1F4CB} Merging ${ruleFiles.length} files into ${mergedFileName}...`);
  let mergedContent = `# Development Rules - Complete Collection

`;
  mergedContent += `Generated on: ${(/* @__PURE__ */ new Date()).toISOString()}

`;
  mergedContent += `---

`;
  for (const filePath of ruleFiles) {
    try {
      let projectRoot;
      if (__dirname.includes("/dist/src/")) {
        projectRoot = path.resolve(__dirname, "../../..");
      } else {
        projectRoot = path.resolve(__dirname, "..");
      }
      const sourcePath = path.join(projectRoot, "docs", filePath);
      let content = fs.readFileSync(sourcePath, "utf8");
      content = processContent(content, filePath);
      const relativeToRules = filePath.substring(`${RULES_DIR_NAME}/`.length);
      const parsedPath = path.parse(relativeToRules);
      const { name: baseName, dir } = parsedPath;
      const sectionTitle = dir ? `${dir}/${baseName}` : baseName;
      mergedContent += `## ${sectionTitle.replace(/-/g, " ").toUpperCase()}

`;
      mergedContent += `${content}

`;
      mergedContent += `---

`;
    } catch (error) {
      results.push({
        file: filePath,
        status: "error",
        action: `Error reading: ${error.message}`
      });
    }
  }
  const localInfo = getLocalFileInfo(mergedFilePath);
  const localProcessed = localInfo ? processContent(localInfo.content, "all-rules") : "";
  const contentChanged = !localInfo || localProcessed !== mergedContent;
  if (contentChanged) {
    fs.writeFileSync(mergedFilePath, mergedContent, "utf8");
    results.push({
      file: mergedFileName,
      status: localInfo ? "updated" : "added",
      action: localInfo ? "Updated" : "Created"
    });
  } else {
    results.push({
      file: mergedFileName,
      status: "current",
      action: "Already current"
    });
  }
}
async function syncRules(options) {
  const cwd = process.cwd();
  results = [];
  let agent;
  if (options.agent) {
    agent = options.agent.toLowerCase();
    if (!getSupportedAgents().includes(agent)) {
      log(`\u274C Unknown agent: ${agent}`, "red");
      log(`Supported agents: ${getSupportedAgents().join(", ")}`, "yellow");
      throw new Error(`Unknown agent: ${agent}`);
    }
  } else {
    const detectedAgent = detectAgentTool();
    if (detectedAgent !== "cursor") {
      agent = detectedAgent;
      console.log(`\u{1F4DD} Detected agent: ${getAgentConfig(agent).name}`);
    } else {
      console.log("\u{1F4DD} No agent detected or defaulting to Cursor.");
      agent = await promptForAgent();
    }
  }
  const config = getAgentConfig(agent);
  const rulesDir = path.join(cwd, config.dir, RULES_DIR_NAME);
  const processContent = createContentProcessor(config);
  if (options.clear) {
    await clearObsoleteFiles(rulesDir, config, !!options.merge);
  }
  fs.mkdirSync(rulesDir, { recursive: true });
  const ruleFiles = await getRuleFiles();
  console.log(`\u{1F680} Rules Sync Tool`);
  console.log(`================`);
  console.log(`\u{1F4DD} Agent: ${config.name}`);
  console.log(`\u{1F4C1} Target: ${rulesDir}`);
  console.log(`\u{1F4CB} Files: ${ruleFiles.length}`);
  if (options.merge) {
    console.log(`\u{1F517} Mode: Merge all rules into single file`);
  }
  console.log("");
  if (options.dryRun) {
    console.log("\u2705 Dry run completed - no files were modified");
    return;
  }
  if (options.merge) {
    await mergeAllRules(ruleFiles, rulesDir, config, processContent);
  } else {
    const progressBar = new cliProgress.SingleBar({
      format: "\u{1F4CB} Processing | {bar} | {percentage}% | {value}/{total} files | {file}",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true
    });
    progressBar.start(ruleFiles.length, 0, { file: "Starting..." });
    for (let i = 0; i < ruleFiles.length; i += BATCH_SIZE) {
      const batch = ruleFiles.slice(i, i + BATCH_SIZE);
      await processBatch(batch, rulesDir, config, processContent, progressBar);
    }
    progressBar.stop();
  }
  displayResults(results, rulesDir, config.name);
}

// src/commands/sync-command.ts
function validateSyncOptions(options) {
  if (options.agent && !["cursor", "kilocode", "roocode"].includes(options.agent)) {
    throw new CLIError(
      `Invalid agent: ${options.agent}. Supported agents: cursor, kilocode, roocode`,
      "INVALID_AGENT"
    );
  }
}
var syncCommand = {
  name: "sync",
  description: "Sync development flow to your project",
  options: [
    { ...COMMON_OPTIONS[0], description: "Force specific agent (cursor, kilocode, roocode)" },
    ...COMMON_OPTIONS.slice(1)
  ],
  handler: syncRules,
  validator: validateSyncOptions
};

// src/core/install.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);

// src/shared.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
function log2(message, color = "white") {
  const colors = {
    red: "\x1B[31m",
    green: "\x1B[32m",
    yellow: "\x1B[33m",
    blue: "\x1B[34m",
    magenta: "\x1B[35m",
    cyan: "\x1B[36m",
    white: "\x1B[37m",
    reset: "\x1B[0m"
  };
  const colorCode = colors[color] || colors.white;
  console.log(`${colorCode}${message}${colors.reset}`);
}
function getSupportedAgents2(configs) {
  return Object.keys(configs);
}
function getAgentConfig2(configs, agent) {
  const config = configs[agent];
  if (!config) {
    throw new Error(`Agent configuration not found: ${agent}`);
  }
  return config;
}
async function promptForAgent2(configs, toolName) {
  const supportedAgents = getSupportedAgents2(configs);
  console.log(`
\u{1F4DD} ${toolName}`);
  console.log("================");
  console.log("Available agents:");
  supportedAgents.forEach((agent, index) => {
    const config = getAgentConfig2(configs, agent);
    console.log(`  ${index + 1}. ${config.name} - ${config.description}`);
  });
  return supportedAgents[0];
}
function detectAgentTool2(configs, defaultAgent = "opencode") {
  return defaultAgent;
}
function collectFiles(dir, extensions) {
  if (!import_fs.default.existsSync(dir)) {
    return [];
  }
  const files = [];
  function traverse(currentDir) {
    const items = import_fs.default.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = import_path.default.join(currentDir, item);
      const stat = import_fs.default.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (extensions.some((ext) => item.endsWith(ext))) {
        const relativePath = import_path.default.relative(dir, fullPath);
        files.push(relativePath);
      }
    }
  }
  traverse(dir);
  return files.sort();
}
function getLocalFileInfo2(filePath) {
  if (!import_fs.default.existsSync(filePath)) {
    return null;
  }
  const stat = import_fs.default.statSync(filePath);
  const content = import_fs.default.readFileSync(filePath, "utf8");
  return {
    content,
    mtime: stat.mtime
  };
}
function clearObsoleteFiles2(targetDir, expectedFiles, extensions, results2) {
  if (!import_fs.default.existsSync(targetDir)) {
    return;
  }
  const items = import_fs.default.readdirSync(targetDir);
  for (const item of items) {
    const itemPath = import_path.default.join(targetDir, item);
    const stat = import_fs.default.statSync(itemPath);
    if (stat.isFile()) {
      const hasValidExtension = extensions.some((ext) => item.endsWith(ext));
      if (hasValidExtension && !expectedFiles.has(item)) {
        import_fs.default.unlinkSync(itemPath);
        results2.push({
          file: item,
          status: "skipped",
          action: "Removed obsolete file"
        });
      }
    }
  }
}
function createMergedContent(filePaths, processContent, title, pathPrefix = "") {
  const sections = [];
  sections.push(`# ${title}`);
  sections.push("");
  sections.push(`*This file was automatically generated by merging multiple agent files.*`);
  sections.push(`*Source path prefix: ${pathPrefix}*`);
  sections.push("");
  sections.push("---");
  sections.push("");
  for (const filePath of filePaths) {
    const fullPath = import_path.default.resolve(filePath);
    if (import_fs.default.existsSync(fullPath)) {
      const content = import_fs.default.readFileSync(fullPath, "utf8");
      const processedContent = processContent(content);
      sections.push(`## ${import_path.default.basename(filePath, ".md")}`);
      sections.push("");
      sections.push(processedContent);
      sections.push("");
      sections.push("---");
      sections.push("");
    }
  }
  return sections.join("\n");
}
async function processBatch2(filePaths, targetDir, extension, processContent, flatten, results2, pathPrefix = "") {
  for (const filePath of filePaths) {
    const destPath = flatten ? import_path.default.join(targetDir, `${import_path.default.basename(filePath, import_path.default.extname(filePath))}${extension}`) : import_path.default.join(targetDir, filePath);
    const destDir = import_path.default.dirname(destPath);
    if (!import_fs.default.existsSync(destDir)) {
      import_fs.default.mkdirSync(destDir, { recursive: true });
    }
    const localInfo = getLocalFileInfo2(destPath);
    const isNew = !localInfo;
    const projectRoot = process.cwd();
    const sourcePath = import_path.default.join(projectRoot, pathPrefix, filePath);
    let content = import_fs.default.readFileSync(sourcePath, "utf8");
    content = processContent(content);
    const localProcessed = localInfo ? processContent(localInfo.content) : "";
    const contentChanged = !localInfo || localProcessed !== content;
    if (contentChanged) {
      const destDirPath = import_path.default.dirname(destPath);
      if (!import_fs.default.existsSync(destDirPath)) {
        import_fs.default.mkdirSync(destDirPath, { recursive: true });
      }
      import_fs.default.writeFileSync(destPath, content, "utf8");
      results2.push({
        file: import_path.default.relative(targetDir, destPath),
        status: isNew ? "added" : "updated",
        action: isNew ? "Created" : "Updated"
      });
    } else {
      results2.push({
        file: import_path.default.relative(targetDir, destPath),
        status: "current",
        action: "Already current"
      });
    }
  }
}
function displayResults2(results2, targetDir, agentName, operation) {
  console.log(`
\u{1F4CA} ${operation} Results for ${agentName}`);
  console.log("=====================================");
  const grouped = results2.reduce((acc, result) => {
    if (!acc[result.status]) {
      acc[result.status] = [];
    }
    acc[result.status].push(result);
    return acc;
  }, {});
  const statusOrder = ["added", "updated", "current", "skipped"];
  const statusColors = {
    added: "green",
    updated: "yellow",
    current: "blue",
    skipped: "magenta"
  };
  for (const status of statusOrder) {
    const items = grouped[status];
    if (items && items.length > 0) {
      const color = statusColors[status];
      log2(`${status.toUpperCase()} (${items.length}):`, color);
      items.forEach((item) => {
        log2(`  ${item.file} - ${item.action}`, color);
      });
      console.log("");
    }
  }
  const total = results2.length;
  const changed = results2.filter((r) => r.status === "added" || r.status === "updated").length;
  if (changed > 0) {
    log2(`\u2705 ${operation} complete: ${changed}/${total} files modified`, "green");
  } else {
    log2(`\u2705 ${operation} complete: All ${total} files already current`, "blue");
  }
  console.log(`\u{1F4C1} Target directory: ${targetDir}`);
}

// src/core/install.ts
var AGENT_CONFIGS2 = {
  opencode: {
    name: "OpenCode",
    dir: ".opencode/agent",
    extension: ".md",
    stripYaml: false,
    flatten: false,
    description: "OpenCode (.opencode/agent/*.md with YAML front matter for agents)"
  }
};
async function getAgentFiles() {
  const agentsDir = import_path2.default.join(process.cwd(), "agents");
  const subdirs = import_fs2.default.readdirSync(agentsDir, { withFileTypes: true }).filter((dirent) => dirent.isDirectory() && dirent.name !== "archived").map((dirent) => dirent.name);
  const allFiles = [];
  for (const subdir of subdirs) {
    const subdirPath = import_path2.default.join(agentsDir, subdir);
    const files = collectFiles(subdirPath, [".md"]);
    allFiles.push(...files.map((file) => import_path2.default.join(subdir, file)));
  }
  return allFiles;
}
async function promptForAgent3() {
  const result = await promptForAgent2(AGENT_CONFIGS2, "Workflow Install Tool");
  return result;
}
function detectAgentTool3() {
  const result = detectAgentTool2(AGENT_CONFIGS2, "opencode");
  return result;
}
async function installMemoryPlugin(cwd) {
  const pluginDir = import_path2.default.join(cwd, ".opencode", "plugin");
  const pluginFile = import_path2.default.join(pluginDir, "memory-tools.ts");
  import_fs2.default.mkdirSync(pluginDir, { recursive: true });
  if (import_fs2.default.existsSync(pluginFile)) {
    console.log("\u{1F4E6} Memory plugin already exists, skipping...");
    return;
  }
  const sourcePlugin = import_path2.default.join(process.cwd(), "src", "opencode", "plugins", "memory-tools.ts");
  if (import_fs2.default.existsSync(sourcePlugin)) {
    import_fs2.default.copyFileSync(sourcePlugin, pluginFile);
    console.log("\u{1F4E6} Installed memory plugin for agent coordination");
  } else {
    const pluginContent = `import { type Plugin, tool } from "@opencode-ai/plugin"

// Simple in-memory storage for coordination between agents
const memoryStore = new Map<string, any>()

export const MemoryToolsPlugin: Plugin = async () => {
  return {
    tool: {
      // Store a value in memory
      memory_set: tool({
        description: "Store a value in shared memory for agent coordination",
        args: {
          key: tool.schema.string().describe("Memory key (e.g., 'swarm/coder/status')"),
          value: tool.schema.string().describe("Value to store (will be JSON stringified)"),
          namespace: tool.schema.string().optional().describe("Optional namespace for organization"),
        },
        async execute(args) {
          try {
            const fullKey = args.namespace ? \`\${args.namespace}:\${args.key}\` : args.key
            const parsedValue = JSON.parse(args.value)
            memoryStore.set(fullKey, {
              value: parsedValue,
              timestamp: Date.now(),
              namespace: args.namespace || 'default'
            })
            return \`\u2705 Stored memory: \${fullKey}\`
          } catch (error: any) {
            return \`\u274C Error storing memory: \${error.message}\`
          }
        },
      }),

      // Retrieve a value from memory
      memory_get: tool({
        description: "Retrieve a value from shared memory",
        args: {
          key: tool.schema.string().describe("Memory key to retrieve"),
          namespace: tool.schema.string().optional().describe("Optional namespace"),
        },
        async execute(args) {
          try {
            const fullKey = args.namespace ? \`\${args.namespace}:\${args.key}\` : args.key
            const memory = memoryStore.get(fullKey)
            
            if (!memory) {
              return \`\u274C Memory not found: \${fullKey}\`
            }
            
            return JSON.stringify({
              key: fullKey,
              value: memory.value,
              timestamp: memory.timestamp,
              namespace: memory.namespace,
              age: Date.now() - memory.timestamp
            }, null, 2)
          } catch (error: any) {
            return \`\u274C Error retrieving memory: \${error.message}\`
          }
        },
      }),

      // Search memory keys by pattern
      memory_search: tool({
        description: "Search memory keys by pattern",
        args: {
          pattern: tool.schema.string().describe("Search pattern (supports wildcards)"),
          namespace: tool.schema.string().optional().describe("Optional namespace to limit search"),
        },
        async execute(args) {
          try {
            const searchPattern = args.namespace ? \`\${args.namespace}:\${args.pattern}\` : args.pattern
            const regex = new RegExp(searchPattern.replace(/\\*/g, '.*'))
            
            const results = Array.from(memoryStore.entries())
              .filter(([key]) => regex.test(key))
              .map(([key, memory]) => ({
                key,
                value: memory.value,
                timestamp: memory.timestamp,
                namespace: memory.namespace,
                age: Date.now() - memory.timestamp
              }))
            
            return JSON.stringify({
              pattern: searchPattern,
              count: results.length,
              results: results
            }, null, 2)
          } catch (error: any) {
            return \`\u274C Error searching memory: \${error.message}\`
          }
        },
      }),

      // List all memory keys
      memory_list: tool({
        description: "List all memory keys, optionally filtered by namespace",
        args: {
          namespace: tool.schema.string().optional().describe("Optional namespace to filter"),
        },
        async execute(args) {
          try {
            const entries = Array.from(memoryStore.entries())
              .filter(([, memory]) => !args.namespace || memory.namespace === args.namespace)
            
            return JSON.stringify({
              namespace: args.namespace || 'all',
              count: entries.length,
              keys: entries.map(([key, memory]) => ({
                key,
                namespace: memory.namespace,
                timestamp: memory.timestamp,
                age: Date.now() - memory.timestamp
              }))
            }, null, 2)
          } catch (error: any) {
            return \`\u274C Error listing memory: \${error.message}\`
          }
        },
      }),

      // Delete memory
      memory_delete: tool({
        description: "Delete a memory entry",
        args: {
          key: tool.schema.string().describe("Memory key to delete"),
          namespace: tool.schema.string().optional().describe("Optional namespace"),
        },
        async execute(args) {
          try {
            const fullKey = args.namespace ? \`\${args.namespace}:\${args.key}\` : args.key
            const deleted = memoryStore.delete(fullKey)
            
            if (deleted) {
              return \`\u2705 Deleted memory: \${fullKey}\`
            } else {
              return \`\u274C Memory not found: \${fullKey}\`
            }
          } catch (error: any) {
            return \`\u274C Error deleting memory: \${error.message}\`
          }
        },
      }),

      // Clear all memory or specific namespace
      memory_clear: tool({
        description: "Clear all memory or specific namespace",
        args: {
          namespace: tool.schema.string().optional().describe("Optional namespace to clear"),
          confirm: tool.schema.boolean().describe("Confirmation required for clearing all memory"),
        },
        async execute(args) {
          try {
            if (!args.namespace && !args.confirm) {
              return \`\u274C Confirmation required. Set confirm: true to clear all memory.\`
            }
            
            if (args.namespace) {
              // Clear specific namespace
              const keysToDelete = Array.from(memoryStore.entries())
                .filter(([, memory]) => memory.namespace === args.namespace)
                .map(([key]) => key)
              
              keysToDelete.forEach(key => memoryStore.delete(key))
              return \`\u2705 Cleared \${keysToDelete.length} memories from namespace: \${args.namespace}\`
            } else {
              // Clear all memory
              const count = memoryStore.size
              memoryStore.clear()
              return \`\u2705 Cleared all \${count} memory entries\`
            }
          } catch (error: any) {
            return \`\u274C Error clearing memory: \${error.message}\`
          }
        },
      }),
    },
  }
}`;
    import_fs2.default.writeFileSync(pluginFile, pluginContent, "utf8");
    console.log("\u{1F4E6} Created memory plugin for agent coordination");
  }
}
async function installAgents(options) {
  const cwd = process.cwd();
  const results2 = [];
  let agent;
  if (options.agent) {
    agent = options.agent.toLowerCase();
    if (!getSupportedAgents2(AGENT_CONFIGS2).includes(agent)) {
      log2(`\u274C Unknown agent: ${agent}`, "red");
      log2(`Supported agents: ${getSupportedAgents2(AGENT_CONFIGS2).join(", ")}`, "yellow");
      throw new Error(`Unknown agent: ${agent}`);
    }
  } else {
    const detectedAgent = detectAgentTool3();
    if (detectedAgent !== "opencode") {
      agent = detectedAgent;
      console.log(`\u{1F4DD} Detected agent: ${getAgentConfig2(AGENT_CONFIGS2, agent).name}`);
    } else {
      console.log("\u{1F4DD} No agent detected or defaulting to OpenCode.");
      agent = await promptForAgent3();
    }
  }
  const config = getAgentConfig2(AGENT_CONFIGS2, agent);
  const agentsDir = import_path2.default.join(cwd, config.dir);
  const processContent = (content) => {
    return content;
  };
  if (options.clear && import_fs2.default.existsSync(agentsDir)) {
    let expectedFiles;
    if (options.merge) {
      expectedFiles = /* @__PURE__ */ new Set([`all-agents${config.extension}`]);
    } else {
      const agentFiles2 = await getAgentFiles();
      expectedFiles = new Set(
        agentFiles2.map((filePath) => {
          const parsedPath = import_path2.default.parse(filePath);
          const baseName = parsedPath.name;
          const dir = parsedPath.dir;
          if (config.flatten) {
            const flattenedName = dir ? `${dir.replace(/[\/\\]/g, "-")}-${baseName}` : baseName;
            return `${flattenedName}${config.extension}`;
          } else {
            return filePath;
          }
        })
      );
    }
    clearObsoleteFiles2(agentsDir, expectedFiles, [config.extension], results2);
  }
  import_fs2.default.mkdirSync(agentsDir, { recursive: true });
  await installMemoryPlugin(cwd);
  const agentFiles = await getAgentFiles();
  console.log(`\u{1F680} Workflow Install Tool`);
  console.log(`=====================`);
  console.log(`\u{1F4DD} Agent: ${config.name}`);
  console.log(`\u{1F4C1} Target: ${agentsDir}`);
  console.log(`\u{1F4CB} Files: ${agentFiles.length}`);
  if (options.merge) {
    console.log(`\u{1F517} Mode: Merge all agents into single file`);
  }
  console.log("");
  if (options.dryRun) {
    console.log("\u2705 Dry run completed - no files were modified");
    return;
  }
  if (options.merge) {
    const mergedFileName = `all-agents${config.extension}`;
    const mergedFilePath = import_path2.default.join(agentsDir, mergedFileName);
    console.log(`\u{1F4CB} Merging ${agentFiles.length} files into ${mergedFileName}...`);
    const pathPrefix = "agents/";
    const mergedContent = createMergedContent(
      agentFiles.map((f) => pathPrefix + f),
      processContent,
      "Development Workflow Agents - Complete Collection",
      pathPrefix
    );
    const localInfo = getLocalFileInfo2(mergedFilePath);
    const localProcessed = localInfo ? processContent(localInfo.content) : "";
    const contentChanged = !localInfo || localProcessed !== mergedContent;
    if (contentChanged) {
      import_fs2.default.writeFileSync(mergedFilePath, mergedContent, "utf8");
      results2.push({
        file: mergedFileName,
        status: localInfo ? "updated" : "added",
        action: localInfo ? "Updated" : "Created"
      });
    } else {
      results2.push({
        file: mergedFileName,
        status: "current",
        action: "Already current"
      });
    }
    displayResults2(results2, agentsDir, config.name, "Install");
  } else {
    await processBatch2(
      agentFiles,
      // Files with relative paths (sdd/file.md, core/file.md)
      agentsDir,
      // Target to .opencode/agent/
      config.extension,
      processContent,
      config.flatten,
      results2,
      "agents/"
      // PathPrefix for source file reading
    );
    displayResults2(results2, agentsDir, config.name, "Install");
  }
}

// src/utils/mcp-config.ts
var import_path3 = __toESM(require("path"), 1);

// src/utils/jsonc.ts
function parseJSONC(content) {
  try {
    let cleaned = removeComments(content);
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Failed to parse JSONC: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
function removeComments(content) {
  let result = "";
  let inString = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let escapeNext = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    if (char === "\\" && inString) {
      result += char;
      escapeNext = true;
      continue;
    }
    if (inString) {
      if (char === '"') {
        inString = false;
      }
      result += char;
      continue;
    }
    if (inSingleLineComment) {
      if (char === "\n") {
        inSingleLineComment = false;
        result += char;
      }
      continue;
    }
    if (inMultiLineComment) {
      if (char === "*" && nextChar === "/") {
        inMultiLineComment = false;
        i++;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }
    if (char === "/" && nextChar === "/") {
      inSingleLineComment = true;
      i++;
      continue;
    }
    if (char === "/" && nextChar === "*") {
      inMultiLineComment = true;
      i++;
      continue;
    }
    result += char;
  }
  return result;
}
function stringifyJSONC(obj, schema, indent = 2) {
  const config = { ...obj };
  if (schema && !config.$schema) {
    config.$schema = schema;
  }
  const json = JSON.stringify(config, null, indent);
  if (config.mcp && Object.keys(config.mcp).length > 0) {
    return json.replace(
      /(\s*)"mcp": {/,
      `$1// MCP (Model Context Protocol) server configuration
$1// See https://modelcontextprotocol.io for more information
$1"mcp": {`
    );
  }
  return json;
}
async function readJSONCFile(filePath) {
  const fs5 = await import("fs/promises");
  const content = await fs5.readFile(filePath, "utf8");
  return parseJSONC(content);
}
async function writeJSONCFile(filePath, obj, schema, indent = 2) {
  const fs5 = await import("fs/promises");
  const content = stringifyJSONC(obj, schema, indent);
  await fs5.writeFile(filePath, content, "utf8");
}

// src/utils/mcp-config.ts
var MCP_SERVERS = {
  memory: {
    name: "flow_memory",
    description: "Flow memory MCP server for agent coordination",
    config: {
      type: "local",
      command: ["npx", "github:sylphxltd/flow", "mcp"]
    }
  },
  everything: {
    name: "mcp_everything",
    description: "MCP Everything server - comprehensive tool collection",
    config: {
      type: "local",
      command: ["npx", "-y", "@modelcontextprotocol/server-everything"]
    }
  }
};
function getOpenCodeConfigPath(cwd) {
  return import_path3.default.join(cwd, "opencode.jsonc");
}
async function readOpenCodeConfig(cwd) {
  const configPath = getOpenCodeConfigPath(cwd);
  try {
    const { existsSync: existsSync2 } = await import("fs");
    if (!existsSync2(configPath)) {
      return {};
    }
    return await readJSONCFile(configPath);
  } catch (error) {
    console.warn(`Warning: Could not read opencode.jsonc: ${error instanceof Error ? error.message : "Unknown error"}`);
    return {};
  }
}
async function writeOpenCodeConfig(cwd, config) {
  const configPath = getOpenCodeConfigPath(cwd);
  const schema = "https://opencode.ai/config.json";
  await writeJSONCFile(configPath, config, schema);
}
async function addMCPServers(cwd, serverTypes) {
  const config = await readOpenCodeConfig(cwd);
  if (!config.mcp) {
    config.mcp = {};
  }
  let addedCount = 0;
  for (const serverType of serverTypes) {
    const server2 = MCP_SERVERS[serverType];
    if (!server2) {
      console.warn(`Warning: Unknown MCP server type: ${serverType}`);
      continue;
    }
    if (config.mcp[server2.name]) {
      console.log(`\u2139\uFE0F  MCP server already exists: ${server2.name}`);
    } else {
      config.mcp[server2.name] = server2.config;
      console.log(`\u{1F4E6} Added MCP server: ${server2.name} (${server2.description})`);
      addedCount++;
    }
  }
  await writeOpenCodeConfig(cwd, config);
  console.log(`\u2705 Updated opencode.jsonc with ${addedCount} new MCP server(s)`);
}
async function listMCPServers(cwd) {
  const config = await readOpenCodeConfig(cwd);
  if (!config.mcp || Object.keys(config.mcp).length === 0) {
    console.log("\u2139\uFE0F  No MCP servers configured");
    return;
  }
  console.log("\u{1F4CB} Currently configured MCP servers:");
  console.log("");
  for (const [name, serverConfig] of Object.entries(config.mcp)) {
    const command = serverConfig.command.join(" ");
    console.log(`  \u2022 ${name}: ${command}`);
    const serverInfo = Object.values(MCP_SERVERS).find((s) => s.name === name);
    if (serverInfo) {
      console.log(`    ${serverInfo.description}`);
    }
    console.log("");
  }
}
function parseMCPServerTypes(args) {
  const servers = [];
  for (const arg of args) {
    if (arg in MCP_SERVERS) {
      servers.push(arg);
    } else {
      console.warn(`Warning: Unknown MCP server '${arg}'. Available: ${Object.keys(MCP_SERVERS).join(", ")}`);
    }
  }
  return servers;
}

// src/commands/init-command.ts
function validateInitOptions(options) {
  options.agent = options.agent || "opencode";
  if (options.agent !== "opencode") {
    throw new CLIError(
      "Currently only opencode is supported for init.",
      "UNSUPPORTED_AGENT"
    );
  }
  if (options.merge) {
    throw new CLIError(
      "The --merge option is not supported with init command.",
      "INVALID_OPTION"
    );
  }
}
var initCommand = {
  name: "init",
  description: "Initialize project with Sylphx Flow development agents and MCP tools",
  options: [
    { flags: "--agent <type>", description: "Force specific agent (default: opencode)" },
    { flags: "--verbose", description: "Show detailed output" },
    { flags: "--dry-run", description: "Show what would be done without making changes" },
    { flags: "--clear", description: "Clear obsolete items before processing" },
    { flags: "--mcp", description: "Install all available MCP tools" }
  ],
  handler: async (options) => {
    validateInitOptions(options);
    console.log("\u{1F680} Initializing Sylphx Flow development environment...");
    console.log(`\u{1F916} Agent: ${options.agent}`);
    if (options.mcp) {
      console.log("\u{1F527} Installing MCP tools...");
      if (!options.dryRun) {
        await addMCPServers(process.cwd(), ["memory", "everything"]);
        console.log("\u2705 MCP tools installed");
      } else {
        console.log("\u{1F50D} Dry run: Would install MCP tools: memory, everything");
      }
      console.log("");
    }
    await installAgents(options);
    console.log("");
    console.log("\u{1F389} Sylphx Flow initialization complete!");
    console.log("\u{1F4D6} Next steps:");
    console.log("   - Start MCP server: sylphx-flow mcp start");
    console.log("   - List available MCP tools: sylphx-flow mcp list");
  }
};

// src/commands/mcp-command.ts
var mcpStartHandler = async () => {
  await Promise.resolve().then(() => (init_sylphx_flow_mcp_server(), sylphx_flow_mcp_server_exports));
  console.log("\u{1F680} Starting Sylphx Flow MCP Server...");
  console.log("\u{1F4CD} Database: .memory/memory.json");
  console.log("\u{1F527} Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats");
  console.log("\u{1F4A1} Press Ctrl+C to stop the server");
  process.stdin.resume();
};
var mcpInstallHandler = async (options) => {
  const servers = options.servers || [];
  if (options.all) {
    console.log("\u{1F527} Installing all available MCP tools...");
    if (!options.dryRun) {
      await addMCPServers(process.cwd(), ["memory", "everything"]);
      console.log("\u2705 All MCP tools installed");
    } else {
      console.log("\u{1F50D} Dry run: Would install MCP tools: memory, everything");
    }
    return;
  }
  if (servers.length === 0) {
    throw new CLIError(
      "Please specify MCP tools to install or use --all",
      "NO_SERVERS_SPECIFIED"
    );
  }
  const validServers = parseMCPServerTypes(servers);
  if (validServers.length === 0) {
    throw new CLIError(
      "Invalid MCP tools. Available: memory, everything",
      "INVALID_MCP_SERVERS"
    );
  }
  console.log(`\u{1F527} Installing MCP tools: ${validServers.join(", ")}`);
  if (!options.dryRun) {
    await addMCPServers(process.cwd(), validServers);
    console.log("\u2705 MCP tools installed");
  } else {
    console.log("\u{1F50D} Dry run: Would install MCP tools:", validServers.join(", "));
  }
};
var mcpListHandler = async () => {
  await listMCPServers(process.cwd());
};
var mcpCommand = {
  name: "mcp",
  description: "Manage MCP (Model Context Protocol) tools and servers",
  options: [],
  subcommands: [
    {
      name: "start",
      description: "Start the Sylphx Flow MCP server",
      options: [],
      handler: mcpStartHandler
    },
    {
      name: "install",
      description: "Install MCP tools for OpenCode",
      options: [
        { flags: "<servers...>", description: "MCP tools to install (memory, everything)" },
        { flags: "--all", description: "Install all available MCP tools" },
        { flags: "--dry-run", description: "Show what would be done without making changes" }
      ],
      handler: mcpInstallHandler
    },
    {
      name: "list",
      description: "List all available MCP tools",
      options: [],
      handler: mcpListHandler
    }
  ]
};

// src/cli.ts
function createCLI() {
  const program = new import_commander2.Command();
  program.name("sylphx-flow").description("Sylphx Flow - Type-safe development flow CLI").version("1.0.0");
  const commands = [syncCommand, initCommand, mcpCommand];
  commands.forEach((commandConfig) => {
    program.addCommand(createCommand(commandConfig));
  });
  program.action(() => {
    showDefaultHelp();
  });
  return program;
}
function runCLI() {
  const program = createCLI();
  if (process.argv.length === 2) {
    program.help();
  }
  program.parse();
}

// src/index.ts
runCLI();
