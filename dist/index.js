#!/usr/bin/env node
import {
  LibSQLMemoryStorage
} from "./chunk-YAGG6WK2.js";

// src/cli.ts
import { Command as Command2 } from "commander";

// src/config/servers.ts
var MCP_SERVER_REGISTRY = {
  "sylphx-flow": {
    id: "sylphx-flow",
    name: "sylphx_flow",
    description: "Sylphx Flow MCP server for agent coordination and memory management",
    config: {
      type: "local",
      command: ["npx", "-y", "github:sylphxltd/flow", "mcp", "start"]
    },
    category: "core",
    defaultInInit: true
  },
  "gpt-image": {
    id: "gpt-image",
    name: "gpt-image-1-mcp",
    description: "GPT Image generation MCP server",
    config: {
      type: "local",
      command: ["npx", "@napolab/gpt-image-1-mcp"],
      environment: { OPENAI_API_KEY: "" }
    },
    envVars: {
      OPENAI_API_KEY: {
        description: "OpenAI API key for image generation",
        required: true
      }
    },
    category: "ai",
    defaultInInit: true
  },
  perplexity: {
    id: "perplexity",
    name: "perplexity-ask",
    description: "Perplexity Ask MCP server for search and queries",
    config: {
      type: "local",
      command: ["npx", "-y", "server-perplexity-ask"],
      environment: { PERPLEXITY_API_KEY: "" }
    },
    envVars: {
      PERPLEXITY_API_KEY: {
        description: "Perplexity API key for search and queries",
        required: true
      }
    },
    category: "ai",
    defaultInInit: true
  },
  context7: {
    id: "context7",
    name: "context7",
    description: "Context7 HTTP MCP server for documentation retrieval",
    config: {
      type: "remote",
      url: "https://mcp.context7.com/mcp"
    },
    envVars: {
      CONTEXT7_API_KEY: {
        description: "Context7 API key for enhanced documentation access",
        required: false
      }
    },
    category: "external",
    defaultInInit: true
  },
  "gemini-search": {
    id: "gemini-search",
    name: "gemini-google-search",
    description: "Gemini Google Search MCP server",
    config: {
      type: "local",
      command: ["npx", "-y", "mcp-gemini-google-search"],
      environment: { GEMINI_API_KEY: "", GEMINI_MODEL: "gemini-2.5-flash" }
    },
    envVars: {
      GEMINI_API_KEY: {
        description: "Google Gemini API key for search functionality",
        required: true
      },
      GEMINI_MODEL: {
        description: "Gemini model to use for search",
        required: false,
        default: "gemini-2.5-flash"
      }
    },
    category: "ai",
    defaultInInit: true
  },
  grep: {
    id: "grep",
    name: "grep",
    description: "GitHub grep MCP server for searching GitHub repositories",
    config: {
      type: "remote",
      url: "https://mcp.grep.app"
    },
    category: "external",
    defaultInInit: true
  }
};
function getAllServerIDs() {
  return Object.keys(MCP_SERVER_REGISTRY);
}
function getDefaultServers() {
  return Object.entries(MCP_SERVER_REGISTRY).filter(([, server]) => server.defaultInInit).map(([id]) => id);
}
function getServersRequiringAPIKeys() {
  return Object.entries(MCP_SERVER_REGISTRY).filter(
    ([, server]) => server.envVars && Object.values(server.envVars).some((envVar) => envVar.required)
  ).map(([id]) => id);
}
function getRequiredEnvVars(serverId) {
  const server = MCP_SERVER_REGISTRY[serverId];
  if (!server?.envVars) return [];
  return Object.entries(server.envVars).filter(([, config]) => config.required).map(([name]) => name);
}
function getOptionalEnvVars(serverId) {
  const server = MCP_SERVER_REGISTRY[serverId];
  if (!server?.envVars) return [];
  return Object.entries(server.envVars).filter(([, config]) => !config.required).map(([name]) => name);
}
function getAllEnvVars(serverId) {
  const server = MCP_SERVER_REGISTRY[serverId];
  if (!server?.envVars) return [];
  return Object.keys(server.envVars);
}

// src/core/init.ts
import fs3 from "fs";
import path3 from "path";
import { fileURLToPath } from "url";

// src/shared.ts
import fs from "fs";
import path from "path";
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
function collectFiles(dir, extensions) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = [];
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (extensions.some((ext) => item.endsWith(ext))) {
        const relativePath = path.relative(dir, fullPath);
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
function clearObsoleteFiles(targetDir, expectedFiles, extensions, results) {
  if (!fs.existsSync(targetDir)) {
    return;
  }
  const items = fs.readdirSync(targetDir);
  for (const item of items) {
    const itemPath = path.join(targetDir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isFile()) {
      const hasValidExtension = extensions.some((ext) => item.endsWith(ext));
      if (hasValidExtension && !expectedFiles.has(item)) {
        fs.unlinkSync(itemPath);
        results.push({
          file: item,
          status: "skipped",
          action: "Removed obsolete file"
        });
      }
    }
  }
}
function displayResults(results, targetDir, agentName, operation, verbose = false) {
  if (!verbose) {
    const total2 = results.length;
    const changed2 = results.filter((r) => r.status === "added" || r.status === "updated").length;
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
  const grouped = results.reduce(
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
  const total = results.length;
  const changed = results.filter((r) => r.status === "added" || r.status === "updated").length;
  if (changed > 0) {
    log(`\u2705 ${operation} complete: ${changed}/${total} files modified`, "green");
  } else {
    log(`\u2705 ${operation} complete: All ${total} files already current`, "blue");
  }
  console.log(`\u{1F4C1} Target directory: ${targetDir}`);
}

// src/core/target-manager.ts
import fs2 from "fs/promises";
import path2 from "path";

// src/config/targets.ts
var TARGET_REGISTRY = {
  opencode: {
    id: "opencode",
    name: "OpenCode",
    description: "OpenCode IDE with YAML front matter agents (.opencode/agent/*.md)",
    config: {
      agentDir: ".opencode/agent",
      agentExtension: ".md",
      agentFormat: "yaml-frontmatter",
      stripYaml: false,
      flatten: false,
      configFile: "opencode.jsonc",
      configSchema: "https://opencode.ai/config.json",
      mcpConfigPath: "mcp",
      installation: {
        createAgentDir: true,
        createConfigFile: true,
        supportedMcpServers: true
      }
    },
    category: "ide",
    isDefault: true,
    isImplemented: true
  },
  cursor: {
    id: "cursor",
    name: "Cursor",
    description: "Cursor AI editor with JSON agents (.cursor/rules/*.json)",
    config: {
      agentDir: ".cursor/rules",
      agentExtension: ".json",
      agentFormat: "json",
      stripYaml: true,
      flatten: true,
      configFile: "cursor.json",
      configSchema: null,
      mcpConfigPath: "mcpServers",
      installation: {
        createAgentDir: true,
        createConfigFile: true,
        supportedMcpServers: false
        // Not yet implemented
      }
    },
    category: "ide",
    isImplemented: false
    // Future implementation
  },
  vscode: {
    id: "vscode",
    name: "VS Code",
    description: "Visual Studio Code with workspace agents (.vscode/agents/*.md)",
    config: {
      agentDir: ".vscode/agents",
      agentExtension: ".md",
      agentFormat: "markdown",
      stripYaml: true,
      flatten: false,
      configFile: "settings.json",
      configSchema: null,
      mcpConfigPath: "mcp.servers",
      installation: {
        createAgentDir: true,
        createConfigFile: false,
        // Uses existing settings.json
        supportedMcpServers: false
        // Not yet implemented
      }
    },
    category: "ide",
    isImplemented: false
    // Future implementation
  },
  cli: {
    id: "cli",
    name: "CLI",
    description: "Command-line interface with YAML agents (.sylphx/agents/*.yaml)",
    config: {
      agentDir: ".sylphx/agents",
      agentExtension: ".yaml",
      agentFormat: "yaml",
      stripYaml: false,
      flatten: false,
      configFile: "sylphx.json",
      configSchema: null,
      mcpConfigPath: "mcp",
      installation: {
        createAgentDir: true,
        createConfigFile: true,
        supportedMcpServers: true
      }
    },
    category: "cli",
    isImplemented: false
    // Future implementation
  },
  "claude-code": {
    id: "claude-code",
    name: "Claude Code",
    description: "Claude Code CLI with YAML front matter agents (.claude/agents/*.md)",
    config: {
      agentDir: ".claude/agents",
      agentExtension: ".md",
      agentFormat: "yaml-frontmatter",
      stripYaml: false,
      flatten: false,
      configFile: ".mcp.json",
      configSchema: null,
      mcpConfigPath: "mcpServers",
      installation: {
        createAgentDir: true,
        createConfigFile: true,
        supportedMcpServers: true
      }
    },
    category: "cli",
    isImplemented: true
  }
};
function getAllTargetIDs() {
  return Object.keys(TARGET_REGISTRY);
}
function getImplementedTargetIDs() {
  return Object.entries(TARGET_REGISTRY).filter(([, target]) => target.isImplemented).map(([id]) => id);
}
function getDefaultTarget() {
  const defaultTarget = Object.entries(TARGET_REGISTRY).find(([, target]) => target.isDefault);
  if (!defaultTarget) {
    throw new Error("No default target configured");
  }
  return defaultTarget[0];
}
function isValidTargetID(id) {
  return id in TARGET_REGISTRY;
}
function getTargetDefinition(id) {
  const target = TARGET_REGISTRY[id];
  if (!target) {
    throw new Error(`Unknown target: ${id}`);
  }
  return target;
}
function isTargetImplemented(id) {
  return TARGET_REGISTRY[id]?.isImplemented ?? false;
}
function getTargetsWithMCPSupport() {
  return Object.entries(TARGET_REGISTRY).filter(([, target]) => target.config.installation.supportedMcpServers).map(([id]) => id);
}

// src/core/target-manager.ts
var TargetManager = class {
  transformers = /* @__PURE__ */ new Map();
  initialized = false;
  constructor() {
    this.initializeDefaultTransformers().catch((error) => {
      console.error("Failed to initialize transformers:", error);
    });
  }
  /**
   * Ensure transformers are initialized before use
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!this.initialized) {
        await this.initializeDefaultTransformers();
      }
    }
  }
  /**
   * Initialize default transformers for implemented targets
   */
  async initializeDefaultTransformers() {
    if (this.initialized) return;
    try {
      const { OpenCodeTransformer } = await import("./opencode-3SB6BGWH.js");
      const { ClaudeCodeTransformer } = await import("./claude-code-44TTTRUI.js");
      const { CursorTransformer } = await import("./cursor-LF72HVZC.js");
      const { VSCodeTransformer } = await import("./vscode-LF7J5NK6.js");
      this.registerTransformer(
        "opencode",
        new OpenCodeTransformer(getTargetDefinition("opencode").config)
      );
      this.registerTransformer(
        "claude-code",
        new ClaudeCodeTransformer(getTargetDefinition("claude-code").config)
      );
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize transformers:", error);
      throw error;
    }
  }
  /**
   * Register a transformer for a target
   */
  registerTransformer(targetId, transformer) {
    this.transformers.set(targetId, transformer);
  }
  /**
   * Get transformer for a target
   */
  async getTransformer(targetId) {
    await this.ensureInitialized();
    return this.transformers.get(targetId);
  }
  /**
   * Get all available targets
   */
  getAvailableTargets() {
    return getAllTargetIDs();
  }
  /**
   * Get implemented targets only
   */
  getImplementedTargets() {
    return getImplementedTargetIDs();
  }
  /**
   * Get targets that support MCP servers
   */
  getTargetsWithMCPSupport() {
    return getTargetsWithMCPSupport();
  }
  /**
   * Get default target
   */
  getDefaultTarget() {
    return getDefaultTarget();
  }
  /**
   * Validate target ID
   */
  validateTarget(targetId) {
    if (!isValidTargetID(targetId)) {
      const available = this.getAvailableTargets();
      throw new Error(`Invalid target '${targetId}'. Available targets: ${available.join(", ")}`);
    }
    if (!isTargetImplemented(targetId)) {
      throw new Error(
        `Target '${targetId}' is not yet implemented. Available targets: ${this.getImplementedTargets().join(", ")}`
      );
    }
    return targetId;
  }
  /**
   * Resolve target from options or detection
   */
  async resolveTarget(options) {
    if (options.target) {
      return this.validateTarget(options.target);
    }
    const detectedTarget = await this.detectTarget();
    if (detectedTarget) {
      return detectedTarget;
    }
    return this.getDefaultTarget();
  }
  /**
   * Detect target from current directory structure
   */
  async detectTarget() {
    const cwd = process.cwd();
    const targetChecks = [
      {
        target: "opencode",
        check: async () => {
          const configPath = path2.join(cwd, "opencode.jsonc");
          const agentDir = path2.join(cwd, ".opencode");
          const configExists = await fs2.access(configPath).then(() => true).catch(() => false);
          const agentDirExists = await fs2.access(agentDir).then(() => true).catch(() => false);
          return configExists || agentDirExists;
        }
      },
      {
        target: "cursor",
        check: async () => {
          const configPath = path2.join(cwd, "cursor.json");
          const agentDir = path2.join(cwd, ".cursor");
          const configExists = await fs2.access(configPath).then(() => true).catch(() => false);
          const agentDirExists = await fs2.access(agentDir).then(() => true).catch(() => false);
          return configExists || agentDirExists;
        }
      },
      {
        target: "vscode",
        check: async () => {
          const configPath = path2.join(cwd, ".vscode", "settings.json");
          return fs2.access(configPath).then(() => true).catch(() => false);
        }
      },
      {
        target: "cli",
        check: async () => {
          const configPath = path2.join(cwd, "sylphx.json");
          const agentDir = path2.join(cwd, ".sylphx");
          const configExists = await fs2.access(configPath).then(() => true).catch(() => false);
          const agentDirExists = await fs2.access(agentDir).then(() => true).catch(() => false);
          return configExists || agentDirExists;
        }
      },
      {
        target: "claude-code",
        check: async () => {
          const configPath = path2.join(cwd, ".mcp.json");
          const agentDir = path2.join(cwd, ".claude");
          const configExists = await fs2.access(configPath).then(() => true).catch(() => false);
          const agentDirExists = await fs2.access(agentDir).then(() => true).catch(() => false);
          return configExists || agentDirExists;
        }
      }
    ];
    for (const { target, check } of targetChecks) {
      if (isTargetImplemented(target) && await check()) {
        return target;
      }
    }
    return null;
  }
  /**
   * Get target configuration
   */
  getTargetConfig(targetId) {
    const target = getTargetDefinition(targetId);
    return target.config;
  }
  /**
   * Get target definition
   */
  getTargetDefinition(targetId) {
    return getTargetDefinition(targetId);
  }
  /**
   * Check if target supports MCP servers
   */
  supportsMCPServers(targetId) {
    const config = this.getTargetConfig(targetId);
    return config.installation.supportedMcpServers;
  }
  /**
   * Get agent directory path for target
   */
  getAgentDirectory(targetId, cwd = process.cwd()) {
    const config = this.getTargetConfig(targetId);
    return path2.join(cwd, config.agentDir);
  }
  /**
   * Get configuration file path for target
   */
  getConfigFilePath(targetId, cwd = process.cwd()) {
    const config = this.getTargetConfig(targetId);
    return path2.join(cwd, config.configFile);
  }
  /**
   * Get help text for all targets
   */
  getTargetsHelpText() {
    const implemented = this.getImplementedTargets();
    if (implemented.length === 0) {
      return "No targets are currently implemented.";
    }
    let help = "Available targets:\n";
    for (const targetId of implemented) {
      const target = getTargetDefinition(targetId);
      const isDefault = targetId === this.getDefaultTarget();
      const defaultMarker = isDefault ? " (default)" : "";
      help += `  ${targetId}${defaultMarker} - ${target.description}
`;
    }
    return help;
  }
  /**
   * Get help text for a specific target
   */
  async getTargetHelpText(targetId) {
    const target = getTargetDefinition(targetId);
    const transformer = await this.getTransformer(targetId);
    let help = `${target.name} (${targetId})
`;
    help += `${target.description}

`;
    help += `Configuration:
`;
    help += `  Agent Directory: ${target.config.agentDir}
`;
    help += `  Agent Extension: ${target.config.agentExtension}
`;
    help += `  Agent Format: ${target.config.agentFormat}
`;
    help += `  Config File: ${target.config.configFile}
`;
    help += `  MCP Support: ${target.config.installation.supportedMcpServers ? "Yes" : "No"}

`;
    if (transformer) {
      help += transformer.getHelpText();
    }
    return help;
  }
};
var targetManager = new TargetManager();

// src/core/init.ts
async function getAgentFiles() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname2 = path3.dirname(__filename);
  const agentsDir = path3.join(__dirname2, "..", "agents");
  if (!fs3.existsSync(agentsDir)) {
    throw new Error(`Could not find agents directory at: ${agentsDir}`);
  }
  const allFiles = [];
  const rootFiles = fs3.readdirSync(agentsDir, { withFileTypes: true }).filter((dirent) => dirent.isFile() && dirent.name.endsWith(".md")).map((dirent) => dirent.name);
  allFiles.push(...rootFiles);
  const subdirs = fs3.readdirSync(agentsDir, { withFileTypes: true }).filter((dirent) => dirent.isDirectory() && dirent.name !== "archived").map((dirent) => dirent.name);
  for (const subdir of subdirs) {
    const subdirPath = path3.join(agentsDir, subdir);
    const files = collectFiles(subdirPath, [".md"]);
    allFiles.push(...files.map((file) => path3.join(subdir, file)));
  }
  return allFiles;
}
async function installAgents(options) {
  const cwd = process.cwd();
  const results = [];
  const targetId = await targetManager.resolveTarget({ target: options.target });
  const target = targetManager.getTargetDefinition(targetId);
  const transformer = await targetManager.getTransformer(targetId);
  if (!transformer) {
    throw new Error(`No transformer available for target: ${targetId}`);
  }
  console.log(`\u{1F4DD} Using target: ${target.name}`);
  const config = target.config;
  const agentsDir = path3.join(cwd, config.agentDir);
  const processContent = async (content, sourcePath) => {
    return await transformer.transformAgentContent(content, void 0, sourcePath);
  };
  if (options.clear && fs3.existsSync(agentsDir)) {
    let expectedFiles;
    const agentFiles2 = await getAgentFiles();
    expectedFiles = new Set(
      agentFiles2.map((filePath) => {
        const parsedPath = path3.parse(filePath);
        const baseName = parsedPath.name;
        const dir = parsedPath.dir;
        if (config.flatten) {
          const flattenedName = dir ? `${dir.replace(/[\/\\]/g, "-")}-${baseName}` : baseName;
          return `${flattenedName}${config.agentExtension}`;
        }
        return filePath;
      })
    );
    clearObsoleteFiles(agentsDir, expectedFiles, [config.agentExtension], results);
  }
  fs3.mkdirSync(agentsDir, { recursive: true });
  const agentFiles = await getAgentFiles();
  if (options.quiet !== true) {
    console.log(
      `\u{1F4C1} Installing ${agentFiles.length} agents to ${agentsDir.replace(process.cwd() + "/", "")}`
    );
    console.log("");
  }
  if (options.dryRun) {
    console.log("\u2705 Dry run completed - no files were modified");
    return;
  }
  const __filename = fileURLToPath(import.meta.url);
  const __dirname2 = path3.dirname(__filename);
  const agentsSourceDir = path3.join(__dirname2, "..", "agents");
  const processPromises = agentFiles.map(async (agentFile) => {
    const sourcePath = path3.join(agentsSourceDir, agentFile);
    const destPath = path3.join(agentsDir, agentFile);
    const destDir = path3.dirname(destPath);
    if (!fs3.existsSync(destDir)) {
      fs3.mkdirSync(destDir, { recursive: true });
    }
    const localInfo = getLocalFileInfo(destPath);
    const isNew = !localInfo;
    let content = fs3.readFileSync(sourcePath, "utf8");
    content = await processContent(content, agentFile);
    const localProcessed = localInfo ? await processContent(localInfo.content, agentFile) : "";
    const contentChanged = !localInfo || localProcessed !== content;
    if (contentChanged) {
      fs3.writeFileSync(destPath, content, "utf8");
      results.push({
        file: agentFile,
        status: localInfo ? "updated" : "added",
        action: localInfo ? "Updated" : "Created"
      });
    } else {
      results.push({
        file: agentFile,
        status: "current",
        action: "Already current"
      });
    }
  });
  await Promise.all(processPromises);
  displayResults(results, agentsDir, target.name, "Install", options.verbose);
}

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

// src/utils/target-config.ts
async function addMCPServersToTarget(cwd, targetId, serverTypes) {
  const target = targetManager.getTargetDefinition(targetId);
  const transformer = await targetManager.getTransformer(targetId);
  if (!transformer) {
    throw new Error(`No transformer available for target: ${targetId}`);
  }
  if (!target.config.installation.supportedMcpServers) {
    throw new Error(`Target ${targetId} does not support MCP servers`);
  }
  const config = await transformer.readConfig(cwd);
  const mcpConfigPath = target.config.mcpConfigPath;
  const mcpSection = getNestedProperty(config, mcpConfigPath) || {};
  setNestedProperty(config, mcpConfigPath, mcpSection);
  let addedCount = 0;
  for (const serverType of serverTypes) {
    const server = MCP_SERVER_REGISTRY[serverType];
    if (!server) {
      console.warn(`Warning: Unknown MCP server type: ${serverType}`);
      continue;
    }
    if (mcpSection[server.name]) {
      console.log(`\u2139\uFE0F  MCP server already exists: ${server.name}`);
    } else {
      const transformedConfig = transformer.transformMCPConfig(server.config);
      mcpSection[server.name] = transformedConfig;
      console.log(`\u{1F4E6} Added MCP server: ${server.name} (${server.description})`);
      addedCount++;
    }
  }
  await transformer.writeConfig(cwd, config);
  console.log(`\u2705 Updated ${target.config.configFile} with ${addedCount} new MCP server(s)`);
}
async function listMCPServersForTarget(cwd, targetId) {
  const target = targetManager.getTargetDefinition(targetId);
  const transformer = await targetManager.getTransformer(targetId);
  if (!transformer) {
    throw new Error(`No transformer available for target: ${targetId}`);
  }
  const config = await transformer.readConfig(cwd);
  const mcpConfigPath = target.config.mcpConfigPath;
  const mcpSection = getNestedProperty(config, mcpConfigPath);
  if (!mcpSection || Object.keys(mcpSection).length === 0) {
    console.log("\u2139\uFE0F  No MCP servers configured");
    return;
  }
  console.log(`\u{1F4CB} Currently configured MCP servers for ${target.name}:`);
  console.log("");
  for (const [name, serverConfig] of Object.entries(mcpSection)) {
    let configInfo = "";
    if (serverConfig && typeof serverConfig === "object" && "type" in serverConfig) {
      if (serverConfig.type === "local") {
        configInfo = serverConfig.command?.join(" ") || "Unknown command";
      } else if (serverConfig.type === "remote") {
        configInfo = `HTTP: ${serverConfig.url}`;
      }
    }
    console.log(`  \u2022 ${name}: ${configInfo}`);
    const serverInfo = Object.values(MCP_SERVER_REGISTRY).find((s) => s.name === name);
    if (serverInfo) {
      console.log(`    ${serverInfo.description}`);
    }
    console.log("");
  }
}
async function configureMCPServerForTarget(cwd, targetId, serverType) {
  const target = targetManager.getTargetDefinition(targetId);
  const transformer = await targetManager.getTransformer(targetId);
  if (!transformer) {
    throw new Error(`No transformer available for target: ${targetId}`);
  }
  const server = MCP_SERVER_REGISTRY[serverType];
  if (!server) {
    console.error(`\u274C Unknown MCP server: ${serverType}`);
    return false;
  }
  const requiredEnvVars = getRequiredEnvVars(serverType);
  const optionalEnvVars = getOptionalEnvVars(serverType);
  if (requiredEnvVars.length === 0 && optionalEnvVars.length === 0) {
    console.log(`\u2139\uFE0F  ${server.name} does not require any API keys`);
    return true;
  }
  console.log(`\u{1F527} Configuring ${server.description} for ${target.name}...`);
  const config = await transformer.readConfig(cwd);
  const mcpConfigPath = target.config.mcpConfigPath;
  const mcpSection = getNestedProperty(config, mcpConfigPath);
  const isServerInstalled = !!(mcpSection && mcpSection[server.name]);
  let hasExistingValidKeys = false;
  if (isServerInstalled && requiredEnvVars.length) {
    const serverConfig = mcpSection[server.name];
    hasExistingValidKeys = requiredEnvVars.every((envVar) => {
      const envValue = serverConfig.environment?.[envVar];
      return envValue && envValue.trim() !== "";
    });
  } else if (isServerInstalled && requiredEnvVars.length === 0) {
    hasExistingValidKeys = true;
  }
  const apiKeys = await promptForAPIKeys([serverType]);
  if (Object.keys(apiKeys).length === 0) {
    if (isServerInstalled && !hasExistingValidKeys) {
      console.log(`\u{1F5D1}\uFE0F  Removing ${server.name} (no API keys provided)`);
      delete mcpSection[server.name];
      if (Object.keys(mcpSection).length === 0) {
        deleteNestedProperty(config, mcpConfigPath);
      } else {
        setNestedProperty(config, mcpConfigPath, mcpSection);
      }
      await transformer.writeConfig(cwd, config);
      return false;
    } else if (isServerInstalled && hasExistingValidKeys) {
      console.log(`\u2705 Keeping ${server.name} (existing API keys are valid)`);
      return true;
    } else if (requiredEnvVars.length === 0 && optionalEnvVars.length > 0) {
      console.log(`\u2705 Installing ${server.name} (optional API keys skipped)`);
    } else {
      console.log(`\u26A0\uFE0F  Skipping ${server.name} (no API keys provided)`);
      return false;
    }
  }
  const mcpSectionForUpdate = mcpSection || {};
  const currentConfig = mcpSectionForUpdate[server.name];
  if (currentConfig && currentConfig.type === "local") {
    mcpSectionForUpdate[server.name] = {
      ...currentConfig,
      environment: {
        ...currentConfig.environment || {},
        ...apiKeys
      }
    };
  } else {
    const baseConfig = server.config;
    if (baseConfig.type === "local") {
      const transformedConfig = transformer.transformMCPConfig(baseConfig);
      mcpSectionForUpdate[server.name] = {
        ...transformedConfig,
        environment: {
          ...baseConfig.environment || {},
          ...apiKeys
        }
      };
    } else {
      const transformedConfig = transformer.transformMCPConfig(baseConfig);
      mcpSectionForUpdate[server.name] = transformedConfig;
    }
  }
  setNestedProperty(config, mcpConfigPath, mcpSectionForUpdate);
  await transformer.writeConfig(cwd, config);
  console.log(`\u2705 Updated ${server.name} with API keys for ${target.name}`);
  return true;
}
function validateTarget(targetId) {
  return targetManager.validateTarget(targetId);
}
function targetSupportsMCPServers(targetId) {
  return targetManager.supportsMCPServers(targetId);
}
function getNestedProperty(obj, path5) {
  return path5.split(".").reduce((current, key) => current?.[key], obj);
}
function setNestedProperty(obj, path5, value) {
  const keys = path5.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}
function deleteNestedProperty(obj, path5) {
  const keys = path5.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => current?.[key], obj);
  if (target) {
    delete target[lastKey];
  }
}
async function promptForAPIKeys(serverTypes) {
  const { createInterface } = await import("readline");
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const apiKeys = {};
  for (const serverType of serverTypes) {
    const server = MCP_SERVER_REGISTRY[serverType];
    const allEnvVars = getAllEnvVars(serverType);
    if (!allEnvVars.length) continue;
    console.log(`
\u{1F511} Configuring API keys for ${server.description}:`);
    for (const envVar of allEnvVars) {
      const envConfig = server.envVars[envVar];
      const isRequired = envConfig.required;
      const promptText = isRequired ? `Enter ${envVar} (${envConfig.description}) (required): ` : `Enter ${envVar} (${envConfig.description}) (optional, press Enter to skip): `;
      const answer = await new Promise((resolve) => {
        rl.question(promptText, (input) => {
          resolve(input.trim());
        });
      });
      if (answer) {
        apiKeys[envVar] = answer;
        console.log(`\u2705 Set ${envVar}`);
      } else if (isRequired) {
        console.log(`\u26A0\uFE0F  Skipped required ${envVar} - server may not function properly`);
      } else {
        console.log(`\u2139\uFE0F  Skipped optional ${envVar}`);
      }
    }
  }
  rl.close();
  return apiKeys;
}

// src/commands/init-command.ts
async function validateInitOptions(options) {
  const targetId = await targetManager.resolveTarget({ target: options.target });
  options.target = targetId;
  try {
    validateTarget(targetId);
  } catch (error) {
    if (error instanceof Error) {
      throw new CLIError(error.message, "UNSUPPORTED_TARGET");
    }
    throw error;
  }
  if (options.merge) {
    throw new CLIError("The --merge option is not supported with init command.", "INVALID_OPTION");
  }
}
var initCommand = {
  name: "init",
  description: "Initialize project with Sylphx Flow development agents and MCP tools",
  options: [
    {
      flags: "--target <type>",
      description: `Force specific target (${targetManager.getImplementedTargets().join(", ")}, default: opencode)`
    },
    { flags: "--verbose", description: "Show detailed output" },
    { flags: "--dry-run", description: "Show what would be done without making changes" },
    { flags: "--clear", description: "Clear obsolete items before processing" },
    { flags: "--no-mcp", description: "Skip MCP tools installation" }
  ],
  handler: async (options) => {
    await validateInitOptions(options);
    const targetId = options.target;
    console.log("\u{1F680} Sylphx Flow Setup");
    console.log("======================");
    console.log(`\u{1F3AF} Target: ${targetId}`);
    console.log("");
    if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
      console.log("\u{1F4E6} Installing MCP tools...");
      const defaultServers = getDefaultServers();
      if (options.dryRun) {
        console.log("\u{1F50D} Dry run: Would install all MCP servers");
        console.log(`   \u2022 ${defaultServers.join(", ")}`);
      } else {
        const serversNeedingKeys = getServersRequiringAPIKeys();
        const serversWithKeys = [];
        const serversWithoutKeys = [];
        if (serversNeedingKeys.length > 0) {
          console.log("\n\u{1F511} Some MCP tools require API keys:");
          for (const serverType of serversNeedingKeys) {
            const shouldKeepOrInstall = await configureMCPServerForTarget(
              process.cwd(),
              targetId,
              serverType
            );
            if (shouldKeepOrInstall) {
              serversWithKeys.push(serverType);
            } else {
              serversWithoutKeys.push(serverType);
            }
          }
        }
        const serversNotNeedingKeys = defaultServers.filter(
          (server) => !serversNeedingKeys.includes(server)
        );
        const serversToInstall = [...serversNotNeedingKeys, ...serversWithKeys];
        if (serversToInstall.length > 0) {
          await addMCPServersToTarget(process.cwd(), targetId, serversToInstall);
          console.log(`\u2705 MCP tools installed: ${serversToInstall.join(", ")}`);
        }
        if (serversWithoutKeys.length > 0) {
          console.log(
            `\u26A0\uFE0F  Removed or skipped MCP tools (no API keys provided): ${serversWithoutKeys.join(", ")}`
          );
          console.log("   You can install them later with: sylphx-flow mcp install <server-name>");
        }
      }
      console.log("");
    } else if (options.mcp !== false && !targetSupportsMCPServers(targetId)) {
      console.log("\u26A0\uFE0F  MCP tools are not supported for this target");
      console.log("");
    }
    await installAgents(options);
    console.log("");
    console.log("\u{1F389} Setup complete!");
    console.log("");
    console.log("\u{1F4CB} Next steps:");
    const target = targetManager.getTargetDefinition(targetId);
    if (targetId === "opencode") {
      console.log("   \u2022 Open OpenCode and start using your agents!");
      if (options.mcp !== false) {
        console.log("   \u2022 MCP tools will be automatically loaded by OpenCode");
      }
    } else {
      console.log(`   \u2022 Start using your agents with ${target.name}!`);
      console.log(`   \u2022 Run 'sylphx-flow init --help' for target-specific information`);
    }
  }
};

// src/commands/mcp-command.ts
var mcpStartHandler = async () => {
  await import("./sylphx-flow-mcp-server-G2GUVJZT.js");
  console.log("\u{1F680} Starting Sylphx Flow MCP Server...");
  console.log("\u{1F4CD} Database: .sylphx-flow/memory.db");
  console.log(
    "\u{1F527} Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats"
  );
  console.log("\u{1F4A1} Press Ctrl+C to stop the server");
  process.stdin.resume();
};
var mcpInstallHandler = async (options) => {
  const targetId = await targetManager.resolveTarget({ target: options.target });
  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, "UNSUPPORTED_TARGET");
  }
  const servers = options.servers || [];
  if (options.all) {
    console.log(`\u{1F527} Installing all available MCP tools for ${targetId}...`);
    const allServers = getAllServerIDs();
    if (options.dryRun) {
      console.log(`\u{1F50D} Dry run: Would install all MCP tools: ${allServers.join(", ")}`);
    } else {
      const serversNeedingKeys = getServersRequiringAPIKeys();
      const serversWithKeys = [];
      const serversWithoutKeys = [];
      if (serversNeedingKeys.length > 0) {
        console.log("\n\u{1F511} Some MCP tools require API keys:");
        for (const serverType of serversNeedingKeys) {
          const shouldKeepOrInstall = await configureMCPServerForTarget(
            process.cwd(),
            targetId,
            serverType
          );
          if (shouldKeepOrInstall) {
            serversWithKeys.push(serverType);
          } else {
            serversWithoutKeys.push(serverType);
          }
        }
      }
      const serversNotNeedingKeys = allServers.filter(
        (server) => !serversNeedingKeys.includes(server)
      );
      const serversToInstall = [...serversNotNeedingKeys, ...serversWithKeys];
      if (serversToInstall.length > 0) {
        await addMCPServersToTarget(process.cwd(), targetId, serversToInstall);
        console.log(`\u2705 MCP tools installed: ${serversToInstall.join(", ")}`);
      }
      if (serversWithoutKeys.length > 0) {
        console.log(
          `\u26A0\uFE0F  Removed or skipped MCP tools (no API keys provided): ${serversWithoutKeys.join(", ")}`
        );
        console.log("   You can install them later with: sylphx-flow mcp config <server-name>");
      }
    }
    return;
  }
  if (servers.length === 0) {
    throw new CLIError("Please specify MCP tools to install or use --all", "NO_SERVERS_SPECIFIED");
  }
  const validServers = [];
  for (const server of servers) {
    if (getAllServerIDs().includes(server)) {
      validServers.push(server);
    } else {
      console.warn(
        `Warning: Unknown MCP server '${server}'. Available: ${getAllServerIDs().join(", ")}`
      );
    }
  }
  if (validServers.length === 0) {
    const availableServers = getAllServerIDs();
    throw new CLIError(
      `Invalid MCP tools. Available: ${availableServers.join(", ")}`,
      "INVALID_MCP_SERVERS"
    );
  }
  console.log(`\u{1F527} Installing MCP tools for ${targetId}: ${validServers.join(", ")}`);
  if (options.dryRun) {
    console.log("\u{1F50D} Dry run: Would install MCP tools:", validServers.join(", "));
  } else {
    const serversNeedingKeys = validServers.filter(
      (server) => getServersRequiringAPIKeys().includes(server)
    );
    const serversWithKeys = [];
    const serversWithoutKeys = [];
    if (serversNeedingKeys.length > 0) {
      console.log("\n\u{1F511} Some MCP tools require API keys:");
      for (const serverType of serversNeedingKeys) {
        const shouldKeepOrInstall = await configureMCPServerForTarget(
          process.cwd(),
          targetId,
          serverType
        );
        if (shouldKeepOrInstall) {
          serversWithKeys.push(serverType);
        } else {
          serversWithoutKeys.push(serverType);
        }
      }
    }
    const serversNotNeedingKeys = validServers.filter(
      (server) => !serversNeedingKeys.includes(server)
    );
    const serversToInstall = [...serversNotNeedingKeys, ...serversWithKeys];
    if (serversToInstall.length > 0) {
      await addMCPServersToTarget(process.cwd(), targetId, serversToInstall);
      console.log(`\u2705 MCP tools installed: ${serversToInstall.join(", ")}`);
    }
    if (serversWithoutKeys.length > 0) {
      console.log(
        `\u26A0\uFE0F  Removed or skipped MCP tools (no API keys provided): ${serversWithoutKeys.join(", ")}`
      );
      console.log("   You can install them later with: sylphx-flow mcp config <server-name>");
    }
  }
};
var mcpListHandler = async (options) => {
  const targetId = await targetManager.resolveTarget({ target: options?.target });
  await listMCPServersForTarget(process.cwd(), targetId);
};
var mcpConfigHandler = async (options) => {
  const server = options.server;
  if (!server) {
    throw new CLIError("Please specify a server to configure", "NO_SERVER_SPECIFIED");
  }
  const targetId = await targetManager.resolveTarget({ target: options.target });
  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, "UNSUPPORTED_TARGET");
  }
  if (!getAllServerIDs().includes(server)) {
    const availableServers = getAllServerIDs();
    throw new CLIError(
      `Invalid MCP server: ${server}. Available: ${availableServers.join(", ")}`,
      "INVALID_MCP_SERVER"
    );
  }
  await configureMCPServerForTarget(process.cwd(), targetId, server);
};
var mcpCommand = {
  name: "mcp",
  description: "Manage MCP (Model Context Protocol) tools and servers",
  options: [
    {
      flags: "--target <type>",
      description: `Target platform (${targetManager.getImplementedTargets().join(", ")}, default: auto-detect)`
    }
  ],
  subcommands: [
    {
      name: "start",
      description: "Start the Sylphx Flow MCP server",
      options: [],
      handler: mcpStartHandler
    },
    {
      name: "install",
      description: "Install MCP tools for the target platform",
      arguments: [
        {
          name: "servers",
          description: `MCP tools to install (${getAllServerIDs().join(", ")})`,
          required: false
        }
      ],
      options: [
        { flags: "--all", description: "Install all available MCP tools" },
        { flags: "--dry-run", description: "Show what would be done without making changes" }
      ],
      handler: mcpInstallHandler
    },
    {
      name: "list",
      description: "List configured MCP tools for the target platform",
      options: [],
      handler: mcpListHandler
    },
    {
      name: "config",
      description: "Configure API keys for MCP tools",
      arguments: [
        {
          name: "server",
          description: `MCP server to configure (${getServersRequiringAPIKeys().join(", ")})`,
          required: true
        }
      ],
      options: [],
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
  const results = await memory.search(options.pattern, options.namespace);
  console.log(`\u{1F50D} Search results for pattern: ${options.pattern}`);
  if (options.namespace && options.namespace !== "all") {
    console.log(`Namespace: ${options.namespace}`);
  }
  console.log(`Found: ${results.length} results
`);
  if (results.length === 0) {
    console.log("No matching entries found.");
    return;
  }
  results.forEach((entry, index) => {
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
  description: "Manage memory storage (set, get, search, list, delete, clear)",
  options: [
    {
      flags: "--target <type>",
      description: `Target platform (${targetManager.getImplementedTargets().join(", ")}, default: auto-detect)`
    }
  ],
  subcommands: [
    {
      name: "list",
      description: "List memory entries",
      options: [
        { flags: "--namespace <name>", description: "Filter by namespace (default: all)" },
        { flags: "--limit <number>", description: "Limit number of entries (default: 50)" }
      ],
      handler: memoryListHandler
    },
    {
      name: "search",
      description: "Search memory entries",
      options: [
        { flags: "<pattern>", description: "Search pattern" },
        { flags: "--namespace <name>", description: "Filter by namespace (default: all)" }
      ],
      handler: memorySearchHandler
    },
    {
      name: "delete",
      description: "Delete memory entry",
      options: [
        { flags: "<key>", description: "Memory key to delete" },
        { flags: "--namespace <name>", description: "Namespace (default: default)" },
        { flags: "--confirm", description: "Skip confirmation prompt" }
      ],
      handler: memoryDeleteHandler
    },
    {
      name: "clear",
      description: "Clear memory entries",
      options: [
        { flags: "--namespace <name>", description: "Clear specific namespace (default: all)" },
        { flags: "--confirm", description: "Skip confirmation prompt" }
      ],
      handler: memoryClearHandler
    },
    {
      name: "stats",
      description: "Show memory statistics",
      options: [{ flags: "--namespace <name>", description: "Filter by namespace (default: all)" }],
      handler: memoryStatsHandler
    },
    {
      name: "set",
      description: "Set memory entry",
      arguments: [
        { name: "key", description: "Memory key", required: true },
        { name: "value", description: "Memory value", required: true }
      ],
      options: [{ flags: "--namespace <name>", description: "Namespace (default: default)" }],
      handler: memorySetHandler
    }
  ]
};

// src/commands/memory-tui-command.ts
import { render } from "ink";
import React from "react";

// src/components/FullscreenMemoryTUI.tsx
import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const { waitUntilExit } = render(React.createElement(FullscreenMemoryTUI), {
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
var memoryTuiCommand = {
  name: "memory-tui",
  description: "Launch interactive memory management TUI",
  options: [
    {
      flags: "--target <type>",
      description: `Target platform (${targetManager.getImplementedTargets().join(", ")}, default: auto-detect)`
    }
  ],
  handler: handleMemoryTui
};

// src/commands/run-command.ts
import { spawn } from "child_process";
import fs4 from "fs/promises";
import path4 from "path";
async function validateRunOptions(options) {
  if (!options.prompt || options.prompt.trim() === "") {
    throw new CLIError("Prompt is required for run command", "MISSING_PROMPT");
  }
  options.target = "claude-code";
  if (!options.agent) {
    options.agent = "sparc-orchestrator";
  }
}
async function loadAgentContent(agentName) {
  try {
    const agentPath = path4.join(process.cwd(), "agents", `${agentName}.md`);
    try {
      const content = await fs4.readFile(agentPath, "utf-8");
      return content;
    } catch (error) {
      const packageAgentPath = path4.join(__dirname, "../../agents", `${agentName}.md`);
      const content = await fs4.readFile(packageAgentPath, "utf-8");
      return content;
    }
  } catch (error) {
    throw new CLIError(`Agent '${agentName}' not found`, "AGENT_NOT_FOUND");
  }
}
function extractAgentInstructions(agentContent) {
  const yamlFrontMatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
  const match = agentContent.match(yamlFrontMatterRegex);
  if (match) {
    return agentContent.substring(match[0].length).trim();
  }
  return agentContent.trim();
}
async function executeClaudeCode(combinedPrompt, options) {
  if (options.dryRun) {
    console.log("\u{1F50D} Dry run: Would execute Claude Code with combined prompt");
    console.log("\u{1F4DD} Combined prompt length:", combinedPrompt.length, "characters");
    console.log("\u{1F4DD} Combined prompt preview:");
    console.log("---");
    console.log(combinedPrompt.substring(0, 300) + (combinedPrompt.length > 300 ? "..." : ""));
    console.log("---");
    console.log("\u2705 Dry run completed successfully");
    return;
  }
  return new Promise((resolve, reject) => {
    const args = [combinedPrompt, "--dangerously-skip-permissions"];
    if (options.verbose) {
      console.log(`\u{1F680} Executing: claude "${combinedPrompt.substring(0, 100)}..." --dangerously-skip-permissions`);
      console.log(`\u{1F4DD} Prompt length: ${combinedPrompt.length} characters`);
    }
    const child = spawn("claude", args, {
      stdio: "inherit",
      shell: false
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new CLIError(`Claude Code exited with code ${code}`, "CLAUDE_ERROR"));
      }
    });
    child.on("error", (error) => {
      reject(new CLIError(`Failed to execute Claude Code: ${error.message}`, "CLAUDE_NOT_FOUND"));
    });
  });
}
var runCommand = {
  name: "run",
  description: "Run a prompt with a specific agent (default: sparc-orchestrator) using Claude Code",
  options: [
    {
      flags: "--agent <name>",
      description: "Agent to use (default: sparc-orchestrator)"
    },
    { flags: "--verbose", description: "Show detailed output" },
    { flags: "--dry-run", description: "Show what would be done without executing Claude Code" }
  ],
  arguments: [
    {
      name: "prompt",
      description: "The prompt to execute with the agent",
      required: true
    }
  ],
  handler: async (options) => {
    await validateRunOptions(options);
    const { prompt, agent, verbose } = options;
    if (verbose) {
      console.log("\u{1F680} Sylphx Flow Run");
      console.log("====================");
      console.log(`\u{1F916} Agent: ${agent}`);
      console.log(`\u{1F4AC} Prompt: ${prompt}`);
      console.log("");
    }
    const agentContent = await loadAgentContent(agent);
    const agentInstructions = extractAgentInstructions(agentContent);
    const combinedPrompt = `AGENT INSTRUCTIONS:
${agentInstructions}

USER PROMPT:
${prompt}`;
    if (verbose) {
      console.log("\u{1F4DD} Combined Prompt:");
      console.log("==================");
      console.log(combinedPrompt.substring(0, 500) + (combinedPrompt.length > 500 ? "..." : ""));
      console.log("");
    }
    await executeClaudeCode(combinedPrompt, options);
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
  if (config.arguments) {
    for (const argument of config.arguments) {
      const argName = argument.name === "servers" ? `[${argument.name}...]` : argument.required ? `<${argument.name}>` : `[${argument.name}]`;
      command.argument(argName, argument.description);
    }
  }
  if (config.subcommands) {
    for (const subcommand of config.subcommands) {
      command.addCommand(createCommand(subcommand));
    }
  }
  if (config.handler) {
    const handler = createAsyncHandler(config.handler, config.name);
    if (config.validator) {
      command.action((...args) => {
        const argValues = args.slice(0, -1);
        const cmd = args[args.length - 1];
        const options = cmd.opts();
        if (config.arguments && argValues.length > 0) {
          config.arguments.forEach((arg, index) => {
            if (index < argValues.length) {
              options[arg.name] = argValues[index];
            }
          });
        }
        config.validator?.(options);
        return handler(options);
      });
    } else {
      command.action((...args) => {
        const argValues = args.slice(0, -1);
        const cmd = args[args.length - 1];
        const options = cmd.opts();
        if (config.arguments && argValues.length > 0) {
          config.arguments.forEach((arg, index) => {
            if (index < argValues.length) {
              options[arg.name] = argValues[index];
            }
          });
        }
        return handler(options);
      });
    }
  }
  return command;
}
var COMMON_OPTIONS = [
  { flags: "--target <type>", description: "Force specific target" },
  { flags: "--verbose", description: "Show detailed output" },
  { flags: "--dry-run", description: "Show what would be done without making changes" },
  { flags: "--clear", description: "Clear obsolete items before processing" },
  {
    flags: "--mcp [servers...]",
    description: `Install MCP servers (${getAllServerIDs().join(", ")})`
  }
];

// src/utils/help.ts
function showDefaultHelp() {
  console.log("\u{1F680} Sylphx Flow CLI - Type-safe development flow");
  console.log("=========================================");
  console.log("");
  console.log("Available commands:");
  console.log("  init     Initialize project with Sylphx Flow");
  console.log("  mcp      Manage MCP tools");
  console.log("  memory   Manage memory storage");
  console.log("  tui      Interactive TUI for all operations");
  console.log("");
  console.log("Examples:");
  console.log("  sylphx-flow init");
  console.log("  sylphx-flow init --target opencode");
  console.log("  sylphx-flow mcp install --all");
  console.log("  sylphx-flow memory set key value");
  console.log("  sylphx-flow tui");
  console.log("");
  console.log('Run "sylphx-flow <command> --help" for more information about a command.');
}

// src/cli.ts
function createCLI() {
  const program = new Command2();
  program.name("sylphx-flow").description("Sylphx Flow - Type-safe development flow CLI").version("1.0.0");
  const commands = [initCommand, mcpCommand, memoryCommand, runCommand];
  for (const commandConfig of commands) {
    program.addCommand(createCommand(commandConfig));
  }
  program.command("tui").description("Launch interactive Sylphx Flow TUI").option("--target <type>", `Target platform (opencode, default: auto-detect)`).action(handleMemoryTui);
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
