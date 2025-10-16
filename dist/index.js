#!/usr/bin/env node
import {
  LibSQLMemoryStorage
} from "./chunk-VBFBG4QV.js";

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
    name: "sylphx_flow",
    description: "Sylphx Flow MCP server for agent coordination",
    config: {
      type: "local",
      command: ["npx", "-y", "github:sylphxltd/flow", "mcp", "start"]
    }
  },
  "gpt-image": {
    name: "gpt-image-1-mcp",
    description: "GPT Image generation MCP server",
    config: {
      type: "local",
      command: ["npx", "@napolab/gpt-image-1-mcp"],
      environment: { OPENAI_API_KEY: "" }
    },
    requiredEnvVars: ["OPENAI_API_KEY"]
  },
  perplexity: {
    name: "perplexity-ask",
    description: "Perplexity Ask MCP server for search and queries",
    config: {
      type: "local",
      command: ["npx", "-y", "server-perplexity-ask"],
      environment: { PERPLEXITY_API_KEY: "" }
    },
    requiredEnvVars: ["PERPLEXITY_API_KEY"]
  },
  context7: {
    name: "context7",
    description: "Context7 HTTP MCP server",
    config: {
      type: "remote",
      url: "https://mcp.context7.com/mcp"
    }
  },
  "gemini-search": {
    name: "gemini-google-search",
    description: "Gemini Google Search MCP server",
    config: {
      type: "local",
      command: ["npx", "-y", "mcp-gemini-google-search"],
      environment: { GEMINI_API_KEY: "", GEMINI_MODEL: "gemini-2.5-flash" }
    },
    requiredEnvVars: ["GEMINI_API_KEY"]
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
    let configInfo = "";
    if (serverConfig.type === "local") {
      configInfo = serverConfig.command.join(" ");
    } else if (serverConfig.type === "remote") {
      configInfo = `HTTP: ${serverConfig.url}`;
    }
    console.log(`  \u2022 ${name}: ${configInfo}`);
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
async function promptForAPIKeys(serverTypes) {
  const { createInterface: createInterface2 } = await import("readline");
  const rl = createInterface2({
    input: process.stdin,
    output: process.stdout
  });
  const apiKeys = {};
  for (const serverType of serverTypes) {
    const server = MCP_SERVERS[serverType];
    if (!server?.requiredEnvVars?.length) continue;
    console.log(`
\u{1F511} Configuring API keys for ${server.description}:`);
    for (const envVar of server.requiredEnvVars) {
      const question = `Enter ${envVar} (or press Enter to skip): `;
      const answer = await new Promise((resolve2) => {
        rl.question(question, (input) => {
          resolve2(input.trim());
        });
      });
      if (answer) {
        apiKeys[envVar] = answer;
        console.log(`\u2705 Set ${envVar}`);
      } else {
        console.log(
          `\u26A0\uFE0F  Skipped ${envVar} - you can configure it later with 'mcp config ${serverType}'`
        );
      }
    }
  }
  rl.close();
  return apiKeys;
}
async function configureMCPServer(cwd, serverType) {
  const server = MCP_SERVERS[serverType];
  if (!server) {
    console.error(`\u274C Unknown MCP server: ${serverType}`);
    return;
  }
  if (!server.requiredEnvVars?.length) {
    console.log(`\u2139\uFE0F  ${server.name} does not require any API keys`);
    return;
  }
  console.log(`\u{1F527} Configuring ${server.description}...`);
  const apiKeys = await promptForAPIKeys([serverType]);
  if (Object.keys(apiKeys).length === 0) {
    console.log("\u274C No API keys provided");
    return;
  }
  const config = await readOpenCodeConfig(cwd);
  if (!config.mcp) {
    config.mcp = {};
  }
  const currentConfig = config.mcp[server.name];
  if (currentConfig && currentConfig.type === "local") {
    config.mcp[server.name] = {
      ...currentConfig,
      environment: {
        ...currentConfig.environment || {},
        ...apiKeys
      }
    };
  } else {
    const baseConfig = server.config;
    if (baseConfig.type === "local") {
      config.mcp[server.name] = {
        ...baseConfig,
        environment: {
          ...baseConfig.environment || {},
          ...apiKeys
        }
      };
    } else {
      config.mcp[server.name] = baseConfig;
    }
  }
  await writeOpenCodeConfig(cwd, config);
  console.log(`\u2705 Updated ${server.name} with API keys`);
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
function displayResults(results2, targetDir, agentName, operation, verbose = false) {
  if (!verbose) {
    const total2 = results2.length;
    const changed2 = results2.filter((r) => r.status === "added" || r.status === "updated").length;
    if (changed2 > 0) {
      console.log(`\u2705 ${changed2} files updated`);
    } else {
      console.log(`\u2705 All ${total2} files already current`);
    }
    return;
  }
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
  const scriptPath = path3.resolve(process.argv[1]);
  const scriptDir = path3.dirname(scriptPath);
  const agentsDir = path3.join(scriptDir, "..", "agents");
  if (!fs2.existsSync(agentsDir)) {
    throw new Error(`Could not find agents directory at: ${agentsDir}`);
  }
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
    clearObsoleteFiles(agentsDir, expectedFiles, [config.extension], results2);
  }
  fs2.mkdirSync(agentsDir, { recursive: true });
  const agentFiles = await getAgentFiles();
  if (!options.quiet) {
    console.log(
      `\u{1F4C1} Installing ${agentFiles.length} agents to ${agentsDir.replace(process.cwd() + "/", "")}`
    );
    console.log("");
  }
  if (options.dryRun) {
    console.log("\u2705 Dry run completed - no files were modified");
    return;
  }
  const scriptPath = path3.resolve(process.argv[1]);
  const scriptDir = path3.dirname(scriptPath);
  const agentsSourceDir = path3.join(scriptDir, "agents");
  for (const agentFile of agentFiles) {
    const sourcePath = path3.join(agentsSourceDir, agentFile);
    const destPath = path3.join(agentsDir, agentFile);
    const destDir = path3.dirname(destPath);
    if (!fs2.existsSync(destDir)) {
      fs2.mkdirSync(destDir, { recursive: true });
    }
    const localInfo = getLocalFileInfo(destPath);
    const isNew = !localInfo;
    let content = fs2.readFileSync(sourcePath, "utf8");
    content = processContent(content);
    const localProcessed = localInfo ? processContent(localInfo.content) : "";
    const contentChanged = !localInfo || localProcessed !== content;
    if (contentChanged) {
      fs2.writeFileSync(destPath, content, "utf8");
      results2.push({
        file: agentFile,
        status: localInfo ? "updated" : "added",
        action: localInfo ? "Updated" : "Created"
      });
    } else {
      results2.push({
        file: agentFile,
        status: "current",
        action: "Already current"
      });
    }
  }
  displayResults(results2, agentsDir, config.name, "Install", options.verbose);
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
    { flags: "--no-mcp", description: "Skip MCP tools installation" }
  ],
  handler: async (options) => {
    validateInitOptions(options);
    console.log("\u{1F680} Sylphx Flow Setup");
    console.log("======================");
    console.log(`\u{1F916} Agent: ${options.agent}`);
    console.log("");
    if (options.mcp !== false) {
      console.log("\u{1F4E6} Installing MCP tools...");
      if (options.dryRun) {
        console.log("\u{1F50D} Dry run: Would install all MCP servers");
        console.log("   \u2022 memory, gpt-image, perplexity, context7, gemini-search");
      } else {
        const allServers = [
          "memory",
          "gpt-image",
          "perplexity",
          "context7",
          "gemini-search"
        ];
        await addMCPServers(process.cwd(), allServers);
        const serversNeedingKeys = allServers.filter(
          (server) => ["gpt-image", "perplexity", "gemini-search"].includes(server)
        );
        if (serversNeedingKeys.length > 0) {
          console.log("\n\u{1F511} Some MCP tools require API keys:");
          const apiKeys = await promptForAPIKeys(serversNeedingKeys);
          if (Object.keys(apiKeys).length > 0) {
            for (const serverType of serversNeedingKeys) {
              await configureMCPServer(process.cwd(), serverType);
            }
          }
        }
        console.log("\u2705 MCP tools configured");
      }
      console.log("");
    }
    await installAgents(options);
    console.log("");
    console.log("\u{1F389} Setup complete!");
    console.log("");
    console.log("\u{1F4CB} Next steps:");
    console.log("   \u2022 Open OpenCode and start using your agents!");
    if (options.mcp !== false) {
      console.log("   \u2022 MCP tools will be automatically loaded by OpenCode");
    }
  }
};

// src/commands/mcp-command.ts
var mcpStartHandler = async () => {
  await import("./sylphx-flow-mcp-server-F56I7NIY.js");
  console.log("\u{1F680} Starting Sylphx Flow MCP Server...");
  console.log("\u{1F4CD} Database: .sylphx-flow/memory.db");
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
      console.log(
        "\u{1F50D} Dry run: Would install all MCP tools: memory, gpt-image, perplexity, context7, gemini-search"
      );
    } else {
      const allServers = [
        "memory",
        "gpt-image",
        "perplexity",
        "context7",
        "gemini-search"
      ];
      await addMCPServers(process.cwd(), allServers);
      console.log("\u2705 All MCP tools installed");
    }
    return;
  }
  if (servers.length === 0) {
    throw new CLIError("Please specify MCP tools to install or use --all", "NO_SERVERS_SPECIFIED");
  }
  const validServers = parseMCPServerTypes(servers);
  if (validServers.length === 0) {
    const availableServers = ["memory", "gpt-image", "perplexity", "context7", "gemini-search"];
    throw new CLIError(
      `Invalid MCP tools. Available: ${availableServers.join(", ")}`,
      "INVALID_MCP_SERVERS"
    );
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
var mcpConfigHandler = async (options) => {
  const server = options.server;
  if (!server) {
    throw new CLIError("Please specify a server to configure", "NO_SERVER_SPECIFIED");
  }
  const validServers = parseMCPServerTypes([server]);
  if (validServers.length === 0) {
    const availableServers = ["memory", "gpt-image", "perplexity", "context7", "gemini-search"];
    throw new CLIError(
      `Invalid MCP server: ${server}. Available: ${availableServers.join(", ")}`,
      "INVALID_MCP_SERVER"
    );
  }
  await configureMCPServer(process.cwd(), validServers[0]);
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
        {
          flags: "<servers...>",
          description: "MCP tools to install (memory, gpt-image, perplexity, context7, gemini-search)"
        },
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
    },
    {
      name: "config",
      description: "Configure API keys for MCP tools",
      options: [
        {
          flags: "<server>",
          description: "MCP server to configure (gpt-image, perplexity, gemini-search)"
        }
      ],
      handler: mcpConfigHandler
    }
  ]
};

// src/commands/memory-command.ts
var memoryListHandler = async (options) => {
  const memory = new LibSQLMemoryStorage();
  const entries = await memory.getAll();
  if (options.namespace && options.namespace !== "all") {
    const filtered = entries.filter((entry) => entry.namespace === options.namespace);
    console.log(`\u{1F4CB} Memory entries in namespace: ${options.namespace}`);
    console.log(`Total: ${filtered.length} entries
`);
    if (filtered.length === 0) {
      console.log("No entries found in this namespace.");
      return;
    }
    const limit = options.limit || 50;
    const display = filtered.slice(0, limit);
    display.forEach((entry, index) => {
      const safeValue = entry.value || "";
      const value = typeof safeValue === "string" ? safeValue.substring(0, 50) + (safeValue.length > 50 ? "..." : "") : JSON.stringify(safeValue).substring(0, 50) + "...";
      console.log(`${index + 1}. ${entry.namespace}:${entry.key}`);
      console.log(`   Value: ${value}`);
      console.log(`   Updated: ${entry.updated_at}`);
      console.log("");
    });
  } else {
    console.log(`\u{1F4CB} All memory entries (showing first ${options.limit || 50}):`);
    console.log(`Total: ${entries.length} entries
`);
    if (entries.length === 0) {
      console.log("No memory entries found.");
      return;
    }
    const limit = options.limit || 50;
    const display = entries.slice(0, limit);
    display.forEach((entry, index) => {
      const safeValue = entry.value || "";
      const value = typeof safeValue === "string" ? safeValue.substring(0, 50) + (safeValue.length > 50 ? "..." : "") : JSON.stringify(safeValue).substring(0, 50) + "...";
      console.log(`${index + 1}. ${entry.namespace}:${entry.key}`);
      console.log(`   Value: ${value}`);
      console.log(`   Updated: ${entry.updated_at}`);
      console.log("");
    });
  }
};
var memorySearchHandler = async (options) => {
  if (!options.pattern) {
    console.error("\u274C Search pattern is required. Use --pattern <pattern>");
    process.exit(1);
  }
  const memory = new LibSQLMemoryStorage();
  const results2 = await memory.search(options.pattern, options.namespace);
  console.log(`\u{1F50D} Search results for pattern: ${options.pattern}`);
  if (options.namespace && options.namespace !== "all") {
    console.log(`Namespace: ${options.namespace}`);
  }
  console.log(`Found: ${results2.length} results
`);
  if (results2.length === 0) {
    console.log("No matching entries found.");
    return;
  }
  results2.forEach((entry, index) => {
    const safeValue = entry.value || "";
    const value = typeof safeValue === "string" ? safeValue.substring(0, 50) + (safeValue.length > 50 ? "..." : "") : JSON.stringify(safeValue).substring(0, 50) + "...";
    console.log(`${index + 1}. ${entry.namespace}:${entry.key}`);
    console.log(`   Value: ${value}`);
    console.log(`   Updated: ${entry.updated_at}`);
    console.log("");
  });
};
var memoryDeleteHandler = async (options) => {
  if (!options.key) {
    console.error("\u274C Key is required. Use --key <key>");
    process.exit(1);
  }
  const memory = new LibSQLMemoryStorage();
  const deleted = await memory.delete(options.key, options.namespace || "default");
  if (deleted) {
    console.log(`\u2705 Deleted memory entry: ${options.namespace || "default"}:${options.key}`);
  } else {
    console.log(`\u274C Memory entry not found: ${options.namespace || "default"}:${options.key}`);
  }
};
var memoryClearHandler = async (options) => {
  if (!options.confirm) {
    console.error("\u274C Confirmation required. Use --confirm to clear memory entries");
    process.exit(1);
  }
  const memory = new LibSQLMemoryStorage();
  if (options.namespace) {
    await memory.clear(options.namespace);
    console.log(`\u2705 Cleared all memory entries in namespace: ${options.namespace}`);
  } else {
    await memory.clear();
    console.log("\u2705 Cleared all memory entries");
  }
};
var memoryStatsHandler = async () => {
  const memory = new LibSQLMemoryStorage();
  const stats = await memory.getStats();
  console.log("\u{1F4CA} Memory Statistics");
  console.log("==================");
  console.log(`Total Entries: ${stats.totalEntries}`);
  console.log(`Namespaces: ${stats.namespaces.length}`);
  console.log("");
  if (stats.namespaces.length > 0) {
    console.log("Namespaces:");
    stats.namespaces.forEach((ns) => {
      const count = stats.namespaceCounts[ns] || 0;
      console.log(`  \u2022 ${ns}: ${count} entries`);
    });
    console.log("");
  }
  console.log(`Oldest Entry: ${stats.oldestEntry || "N/A"}`);
  console.log(`Newest Entry: ${stats.newestEntry || "N/A"}`);
  console.log("");
  console.log(`\u{1F4CD} Database: .sylphx-flow/memory.db`);
};
var memorySetHandler = async (options) => {
  const args = process.argv.slice(2);
  const keyIndex = args.indexOf("set") + 1;
  const valueIndex = keyIndex + 1;
  if (keyIndex >= args.length || valueIndex >= args.length) {
    console.error("\u274C Usage: flow memory set <key> <value> [--namespace <namespace>]");
    process.exit(1);
  }
  const key = args[keyIndex];
  const value = args[valueIndex];
  const namespace = options.namespace || "default";
  const memory = new LibSQLMemoryStorage();
  await memory.set(key, value, namespace);
  console.log(`\u2705 Set memory entry: ${namespace}:${key} = "${value}"`);
};
var memoryCommand = {
  name: "memory",
  description: "Manage memory database",
  options: [
    { flags: "--namespace <name>", description: "Filter by namespace" },
    { flags: "--limit <number>", description: "Limit number of entries" },
    { flags: "--pattern <pattern>", description: "Search pattern" },
    { flags: "--key <key>", description: "Memory key to delete" },
    { flags: "--confirm", description: "Confirm clear operation" }
  ],
  subcommands: [
    {
      name: "list",
      description: "List memory entries",
      options: [],
      handler: memoryListHandler
    },
    {
      name: "search",
      description: "Search memory entries",
      options: [],
      handler: memorySearchHandler
    },
    {
      name: "delete",
      description: "Delete memory entry",
      options: [],
      handler: memoryDeleteHandler
    },
    {
      name: "clear",
      description: "Clear memory entries",
      options: [],
      handler: memoryClearHandler
    },
    {
      name: "stats",
      description: "Show memory statistics",
      options: [],
      handler: memoryStatsHandler
    },
    {
      name: "set",
      description: "Set memory entry",
      options: [],
      handler: memorySetHandler
    }
  ]
};

// src/commands/memory-tui-command.ts
import { render } from "ink";
import React2 from "react";

// src/components/FullscreenMemoryTUI.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { jsx, jsxs } from "react/jsx-runtime";
var FullscreenMemoryTUI = () => {
  const { exit } = useApp();
  const [state, setState] = useState({
    entries: [],
    filteredEntries: [],
    loading: false,
    message: "",
    viewMode: "list",
    selectedIndex: 0,
    selectedEntry: null,
    deleteConfirmEntry: null,
    searchQuery: "",
    editForm: { namespace: "", key: "", value: "", cursor: 0 },
    addForm: { namespace: "default", key: "", value: "", cursor: 0, field: "namespace" },
    viewScrollOffset: 0,
    showHelp: false
  });
  const memory = useMemo(() => new LibSQLMemoryStorage(), []);
  const loadEntries = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, message: "Loading..." }));
    try {
      const allEntries = await memory.getAll();
      const sortedEntries = allEntries.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setState((prev) => ({
        ...prev,
        entries: sortedEntries,
        filteredEntries: sortedEntries,
        loading: false,
        message: `Loaded ${allEntries.length} entries`,
        selectedIndex: Math.min(prev.selectedIndex, Math.max(0, sortedEntries.length - 1))
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        message: `Error: ${error}`
      }));
    }
  }, []);
  const saveEntry = useCallback(
    async (namespace, key, value) => {
      try {
        await memory.set(key, value, namespace);
        setState((prev) => ({
          ...prev,
          message: `Saved: ${namespace}:${key}`,
          viewMode: "list"
        }));
        await loadEntries();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          message: `Save error: ${error}`
        }));
      }
    },
    [loadEntries]
  );
  const deleteEntry = useCallback(
    async (entry) => {
      try {
        await memory.delete(entry.key, entry.namespace);
        setState((prev) => ({
          ...prev,
          message: `Deleted: ${entry.namespace}:${entry.key}`,
          viewMode: "list",
          deleteConfirmEntry: null
        }));
        await loadEntries();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          message: `Delete error: ${error}`
        }));
      }
    },
    [loadEntries]
  );
  const searchEntries = useCallback((query, entries) => {
    if (!query.trim()) {
      setState((prev) => ({ ...prev, filteredEntries: entries }));
      return;
    }
    const filtered = entries.filter(
      (entry) => entry.namespace.toLowerCase().includes(query.toLowerCase()) || entry.key.toLowerCase().includes(query.toLowerCase()) || JSON.stringify(entry.value).toLowerCase().includes(query.toLowerCase())
    );
    setState((prev) => ({
      ...prev,
      filteredEntries: filtered,
      selectedIndex: 0
    }));
  }, []);
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
      return;
    }
    if (key.escape) {
      if (state.viewMode !== "list") {
        setState((prev) => ({ ...prev, viewMode: "list" }));
      } else {
        exit();
      }
      return;
    }
    if (input === "?" || key.ctrl && input === "h") {
      setState((prev) => ({ ...prev, showHelp: !prev.showHelp }));
      return;
    }
    if (state.viewMode === "list") {
      if (key.upArrow && state.selectedIndex > 0) {
        setState((prev) => ({ ...prev, selectedIndex: prev.selectedIndex - 1 }));
      } else if (key.downArrow && state.selectedIndex < state.filteredEntries.length - 1) {
        setState((prev) => ({ ...prev, selectedIndex: prev.selectedIndex + 1 }));
      } else if (key.return && state.filteredEntries[state.selectedIndex]) {
        const entry = state.filteredEntries[state.selectedIndex];
        setState((prev) => ({
          ...prev,
          selectedEntry: entry,
          viewMode: "view",
          viewScrollOffset: 0
        }));
      } else if (input === " " && state.filteredEntries[state.selectedIndex]) {
        const entry = state.filteredEntries[state.selectedIndex];
        setState((prev) => ({
          ...prev,
          editForm: {
            namespace: entry.namespace,
            key: entry.key,
            value: JSON.stringify(entry.value, null, 2),
            cursor: 0
          },
          viewMode: "edit"
        }));
      } else if (input === "n") {
        setState((prev) => ({
          ...prev,
          addForm: { namespace: "default", key: "", value: "", cursor: 0, field: "namespace" },
          viewMode: "add"
        }));
      } else if (input === "d" && state.filteredEntries[state.selectedIndex]) {
        setState((prev) => ({
          ...prev,
          deleteConfirmEntry: prev.filteredEntries[prev.selectedIndex],
          viewMode: "confirm-delete"
        }));
      } else if (input === "/") {
        setState((prev) => ({ ...prev, viewMode: "search", searchQuery: "" }));
      } else if (input === "r") {
        loadEntries();
      }
    }
    if (state.viewMode === "view") {
      if (key.upArrow && state.viewScrollOffset > 0) {
        setState((prev) => ({ ...prev, viewScrollOffset: prev.viewScrollOffset - 1 }));
      } else if (key.downArrow) {
        setState((prev) => ({ ...prev, viewScrollOffset: prev.viewScrollOffset + 1 }));
      } else if (input === " ") {
        if (state.selectedEntry) {
          setState((prev) => ({
            ...prev,
            editForm: {
              namespace: state.selectedEntry.namespace,
              key: state.selectedEntry.key,
              value: JSON.stringify(state.selectedEntry.value, null, 2),
              cursor: 0
            },
            viewMode: "edit"
          }));
        }
      }
    }
    if (state.viewMode === "edit") {
      if (key.return) {
        try {
          const value = JSON.parse(state.editForm.value);
          saveEntry(state.editForm.namespace, state.editForm.key, value);
        } catch (error) {
          setState((prev) => ({ ...prev, message: `JSON format error: ${error}` }));
        }
      } else if (key.backspace || key.delete) {
        const newValue = state.editForm.value.slice(0, -1);
        setState((prev) => ({
          ...prev,
          editForm: {
            ...prev.editForm,
            value: newValue,
            cursor: Math.max(0, prev.editForm.cursor - 1)
          }
        }));
      } else if (input && !key.ctrl && !key.meta && input.length === 1) {
        const newValue = state.editForm.value + input;
        setState((prev) => ({
          ...prev,
          editForm: { ...prev.editForm, value: newValue, cursor: prev.editForm.cursor + 1 }
        }));
      } else if (key.leftArrow && state.editForm.cursor > 0) {
        setState((prev) => ({
          ...prev,
          editForm: { ...prev.editForm, cursor: prev.editForm.cursor - 1 }
        }));
      } else if (key.rightArrow && state.editForm.cursor < state.editForm.value.length) {
        setState((prev) => ({
          ...prev,
          editForm: { ...prev.editForm, cursor: prev.editForm.cursor + 1 }
        }));
      }
    }
    if (state.viewMode === "add") {
      if (key.tab) {
        const fields = ["namespace", "key", "value"];
        const currentIndex = fields.indexOf(state.addForm.field);
        const nextIndex = (currentIndex + 1) % fields.length;
        setState((prev) => ({
          ...prev,
          addForm: { ...prev.addForm, field: fields[nextIndex], cursor: 0 }
        }));
      } else if (key.return && state.addForm.field === "value") {
        try {
          const value = JSON.parse(state.addForm.value);
          saveEntry(state.addForm.namespace, state.addForm.key, value);
        } catch (error) {
          setState((prev) => ({ ...prev, message: `JSON format error: ${error}` }));
        }
      } else if (key.backspace || key.delete) {
        const currentValue = state.addForm[state.addForm.field];
        const newValue = currentValue.slice(0, -1);
        setState((prev) => ({
          ...prev,
          addForm: {
            ...prev.addForm,
            [state.addForm.field]: newValue,
            cursor: Math.max(0, prev.addForm.cursor - 1)
          }
        }));
      } else if (input && !key.ctrl && !key.meta && input.length === 1) {
        const currentValue = state.addForm[state.addForm.field];
        const newValue = currentValue + input;
        setState((prev) => ({
          ...prev,
          addForm: {
            ...prev.addForm,
            [state.addForm.field]: newValue,
            cursor: prev.addForm.cursor + 1
          }
        }));
      }
    }
    if (state.viewMode === "search") {
      if (key.return) {
        searchEntries(state.searchQuery, state.entries);
        setState((prev) => ({ ...prev, viewMode: "list" }));
      } else if (key.backspace || key.delete) {
        const newQuery = state.searchQuery.slice(0, -1);
        setState((prev) => ({ ...prev, searchQuery: newQuery }));
        searchEntries(newQuery, state.entries);
      } else if (input && !key.ctrl && !key.meta && input.length === 1) {
        const newQuery = state.searchQuery + input;
        setState((prev) => ({ ...prev, searchQuery: newQuery }));
        searchEntries(newQuery, state.entries);
      }
    }
    if (state.viewMode === "confirm-delete") {
      if (input === "y" && state.deleteConfirmEntry) {
        deleteEntry(state.deleteConfirmEntry);
      } else if (input === "n" || key.escape) {
        setState((prev) => ({
          ...prev,
          viewMode: "list",
          deleteConfirmEntry: null
        }));
      }
    }
  });
  const renderList = () => /* @__PURE__ */ jsxs(Box, { flexDirection: "column", height: "100%", width: "100%", children: [
    /* @__PURE__ */ jsxs(Box, { borderStyle: "double", borderColor: "blue", padding: 1, children: [
      /* @__PURE__ */ jsx(Text, { bold: true, color: "blue", children: "\u{1F9E0} Memory Manager" }),
      /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
        " ",
        "| ",
        state.filteredEntries.length,
        "/",
        state.entries.length,
        " entries"
      ] })
    ] }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: "gray", children: "[\u2191\u2193] Select [Enter] View [Space] Edit [n] New [d] Delete [/] Search [r] Refresh [?] Help [Ctrl+C] Quit" }) }),
    state.message && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: "yellow", children: state.message }) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, flexDirection: "column", flexGrow: 1, children: state.loading ? /* @__PURE__ */ jsx(Box, { justifyContent: "center", alignItems: "center", flexGrow: 1, children: /* @__PURE__ */ jsx(Text, { children: "Loading..." }) }) : state.filteredEntries.length === 0 ? /* @__PURE__ */ jsx(Box, { justifyContent: "center", alignItems: "center", flexGrow: 1, children: /* @__PURE__ */ jsx(Text, { color: "gray", children: "No entries found" }) }) : /* @__PURE__ */ jsx(Box, { flexDirection: "column", flexGrow: 1, children: state.filteredEntries.map((entry, index) => /* @__PURE__ */ jsxs(Box, { marginBottom: 1, children: [
      /* @__PURE__ */ jsxs(Text, { color: index === state.selectedIndex ? "green" : "cyan", children: [
        index === state.selectedIndex ? "\u25B6" : " ",
        " ",
        index + 1,
        ". ",
        entry.namespace,
        ":",
        entry.key
      ] }),
      /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
        " ",
        "= ",
        JSON.stringify(entry.value).substring(0, 80),
        JSON.stringify(entry.value).length > 80 ? "..." : ""
      ] })
    ] }, `${entry.namespace}-${entry.key}-${index}`)) }) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, borderStyle: "single", borderColor: "gray", padding: 1, children: /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
      "Selected: ",
      state.filteredEntries[state.selectedIndex]?.namespace,
      ":",
      state.filteredEntries[state.selectedIndex]?.key || "None"
    ] }) })
  ] });
  const renderView = () => {
    if (!state.selectedEntry) return null;
    const valueStr = JSON.stringify(state.selectedEntry.value, null, 2);
    const lines = valueStr.split("\n");
    const visibleLines = lines.slice(state.viewScrollOffset, state.viewScrollOffset + 20);
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", height: "100%", width: "100%", children: [
      /* @__PURE__ */ jsx(Box, { borderStyle: "double", borderColor: "cyan", padding: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "\u{1F4C4} View Entry" }) }),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: "gray", children: "[\u2191\u2193] Scroll [Space] Edit [ESC] Back" }) }),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", flexGrow: 1, children: [
        /* @__PURE__ */ jsxs(Box, { marginBottom: 1, children: [
          /* @__PURE__ */ jsx(Text, { bold: true, color: "blue", children: "Namespace:" }),
          /* @__PURE__ */ jsxs(Text, { children: [
            " ",
            state.selectedEntry.namespace
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Box, { marginBottom: 1, children: [
          /* @__PURE__ */ jsx(Text, { bold: true, color: "blue", children: "Key:" }),
          /* @__PURE__ */ jsxs(Text, { children: [
            " ",
            state.selectedEntry.key
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Box, { marginBottom: 1, children: [
          /* @__PURE__ */ jsx(Text, { bold: true, color: "blue", children: "Updated:" }),
          /* @__PURE__ */ jsxs(Text, { children: [
            " ",
            state.selectedEntry.updated_at
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Box, { flexDirection: "column", flexGrow: 1, children: [
          /* @__PURE__ */ jsx(Text, { bold: true, color: "blue", children: "Value:" }),
          /* @__PURE__ */ jsxs(
            Box,
            {
              flexDirection: "column",
              borderStyle: "single",
              borderColor: "gray",
              padding: 1,
              flexGrow: 1,
              children: [
                visibleLines.map((line, index) => /* @__PURE__ */ jsx(Text, { children: line }, index)),
                lines.length > 20 && /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
                  "--- ",
                  lines.length - 20,
                  " more lines ---"
                ] })
              ]
            }
          )
        ] })
      ] })
    ] });
  };
  const renderEdit = () => /* @__PURE__ */ jsxs(Box, { flexDirection: "column", height: "100%", width: "100%", children: [
    /* @__PURE__ */ jsx(Box, { borderStyle: "double", borderColor: "yellow", padding: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, color: "yellow", children: "\u270F\uFE0F Edit Entry" }) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: "gray", children: "[Enter] Save [ESC] Cancel [\u2191\u2193\u2190\u2192] Navigate text" }) }),
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", flexGrow: 1, children: [
      /* @__PURE__ */ jsxs(Box, { marginBottom: 1, children: [
        /* @__PURE__ */ jsx(Text, { bold: true, color: "blue", children: "Namespace:" }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          state.editForm.namespace
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Box, { marginBottom: 1, children: [
        /* @__PURE__ */ jsx(Text, { bold: true, color: "blue", children: "Key:" }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          state.editForm.key
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Box, { flexDirection: "column", flexGrow: 1, children: [
        /* @__PURE__ */ jsx(Text, { bold: true, color: "blue", children: "JSON Value:" }),
        /* @__PURE__ */ jsxs(
          Box,
          {
            flexDirection: "column",
            borderStyle: "single",
            borderColor: "gray",
            padding: 1,
            flexGrow: 1,
            children: [
              /* @__PURE__ */ jsx(Text, { children: "Edit JSON content:" }),
              /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
                /* @__PURE__ */ jsx(Text, { color: "cyan", children: state.editForm.value }),
                /* @__PURE__ */ jsx(Text, { children: "_" })
              ] })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, borderStyle: "single", borderColor: "gray", padding: 1, children: /* @__PURE__ */ jsx(Text, { color: "gray", children: "Tip: Enter valid JSON format, then press Enter to save" }) })
  ] });
  const renderAdd = () => /* @__PURE__ */ jsxs(Box, { flexDirection: "column", height: "100%", width: "100%", children: [
    /* @__PURE__ */ jsx(Box, { borderStyle: "double", borderColor: "green", padding: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, color: "green", children: "\u2795 Add Entry" }) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: "gray", children: "[Tab] Switch fields [Enter] Save [ESC] Cancel" }) }),
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", flexGrow: 1, children: [
      /* @__PURE__ */ jsx(Box, { marginBottom: 1, children: /* @__PURE__ */ jsxs(Text, { bold: true, color: state.addForm.field === "namespace" ? "green" : "blue", children: [
        "Namespace: ",
        state.addForm.namespace,
        state.addForm.field === "namespace" && /* @__PURE__ */ jsx(Text, { children: "_" })
      ] }) }),
      /* @__PURE__ */ jsx(Box, { marginBottom: 1, children: /* @__PURE__ */ jsxs(Text, { bold: true, color: state.addForm.field === "key" ? "green" : "blue", children: [
        "Key: ",
        state.addForm.key,
        state.addForm.field === "key" && /* @__PURE__ */ jsx(Text, { children: "_" })
      ] }) }),
      /* @__PURE__ */ jsxs(Box, { flexDirection: "column", flexGrow: 1, children: [
        /* @__PURE__ */ jsx(Text, { bold: true, color: state.addForm.field === "value" ? "green" : "blue", children: "JSON Value:" }),
        /* @__PURE__ */ jsxs(
          Box,
          {
            flexDirection: "column",
            borderStyle: "single",
            borderColor: "gray",
            padding: 1,
            flexGrow: 1,
            children: [
              /* @__PURE__ */ jsx(Text, { children: "Enter JSON value:" }),
              /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
                /* @__PURE__ */ jsx(Text, { color: "cyan", children: state.addForm.value }),
                state.addForm.field === "value" && /* @__PURE__ */ jsx(Text, { children: "_" })
              ] })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, borderStyle: "single", borderColor: "gray", padding: 1, children: /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
      "Current field: ",
      state.addForm.field,
      " | Tab to switch | Enter to save on value field"
    ] }) })
  ] });
  const renderSearch = () => /* @__PURE__ */ jsxs(Box, { flexDirection: "column", height: "100%", width: "100%", children: [
    /* @__PURE__ */ jsx(Box, { borderStyle: "double", borderColor: "magenta", padding: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, color: "magenta", children: "\u{1F50D} Search Entries" }) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: "gray", children: "Type search term, Enter to confirm, ESC to cancel" }) }),
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
      /* @__PURE__ */ jsx(Text, { children: "Search: " }),
      /* @__PURE__ */ jsx(Text, { color: "cyan", children: state.searchQuery }),
      /* @__PURE__ */ jsx(Text, { children: "_" })
    ] }),
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", flexGrow: 1, children: [
      /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
        "Found ",
        state.filteredEntries.length,
        " results:"
      ] }),
      state.filteredEntries.slice(0, 10).map((entry, index) => /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsxs(Text, { children: [
        "\u2022 ",
        entry.namespace,
        ":",
        entry.key
      ] }) }, index)),
      state.filteredEntries.length > 10 && /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
        "... and ",
        state.filteredEntries.length - 10,
        " more results"
      ] })
    ] })
  ] });
  const renderConfirmDelete = () => /* @__PURE__ */ jsxs(Box, { flexDirection: "column", height: "100%", width: "100%", children: [
    /* @__PURE__ */ jsx(Box, { borderStyle: "double", borderColor: "red", padding: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, color: "red", children: "\u26A0\uFE0F Confirm Delete" }) }),
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", flexGrow: 1, justifyContent: "center", children: [
      /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [
        /* @__PURE__ */ jsxs(Text, { children: [
          "Delete entry:",
          " ",
          /* @__PURE__ */ jsxs(Text, { color: "cyan", children: [
            state.deleteConfirmEntry?.namespace,
            ":",
            state.deleteConfirmEntry?.key
          ] })
        ] }),
        /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
          "Value: ",
          JSON.stringify(state.deleteConfirmEntry?.value).substring(0, 120),
          JSON.stringify(state.deleteConfirmEntry?.value || "").length > 120 ? "..." : ""
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
        /* @__PURE__ */ jsx(Text, { bold: true, color: "yellow", children: "This action cannot be undone!" }),
        /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { children: [
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "y" }),
          " - Yes, delete | ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "n" }),
          " - No, cancel |",
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "ESC" }),
          " - Back"
        ] }) })
      ] })
    ] })
  ] });
  const renderHelp = () => /* @__PURE__ */ jsxs(Box, { flexDirection: "column", height: "100%", width: "100%", children: [
    /* @__PURE__ */ jsx(Box, { borderStyle: "double", borderColor: "green", padding: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, color: "green", children: "\u{1F4D6} Memory Manager - Help" }) }),
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", flexGrow: 1, children: [
      /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [
        /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "Basic Operations:" }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "\u2191\u2193" }),
          " - Navigate up/down"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "Enter" }),
          " - View selected entry details"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "Space" }),
          " - Edit selected entry"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "n" }),
          " - New entry"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "d" }),
          " - Delete selected entry"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "/" }),
          " - Search entries"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "r" }),
          " - Refresh list"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [
        /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "Edit Mode:" }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "Enter" }),
          " - Save changes"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "ESC" }),
          " - Cancel edit"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "\u2191\u2193\u2190\u2192" }),
          " - Navigate text"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "Backspace" }),
          " - Delete text"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [
        /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "Add Mode:" }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "Tab" }),
          " - Switch fields (Namespace\u2192Key\u2192Value)"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "Enter" }),
          " - Save on value field"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "ESC" }),
          " - Cancel add"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
        /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "System:" }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "?" }),
          " or ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "Ctrl+H" }),
          " - Toggle help"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "ESC" }),
          " - Go back / Exit"
        ] }),
        /* @__PURE__ */ jsxs(Text, { children: [
          " ",
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "Ctrl+C" }),
          " - Force exit"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Box, { borderStyle: "single", borderColor: "gray", padding: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Press ? or Ctrl+H to close help" }) })
  ] });
  if (state.showHelp) {
    return renderHelp();
  }
  switch (state.viewMode) {
    case "view":
      return renderView();
    case "edit":
      return renderEdit();
    case "add":
      return renderAdd();
    case "search":
      return renderSearch();
    case "confirm-delete":
      return renderConfirmDelete();
    default:
      return renderList();
  }
};

// src/commands/memory-tui-command.ts
var handleMemoryTui = async () => {
  process.stdout.write("\x1B[2J\x1B[H");
  const { waitUntilExit } = render(React2.createElement(FullscreenMemoryTUI), {
    // Configure Ink for fullscreen experience
    exitOnCtrlC: false,
    // Handle Ctrl+C manually in useInput
    patchConsole: false,
    // Prevent console output interference
    debug: false,
    // Set to true for development debugging
    maxFps: 60
    // Higher FPS for smoother experience
  });
  try {
    await waitUntilExit();
  } finally {
    process.stdout.write("\x1B[2J\x1B[H");
  }
};

// src/utils/command-builder.ts
import { Command } from "commander";
function createCommand(config) {
  const command = new Command(config.name);
  command.description(config.description);
  for (const option of config.options || []) {
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
  {
    flags: "--mcp [servers...]",
    description: "Install MCP servers (memory, gpt-image, perplexity, context7, gemini-search)"
  }
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
async function processBatch(batch, rulesDir, config, processContent, progressBar) {
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
      processBatch(batch, rulesDir, config, processContent, progressBar);
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
  description: '[DEPRECATED] Sync development flow to your project - use "init" instead',
  options: [
    { ...COMMON_OPTIONS[0], description: "Force specific agent (cursor, kilocode, roocode)" },
    ...COMMON_OPTIONS.slice(1)
  ],
  handler: async (options) => {
    console.warn(
      '\u26A0\uFE0F  WARNING: The "sync" command is deprecated and will be removed in a future version.'
    );
    console.warn('   Use "npx github:sylphxltd/flow init" instead for new projects.');
    console.warn("   The sync command only works with legacy agents (cursor, kilocode, roocode).");
    console.warn("");
    await syncRules(options);
  },
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
  const commands = [syncCommand, initCommand, mcpCommand, memoryCommand];
  for (const commandConfig of commands) {
    program.addCommand(createCommand(commandConfig));
  }
  program.command("memory-tui").alias("mtui").description("Launch interactive memory management TUI").action(handleMemoryTui);
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
