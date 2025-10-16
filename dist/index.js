#!/usr/bin/env node

// src/cli.ts
import { Command as Command2 } from "commander";

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

// src/utils/mcp-config.ts
import path from "path";

// src/utils/jsonc.ts
function parseJSONC(content) {
  try {
    let cleaned = removeComments(content);
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(
      `Failed to parse JSONC: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
  const fs4 = await import("fs/promises");
  const content = await fs4.readFile(filePath, "utf8");
  return parseJSONC(content);
}
async function writeJSONCFile(filePath, obj, schema, indent = 2) {
  const fs4 = await import("fs/promises");
  const content = stringifyJSONC(obj, schema, indent);
  await fs4.writeFile(filePath, content, "utf8");
}

// src/utils/mcp-config.ts
var MCP_SERVERS = {
  memory: {
    name: "flow_memory",
    description: "Flow memory MCP server for agent coordination",
    config: {
      type: "local",
      command: ["npx", "github:sylphxltd/flow", "mcp", "start"]
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
  return path.join(cwd, "opencode.jsonc");
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
    console.warn(
      `Warning: Could not read opencode.jsonc: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
    const server = MCP_SERVERS[serverType];
    if (!server) {
      console.warn(`Warning: Unknown MCP server type: ${serverType}`);
      continue;
    }
    if (config.mcp[server.name]) {
      console.log(`\u2139\uFE0F  MCP server already exists: ${server.name}`);
    } else {
      config.mcp[server.name] = server.config;
      console.log(`\u{1F4E6} Added MCP server: ${server.name} (${server.description})`);
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
      console.warn(
        `Warning: Unknown MCP server '${arg}'. Available: ${Object.keys(MCP_SERVERS).join(", ")}`
      );
    }
  }
  return servers;
}

// src/core/install.ts
import fs2 from "fs";
import path3 from "path";

// src/shared.ts
import fs from "fs";
import path2 from "path";
function log(message, color = "white") {
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
function getSupportedAgents(configs) {
  return Object.keys(configs);
}
function getAgentConfig(configs, agent) {
  const config = configs[agent];
  if (!config) {
    throw new Error(`Agent configuration not found: ${agent}`);
  }
  return config;
}
async function promptForAgent(configs, toolName) {
  const supportedAgents = getSupportedAgents(configs);
  console.log(`
\u{1F4DD} ${toolName}`);
  console.log("================");
  console.log("Available agents:");
  supportedAgents.forEach((agent, index) => {
    const config = getAgentConfig(configs, agent);
    console.log(`  ${index + 1}. ${config.name} - ${config.description}`);
  });
  return supportedAgents[0];
}
function detectAgentTool(_configs, defaultAgent = "opencode") {
  return defaultAgent;
}
function collectFiles(dir, extensions) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = [];
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path2.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (extensions.some((ext) => item.endsWith(ext))) {
        const relativePath = path2.relative(dir, fullPath);
        files.push(relativePath);
      }
    }
  }
  traverse(dir);
  return files.sort();
}
function getLocalFileInfo(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, "utf8");
  return {
    content,
    mtime: stat.mtime
  };
}
function clearObsoleteFiles(targetDir, expectedFiles, extensions, results2) {
  if (!fs.existsSync(targetDir)) {
    return;
  }
  const items = fs.readdirSync(targetDir);
  for (const item of items) {
    const itemPath = path2.join(targetDir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isFile()) {
      const hasValidExtension = extensions.some((ext) => item.endsWith(ext));
      if (hasValidExtension && !expectedFiles.has(item)) {
        fs.unlinkSync(itemPath);
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
  sections.push("*This file was automatically generated by merging multiple agent files.*");
  sections.push(`*Source path prefix: ${pathPrefix}*`);
  sections.push("");
  sections.push("---");
  sections.push("");
  for (const filePath of filePaths) {
    const fullPath = path2.resolve(filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const processedContent = processContent(content);
      sections.push(`## ${path2.basename(filePath, ".md")}`);
      sections.push("");
      sections.push(processedContent);
      sections.push("");
      sections.push("---");
      sections.push("");
    }
  }
  return sections.join("\n");
}
function processBatch(filePaths, targetDir, extension, processContent, flatten, results2, pathPrefix = "") {
  for (const filePath of filePaths) {
    const destPath = flatten ? path2.join(targetDir, `${path2.basename(filePath, path2.extname(filePath))}${extension}`) : path2.join(targetDir, filePath);
    const destDir = path2.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const localInfo = getLocalFileInfo(destPath);
    const isNew = !localInfo;
    const projectRoot = process.cwd();
    const sourcePath = path2.join(projectRoot, pathPrefix, filePath);
    let content = fs.readFileSync(sourcePath, "utf8");
    content = processContent(content);
    const localProcessed = localInfo ? processContent(localInfo.content) : "";
    const contentChanged = !localInfo || localProcessed !== content;
    if (contentChanged) {
      const destDirPath = path2.dirname(destPath);
      if (!fs.existsSync(destDirPath)) {
        fs.mkdirSync(destDirPath, { recursive: true });
      }
      fs.writeFileSync(destPath, content, "utf8");
      results2.push({
        file: path2.relative(targetDir, destPath),
        status: isNew ? "added" : "updated",
        action: isNew ? "Created" : "Updated"
      });
    } else {
      results2.push({
        file: path2.relative(targetDir, destPath),
        status: "current",
        action: "Already current"
      });
    }
  }
}
function displayResults(results2, targetDir, agentName, operation) {
  console.log(`
\u{1F4CA} ${operation} Results for ${agentName}`);
  console.log("=====================================");
  const grouped = results2.reduce(
    (acc, result) => {
      if (!acc[result.status]) {
        acc[result.status] = [];
      }
      acc[result.status].push(result);
      return acc;
    },
    {}
  );
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
      log(`${status.toUpperCase()} (${items.length}):`, color);
      for (const item of items) {
        log(`  ${item.file} - ${item.action}`, color);
      }
      console.log("");
    }
  }
  const total = results2.length;
  const changed = results2.filter((r) => r.status === "added" || r.status === "updated").length;
  if (changed > 0) {
    log(`\u2705 ${operation} complete: ${changed}/${total} files modified`, "green");
  } else {
    log(`\u2705 ${operation} complete: All ${total} files already current`, "blue");
  }
  console.log(`\u{1F4C1} Target directory: ${targetDir}`);
}

// src/core/install.ts
var AGENT_CONFIGS = {
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
  const agentsDir = path3.join(process.cwd(), "agents");
  const subdirs = fs2.readdirSync(agentsDir, { withFileTypes: true }).filter((dirent) => dirent.isDirectory() && dirent.name !== "archived").map((dirent) => dirent.name);
  const allFiles = [];
  for (const subdir of subdirs) {
    const subdirPath = path3.join(agentsDir, subdir);
    const files = collectFiles(subdirPath, [".md"]);
    allFiles.push(...files.map((file) => path3.join(subdir, file)));
  }
  return allFiles;
}
async function promptForAgent2() {
  const result = await promptForAgent(AGENT_CONFIGS, "Workflow Install Tool");
  return result;
}
function detectAgentTool2() {
  const result = detectAgentTool(AGENT_CONFIGS, "opencode");
  return result;
}
async function installMemoryPlugin(cwd) {
  const pluginDir = path3.join(cwd, ".opencode", "plugin");
  const pluginFile = path3.join(pluginDir, "memory-tools.ts");
  fs2.mkdirSync(pluginDir, { recursive: true });
  if (fs2.existsSync(pluginFile)) {
    console.log("\u{1F4E6} Memory plugin already exists, skipping...");
    return;
  }
  const sourcePlugin = path3.join(process.cwd(), "src", "opencode", "plugins", "memory-tools.ts");
  if (fs2.existsSync(sourcePlugin)) {
    fs2.copyFileSync(sourcePlugin, pluginFile);
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
    fs2.writeFileSync(pluginFile, pluginContent, "utf8");
    console.log("\u{1F4E6} Created memory plugin for agent coordination");
  }
}
async function installAgents(options) {
  const cwd = process.cwd();
  const results2 = [];
  let agent;
  if (options.agent) {
    agent = options.agent.toLowerCase();
    if (!getSupportedAgents(AGENT_CONFIGS).includes(agent)) {
      log(`\u274C Unknown agent: ${agent}`, "red");
      log(`Supported agents: ${getSupportedAgents(AGENT_CONFIGS).join(", ")}`, "yellow");
      throw new Error(`Unknown agent: ${agent}`);
    }
  } else {
    const detectedAgent = detectAgentTool2();
    if (detectedAgent !== "opencode") {
      agent = detectedAgent;
      console.log(`\u{1F4DD} Detected agent: ${getAgentConfig(AGENT_CONFIGS, agent).name}`);
    } else {
      console.log("\u{1F4DD} No agent detected or defaulting to OpenCode.");
      agent = await promptForAgent2();
    }
  }
  const config = getAgentConfig(AGENT_CONFIGS, agent);
  const agentsDir = path3.join(cwd, config.dir);
  const processContent = (content) => {
    return content;
  };
  if (options.clear && fs2.existsSync(agentsDir)) {
    let expectedFiles;
    if (options.merge) {
      expectedFiles = /* @__PURE__ */ new Set([`all-agents${config.extension}`]);
    } else {
      const agentFiles2 = await getAgentFiles();
      expectedFiles = new Set(
        agentFiles2.map((filePath) => {
          const parsedPath = path3.parse(filePath);
          const baseName = parsedPath.name;
          const dir = parsedPath.dir;
          if (config.flatten) {
            const flattenedName = dir ? `${dir.replace(/[\/\\]/g, "-")}-${baseName}` : baseName;
            return `${flattenedName}${config.extension}`;
          }
          return filePath;
        })
      );
    }
    clearObsoleteFiles(agentsDir, expectedFiles, [config.extension], results2);
  }
  fs2.mkdirSync(agentsDir, { recursive: true });
  await installMemoryPlugin(cwd);
  const agentFiles = await getAgentFiles();
  console.log("\u{1F680} Workflow Install Tool");
  console.log("=====================");
  console.log(`\u{1F4DD} Agent: ${config.name}`);
  console.log(`\u{1F4C1} Target: ${agentsDir}`);
  console.log(`\u{1F4CB} Files: ${agentFiles.length}`);
  if (options.merge) {
    console.log("\u{1F517} Mode: Merge all agents into single file");
  }
  console.log("");
  if (options.dryRun) {
    console.log("\u2705 Dry run completed - no files were modified");
    return;
  }
  if (options.merge) {
    const mergedFileName = `all-agents${config.extension}`;
    const mergedFilePath = path3.join(agentsDir, mergedFileName);
    console.log(`\u{1F4CB} Merging ${agentFiles.length} files into ${mergedFileName}...`);
    const pathPrefix = "agents/";
    const mergedContent = createMergedContent(
      agentFiles.map((f) => pathPrefix + f),
      processContent,
      "Development Workflow Agents - Complete Collection",
      pathPrefix
    );
    const localInfo = getLocalFileInfo(mergedFilePath);
    const localProcessed = localInfo ? processContent(localInfo.content) : "";
    const contentChanged = !localInfo || localProcessed !== mergedContent;
    if (contentChanged) {
      fs2.writeFileSync(mergedFilePath, mergedContent, "utf8");
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
    displayResults(results2, agentsDir, config.name, "Install");
  } else {
    processBatch(
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
    displayResults(results2, agentsDir, config.name, "Install");
  }
}

// src/commands/init-command.ts
function validateInitOptions(options) {
  options.agent = options.agent || "opencode";
  if (options.agent !== "opencode") {
    throw new CLIError("Currently only opencode is supported for init.", "UNSUPPORTED_AGENT");
  }
  if (options.merge) {
    throw new CLIError("The --merge option is not supported with init command.", "INVALID_OPTION");
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
      if (options.dryRun) {
        console.log("\u{1F50D} Dry run: Would install MCP tools: memory, everything");
      } else {
        await addMCPServers(process.cwd(), ["memory", "everything"]);
        console.log("\u2705 MCP tools installed");
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
  await import("./sylphx-flow-mcp-server-F73DHS7G.js");
  console.log("\u{1F680} Starting Sylphx Flow MCP Server...");
  console.log("\u{1F4CD} Database: .memory/memory.json");
  console.log(
    "\u{1F527} Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats"
  );
  console.log("\u{1F4A1} Press Ctrl+C to stop the server");
  process.stdin.resume();
};
var mcpInstallHandler = async (options) => {
  const servers = options.servers || [];
  if (options.all) {
    console.log("\u{1F527} Installing all available MCP tools...");
    if (options.dryRun) {
      console.log("\u{1F50D} Dry run: Would install MCP tools: memory, everything");
    } else {
      await addMCPServers(process.cwd(), ["memory", "everything"]);
      console.log("\u2705 All MCP tools installed");
    }
    return;
  }
  if (servers.length === 0) {
    throw new CLIError("Please specify MCP tools to install or use --all", "NO_SERVERS_SPECIFIED");
  }
  const validServers = parseMCPServerTypes(servers);
  if (validServers.length === 0) {
    throw new CLIError("Invalid MCP tools. Available: memory, everything", "INVALID_MCP_SERVERS");
  }
  console.log(`\u{1F527} Installing MCP tools: ${validServers.join(", ")}`);
  if (options.dryRun) {
    console.log("\u{1F50D} Dry run: Would install MCP tools:", validServers.join(", "));
  } else {
    await addMCPServers(process.cwd(), validServers);
    console.log("\u2705 MCP tools installed");
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

// src/utils/command-builder.ts
import { Command } from "commander";
function createCommand(config) {
  const command = new Command(config.name);
  command.description(config.description);
  for (const option of config.options) {
    command.option(option.flags, option.description);
  }
  if (config.subcommands) {
    for (const subcommand of config.subcommands) {
      command.addCommand(createCommand(subcommand));
    }
  }
  if (config.handler) {
    const handler = createAsyncHandler(config.handler, config.name);
    if (config.validator) {
      command.action((options) => {
        config.validator?.(options);
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

// src/core/sync.ts
import * as fs3 from "fs";
import * as path4 from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import * as cliProgress from "cli-progress";
import Table from "cli-table3";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path4.dirname(__filename);
var COLORS = {
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  reset: "\x1B[0m"
};
var AGENT_CONFIGS2 = {
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
var log2 = (message, color = "reset") => {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
};
var getSupportedAgents2 = () => Object.keys(AGENT_CONFIGS2);
var getAgentConfig2 = (agent) => AGENT_CONFIGS2[agent];
async function promptForAgent3() {
  const agents = getSupportedAgents2();
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
      const config = getAgentConfig2(agent);
      console.log(`${index + 1}. ${config.name} - ${config.description}`);
    });
    console.log("");
    const askChoice = () => {
      rl.question(`Enter your choice (1-${agents.length}): `, (answer) => {
        const choice = Number.parseInt(answer.trim());
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
function detectAgentTool3() {
  const cwd = process.cwd();
  const agentArg = process.argv.find((arg) => arg.startsWith("--agent="));
  if (agentArg) {
    const agent = agentArg.split("=")[1].toLowerCase();
    if (getSupportedAgents2().includes(agent)) {
      return agent;
    }
  }
  for (const agent of getSupportedAgents2()) {
    const config = getAgentConfig2(agent);
    if (fs3.existsSync(path4.join(cwd, config.dir))) {
      return agent;
    }
  }
  for (const agent of getSupportedAgents2()) {
    const config = getAgentConfig2(agent);
    if (fs3.existsSync(path4.join(cwd, config.dir, RULES_DIR_NAME))) {
      return agent;
    }
  }
  return "cursor";
}
function getLocalFileInfo2(filePath) {
  try {
    if (!fs3.existsSync(filePath)) {
      return null;
    }
    const content = fs3.readFileSync(filePath, "utf8");
    return { content, exists: true };
  } catch {
    return null;
  }
}
async function getRuleFiles() {
  const scriptDir = __dirname;
  let projectRoot;
  if (scriptDir.includes("/dist/src/")) {
    projectRoot = path4.resolve(scriptDir, "../../..");
  } else {
    projectRoot = path4.resolve(scriptDir, "..");
  }
  const docsRulesDir = path4.join(projectRoot, "docs", RULES_DIR_NAME);
  const files = [];
  const collectFiles2 = (dir, relativePath) => {
    try {
      const items = fs3.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const itemPath = path4.join(dir, item.name);
        const itemRelative = path4.join(relativePath, item.name);
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
  if (!filePath) {
    return "Development flow";
  }
  const baseName = path4.basename(filePath, path4.extname(filePath));
  return `Development flow for ${baseName.replace(/-/g, " ")}`;
}
function createContentProcessor(config) {
  return (content, filePath) => {
    if (config.stripYaml) {
      return stripYamlFrontMatter(content);
    }
    const yamlFrontMatter = `---
description: ${getDescriptionForFile(filePath)}
globs: ["**/*"]
alwaysApply: true
---

`;
    return yamlFrontMatter + content;
  };
}
function getDestinationPath(filePath, rulesDir, config) {
  const relativeToRules = filePath.substring(`${RULES_DIR_NAME}/`.length);
  const parsedPath = path4.parse(relativeToRules);
  const { name: baseName, dir } = parsedPath;
  if (config.flatten) {
    const flattenedName = dir ? `${dir.replace(/[\/\\]/g, "-")}-${baseName}` : baseName;
    const relativePath2 = `${flattenedName}${config.extension}`;
    return { relativePath: relativePath2, destPath: path4.join(rulesDir, relativePath2) };
  }
  const targetDir = dir ? path4.join(rulesDir, dir) : rulesDir;
  const relativePath = path4.join(dir, `${baseName}${config.extension}`);
  return {
    relativePath,
    destPath: path4.join(targetDir, `${baseName}${config.extension}`),
    targetDir
  };
}
async function processFile(filePath, rulesDir, config, processContent, progressBar) {
  try {
    const { relativePath, destPath, targetDir } = getDestinationPath(filePath, rulesDir, config);
    if (targetDir && !fs3.existsSync(targetDir)) {
      fs3.mkdirSync(targetDir, { recursive: true });
    }
    const localInfo = getLocalFileInfo2(destPath);
    const isNew = !localInfo;
    let projectRoot;
    if (__dirname.includes("/dist/src/")) {
      projectRoot = path4.resolve(__dirname, "../../..");
    } else {
      projectRoot = path4.resolve(__dirname, "..");
    }
    const sourcePath = path4.join(projectRoot, "docs", filePath);
    let content = fs3.readFileSync(sourcePath, "utf8");
    content = processContent(content, filePath);
    const localProcessed = localInfo ? processContent(localInfo.content, filePath) : "";
    const contentChanged = !localInfo || localProcessed !== content;
    if (contentChanged) {
      fs3.writeFileSync(destPath, content, "utf8");
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
async function processBatch2(batch, rulesDir, config, processContent, progressBar) {
  const promises = batch.map(
    (filePath) => processFile(filePath, rulesDir, config, processContent, progressBar)
  );
  await Promise.all(promises);
}
function createStatusTable(title, items) {
  if (items.length === 0) {
    return;
  }
  console.log(`
${title} (${items.length}):`);
  const table = new Table({
    head: ["File", "Action"],
    colWidths: [50, 20],
    style: { head: ["cyan"], border: ["gray"] },
    chars: {
      top: "\u2550",
      "top-mid": "\u2564",
      "top-left": "\u2554",
      "top-right": "\u2557",
      bottom: "\u2550",
      "bottom-mid": "\u2567",
      "bottom-left": "\u255A",
      "bottom-right": "\u255D",
      left: "\u2551",
      "left-mid": "",
      mid: "",
      "mid-mid": "",
      right: "\u2551",
      "right-mid": "",
      middle: "\u2502"
    }
  });
  items.forEach((result) => {
    table.push([
      result.file.length > 47 ? `${result.file.substring(0, 47)}...` : result.file,
      { content: result.action, vAlign: "center" }
    ]);
  });
  console.log(table.toString());
}
function displayResults2(results2, rulesDir, agentName) {
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
  if (statusGroups.errors.length > 0) {
    createStatusTable("\u274C Errors", statusGroups.errors);
  }
  console.log("\n\u{1F389} Sync completed!");
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
async function clearObsoleteFiles2(rulesDir, config, merge) {
  if (!fs3.existsSync(rulesDir)) {
    return;
  }
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
  const existingFiles = fs3.readdirSync(rulesDir, { recursive: true }).filter(
    (file) => typeof file === "string" && (file.endsWith(".mdc") || file.endsWith(".md"))
  ).map((file) => path4.join(rulesDir, file));
  for (const file of existingFiles) {
    const relativePath = path4.relative(rulesDir, file);
    if (!expectedFiles.has(relativePath)) {
      try {
        fs3.unlinkSync(file);
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
  const mergedFilePath = path4.join(rulesDir, mergedFileName);
  console.log(`\u{1F4CB} Merging ${ruleFiles.length} files into ${mergedFileName}...`);
  let mergedContent = "# Development Rules - Complete Collection\n\n";
  mergedContent += `Generated on: ${(/* @__PURE__ */ new Date()).toISOString()}

`;
  mergedContent += "---\n\n";
  for (const filePath of ruleFiles) {
    try {
      let projectRoot;
      if (__dirname.includes("/dist/src/")) {
        projectRoot = path4.resolve(__dirname, "../../..");
      } else {
        projectRoot = path4.resolve(__dirname, "..");
      }
      const sourcePath = path4.join(projectRoot, "docs", filePath);
      let content = fs3.readFileSync(sourcePath, "utf8");
      content = processContent(content, filePath);
      const relativeToRules = filePath.substring(`${RULES_DIR_NAME}/`.length);
      const parsedPath = path4.parse(relativeToRules);
      const { name: baseName, dir } = parsedPath;
      const sectionTitle = dir ? `${dir}/${baseName}` : baseName;
      mergedContent += `## ${sectionTitle.replace(/-/g, " ").toUpperCase()}

`;
      mergedContent += `${content}

`;
      mergedContent += "---\n\n";
    } catch (error) {
      results.push({
        file: filePath,
        status: "error",
        action: `Error reading: ${error.message}`
      });
    }
  }
  const localInfo = getLocalFileInfo2(mergedFilePath);
  const localProcessed = localInfo ? processContent(localInfo.content, "all-rules") : "";
  const contentChanged = !localInfo || localProcessed !== mergedContent;
  if (contentChanged) {
    fs3.writeFileSync(mergedFilePath, mergedContent, "utf8");
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
    if (!getSupportedAgents2().includes(agent)) {
      log2(`\u274C Unknown agent: ${agent}`, "red");
      log2(`Supported agents: ${getSupportedAgents2().join(", ")}`, "yellow");
      throw new Error(`Unknown agent: ${agent}`);
    }
  } else {
    const detectedAgent = detectAgentTool3();
    if (detectedAgent !== "cursor") {
      agent = detectedAgent;
      console.log(`\u{1F4DD} Detected agent: ${getAgentConfig2(agent).name}`);
    } else {
      console.log("\u{1F4DD} No agent detected or defaulting to Cursor.");
      agent = await promptForAgent3();
    }
  }
  const config = getAgentConfig2(agent);
  const rulesDir = path4.join(cwd, config.dir, RULES_DIR_NAME);
  const processContent = createContentProcessor(config);
  if (options.clear) {
    await clearObsoleteFiles2(rulesDir, config, !!options.merge);
  }
  fs3.mkdirSync(rulesDir, { recursive: true });
  const ruleFiles = await getRuleFiles();
  console.log("\u{1F680} Rules Sync Tool");
  console.log("================");
  console.log(`\u{1F4DD} Agent: ${config.name}`);
  console.log(`\u{1F4C1} Target: ${rulesDir}`);
  console.log(`\u{1F4CB} Files: ${ruleFiles.length}`);
  if (options.merge) {
    console.log("\u{1F517} Mode: Merge all rules into single file");
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
      processBatch2(batch, rulesDir, config, processContent, progressBar);
    }
    progressBar.stop();
  }
  displayResults2(results, rulesDir, config.name);
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

// src/cli.ts
function createCLI() {
  const program = new Command2();
  program.name("sylphx-flow").description("Sylphx Flow - Type-safe development flow CLI").version("1.0.0");
  const commands = [syncCommand, initCommand, mcpCommand];
  for (const commandConfig of commands) {
    program.addCommand(createCommand(commandConfig));
  }
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
