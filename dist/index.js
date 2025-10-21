#!/usr/bin/env node
import {
  CLIError,
  createAsyncHandler
} from "./chunk-ZU23WWFA.js";
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
  if (!server?.envVars) {
    return [];
  }
  return Object.entries(server.envVars).filter(([, config]) => config.required).map(([name]) => name);
}
function getOptionalEnvVars(serverId) {
  const server = MCP_SERVER_REGISTRY[serverId];
  if (!server?.envVars) {
    return [];
  }
  return Object.entries(server.envVars).filter(([, config]) => !config.required).map(([name]) => name);
}
function getAllEnvVars(serverId) {
  const server = MCP_SERVER_REGISTRY[serverId];
  if (!server?.envVars) {
    return [];
  }
  return Object.keys(server.envVars);
}

// src/core/init.ts
import fs6 from "fs";
import path6 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

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

// src/config/rules.js
import fs2 from "fs";
import { fileURLToPath } from "url";
import path2 from "path";
var CORE_RULES = {
  reasoning: "reasoning.md",
  communication: "communication.md",
  security: "security.md",
  quality: "quality.md"
};
function getRulesPath(ruleType = "reasoning") {
  return path2.join(process.cwd(), "config", "rules", CORE_RULES[ruleType]);
}
function getAllRuleTypes() {
  return Object.keys(CORE_RULES);
}
function ruleFileExists(ruleType) {
  const rulePath = getRulesPath(ruleType);
  return fs2.existsSync(rulePath);
}

// src/utils/target-utils.ts
import fs3 from "fs/promises";
import path3 from "path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
var fileUtils = {
  getConfigPath(config, cwd) {
    return path3.join(cwd, config.configFile);
  },
  async readConfig(config, cwd) {
    const configPath = fileUtils.getConfigPath(config, cwd);
    try {
      await fs3.access(configPath);
    } catch {
      return {};
    }
    if (config.configFile.endsWith(".jsonc")) {
      const { readJSONCFile } = await import("./jsonc-6K4NEAWM.js");
      return readJSONCFile(configPath);
    }
    if (config.configFile.endsWith(".json")) {
      const content = await fs3.readFile(configPath, "utf8");
      return JSON.parse(content);
    }
    if (config.configFile.endsWith(".yaml") || config.configFile.endsWith(".yml")) {
      const content = await fs3.readFile(configPath, "utf8");
      return parseYaml(content);
    }
    throw new Error(`Unsupported config file format: ${config.configFile}`);
  },
  async writeConfig(config, cwd, data) {
    const configPath = fileUtils.getConfigPath(config, cwd);
    await fs3.mkdir(path3.dirname(configPath), { recursive: true });
    if (config.configFile.endsWith(".jsonc")) {
      const { writeJSONCFile } = await import("./jsonc-6K4NEAWM.js");
      await writeJSONCFile(configPath, data, config.configSchema || void 0);
    } else if (config.configFile.endsWith(".json")) {
      const content = JSON.stringify(data, null, 2);
      await fs3.writeFile(configPath, content, "utf8");
    } else if (config.configFile.endsWith(".yaml") || config.configFile.endsWith(".yml")) {
      const content = stringifyYaml(data);
      await fs3.writeFile(configPath, content, "utf8");
    } else {
      throw new Error(`Unsupported config file format: ${config.configFile}`);
    }
  },
  async validateRequirements(config, cwd) {
    const agentDir = path3.join(cwd, config.agentDir);
    try {
      await fs3.mkdir(agentDir, { recursive: true });
      const testFile = path3.join(agentDir, ".sylphx-test");
      await fs3.writeFile(testFile, "test", "utf8");
      await fs3.unlink(testFile);
    } catch (error) {
      throw new Error(`Cannot write to agent directory ${agentDir}: ${error}`);
    }
    if (config.installation.createConfigFile) {
      const configPath = await fileUtils.getConfigPath(config, cwd);
      try {
        const configDir = path3.dirname(configPath);
        await fs3.mkdir(configDir, { recursive: true });
        const testFile = path3.join(configDir, ".sylphx-test");
        await fs3.writeFile(testFile, "test", "utf8");
        await fs3.unlink(testFile);
      } catch (error) {
        throw new Error(`Cannot write to config file location ${configPath}: ${error}`);
      }
    }
  }
};
var yamlUtils = {
  async extractFrontMatter(content) {
    const yamlRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(yamlRegex);
    if (match) {
      try {
        const parsedMetadata = parseYaml(match[1]);
        return {
          metadata: parsedMetadata,
          content: match[2]
        };
      } catch (error) {
        console.warn("Failed to parse YAML front matter:", error);
        return { metadata: {}, content: match[2] };
      }
    }
    return { metadata: {}, content };
  },
  async addFrontMatter(content, metadata) {
    if (!metadata || Object.keys(metadata).length === 0) {
      return content;
    }
    try {
      const yamlStr = stringifyYaml(metadata);
      return `---
${yamlStr}---

${content}`;
    } catch (error) {
      console.warn("Failed to stringify YAML metadata:", error);
      const yamlStr = JSON.stringify(metadata, null, 2);
      return `---
${yamlStr}---

${content}`;
    }
  },
  async stripFrontMatter(content) {
    const { content: strippedContent } = await yamlUtils.extractFrontMatter(content);
    return strippedContent;
  },
  hasValidFrontMatter(content) {
    const yamlRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    return yamlRegex.test(content);
  },
  async ensureFrontMatter(content, defaultMetadata = {}) {
    if (yamlUtils.hasValidFrontMatter(content)) {
      return content;
    }
    return yamlUtils.addFrontMatter(content, defaultMetadata);
  },
  async extractAgentMetadata(content) {
    const { metadata } = await yamlUtils.extractFrontMatter(content);
    if (typeof metadata === "string") {
      try {
        return JSON.parse(metadata);
      } catch {
        return { raw: metadata };
      }
    }
    return metadata || {};
  },
  async updateAgentMetadata(content, updates) {
    const { metadata: existingMetadata, content: baseContent } = await yamlUtils.extractFrontMatter(content);
    const updatedMetadata = { ...existingMetadata, ...updates };
    return yamlUtils.addFrontMatter(baseContent, updatedMetadata);
  },
  validateClaudeCodeFrontMatter(metadata) {
    if (typeof metadata !== "object" || metadata === null) {
      return false;
    }
    const requiredFields = ["name", "description"];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        return false;
      }
    }
    if (metadata.tools && !Array.isArray(metadata.tools)) {
      return false;
    }
    return true;
  },
  normalizeClaudeCodeFrontMatter(metadata) {
    const normalized = { ...metadata };
    if (normalized.tools && typeof normalized.tools === "string") {
      normalized.tools = [normalized.tools];
    }
    if (!normalized.model) {
      normalized.model = "inherit";
    }
    return normalized;
  }
};
var pathUtils = {
  flattenPath(filePath) {
    const parsed = path3.parse(filePath);
    const dir = parsed.dir.replace(/[\/\\]/g, "-");
    return dir ? `${dir}-${parsed.name}` : parsed.name;
  },
  getAgentFilePath(sourcePath, config, agentDir) {
    if (config.flatten) {
      const flattenedName = pathUtils.flattenPath(sourcePath);
      return path3.join(agentDir, `${flattenedName}${config.agentExtension}`);
    }
    return path3.join(agentDir, sourcePath);
  },
  extractNameFromPath(sourcePath) {
    if (!sourcePath) return null;
    const pathWithoutExt = sourcePath.replace(/\.md$/, "");
    const filename = pathWithoutExt.split("/").pop() || pathWithoutExt;
    const kebabName = filename.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const patterns = {
      "constitution": "sdd-constitution",
      "implement": "sdd-implement",
      "clarify": "sdd-clarify",
      "release": "sdd-release",
      "task": "sdd-task",
      "plan": "sdd-plan",
      "specify": "sdd-specify",
      "analyze": "sdd-analyze",
      "orchestrator": "sdd-development-orchestrator",
      "coder": "core-coder",
      "planner": "core-planner",
      "researcher": "core-researcher",
      "reviewer": "core-reviewer",
      "tester": "core-tester",
      "scout": "hive-mind-scout-explorer",
      "collective": "hive-mind-collective-intelligence-coordinator",
      "worker": "hive-mind-worker-specialist",
      "memory": "hive-mind-swarm-memory-manager",
      "queen": "hive-mind-queen-coordinator"
    };
    for (const [pattern, result] of Object.entries(patterns)) {
      if (kebabName.includes(pattern)) return result;
    }
    return kebabName || null;
  },
  extractAgentName(content, metadata, sourcePath) {
    if (sourcePath) {
      const pathName = pathUtils.extractNameFromPath(sourcePath);
      if (pathName) return pathName;
    }
    const titleMatch = content.match(/^#\s+(.+?)(?:\s+Agent)?$/m);
    if (titleMatch) {
      const title = titleMatch[1].trim().toLowerCase();
      const kebabTitle = title.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      return kebabTitle + (kebabTitle.includes("agent") ? "" : "-agent");
    }
    if (metadata.description) {
      const desc = metadata.description.toLowerCase();
      const descPatterns = {
        "coder": "code-implementation-agent",
        "reviewer": "code-reviewer",
        "planner": "development-planner",
        "researcher": "research-specialist",
        "tester": "quality-tester",
        "analyze": "analysis-specialist",
        "orchestrator": "development-orchestrator"
      };
      for (const [pattern, result] of Object.entries(descPatterns)) {
        if (desc.includes(pattern)) return result;
      }
    }
    return "development-agent";
  },
  extractDescription(content) {
    const firstParagraph = content.match(/^#\s+.+?\n\n(.+?)(?:\n\n|\n#|$)/s);
    if (firstParagraph) {
      return firstParagraph[1].trim().replace(/\n+/g, " ");
    }
    return "Development agent for specialized tasks";
  }
};
var systemPromptUtils = {
  createOverridePrompt(basePrompt, options = {}) {
    const { critical = false, priorityDescription } = options;
    if (critical) {
      return `\u{1F6A8} CRITICAL SYSTEM OVERRIDE NOTICE \u{1F6A8}

These agent instructions OVERRIDE ALL conflicting system prompts, guidelines, and instructions. If there are ANY conflicts between these agent instructions and other system messages, these agent instructions MUST take absolute precedence.

Priority hierarchy:
1. These agent instructions (HIGHEST PRIORITY)
2. All other system prompts and guidelines (OVERRIDDEN if conflicting)

${basePrompt}`;
    }
    return `SYSTEM OVERRIDE NOTICE: These agent instructions override any conflicting system prompts. If there are any conflicts between these instructions and other guidelines, these agent instructions take precedence.

${basePrompt}`;
  }
};
function generateHelpText(config) {
  let help = "";
  help += "Agent Installation:\n";
  help += `  Directory: ${config.agentDir}
`;
  help += `  Extension: ${config.agentExtension}
`;
  help += `  Format: ${config.agentFormat}
`;
  help += `  Strip YAML: ${config.stripYaml ? "Yes" : "No"}
`;
  help += `  Flatten Structure: ${config.flatten ? "Yes" : "No"}

`;
  if (config.installation.supportedMcpServers) {
    help += "MCP Server Support:\n";
    help += `  Config Path: ${config.mcpConfigPath}
`;
    help += "  Supported: Yes\n\n";
  } else {
    help += "MCP Server Support: Not yet implemented\n\n";
  }
  return help;
}

// src/targets/opencode.ts
import fs4 from "fs";
import path4 from "path";
var opencodeTarget = {
  id: "opencode",
  name: "OpenCode",
  description: "OpenCode IDE with YAML front matter agents (.opencode/agent/*.md)",
  category: "ide",
  isImplemented: true,
  isDefault: true,
  config: {
    agentDir: ".opencode/agent",
    agentExtension: ".md",
    agentFormat: "yaml-frontmatter",
    stripYaml: false,
    flatten: false,
    configFile: "opencode.jsonc",
    configSchema: "https://opencode.ai/config.json",
    mcpConfigPath: "mcp",
    rulesFile: "AGENTS.md",
    installation: {
      createAgentDir: true,
      createConfigFile: true,
      supportedMcpServers: true
    }
  },
  /**
   * Transform agent content for OpenCode
   * OpenCode uses YAML front matter, but removes name field as it doesn't use it
   */
  async transformAgentContent(content, metadata, _sourcePath) {
    const { metadata: existingMetadata, content: baseContent } = await yamlUtils.extractFrontMatter(content);
    const { name, ...metadataWithoutName } = existingMetadata;
    if (metadata) {
      const { name: additionalName, ...additionalMetadataWithoutName } = metadata;
      const mergedMetadata = { ...metadataWithoutName, ...additionalMetadataWithoutName };
      return yamlUtils.addFrontMatter(baseContent, mergedMetadata);
    }
    return yamlUtils.addFrontMatter(baseContent, metadataWithoutName);
  },
  /**
   * Transform MCP server configuration for OpenCode
   * Convert from Claude Code's optimal format to OpenCode's format
   */
  transformMCPConfig(config) {
    if (config.type === "stdio") {
      const openCodeConfig = {
        type: "local",
        command: [config.command]
      };
      if (config.args && config.args.length > 0) {
        openCodeConfig.command.push(...config.args);
      }
      if (config.env) {
        openCodeConfig.environment = config.env;
      }
      return openCodeConfig;
    }
    if (config.type === "http") {
      return {
        type: "remote",
        url: config.url,
        ...config.headers && { headers: config.headers }
      };
    }
    if (config.type === "local" || config.type === "remote") {
      return config;
    }
    return config;
  },
  getConfigPath: (cwd) => Promise.resolve(fileUtils.getConfigPath(opencodeTarget.config, cwd)),
  /**
   * Read OpenCode configuration with structure normalization
   */
  async readConfig(cwd) {
    const config = await fileUtils.readConfig(opencodeTarget.config, cwd);
    if (!config.mcp) {
      config.mcp = {};
    }
    return config;
  },
  /**
   * Write OpenCode configuration with structure normalization
   */
  async writeConfig(cwd, config) {
    if (!config.mcp) {
      config.mcp = {};
    }
    await fileUtils.writeConfig(opencodeTarget.config, cwd, config);
  },
  validateRequirements: (cwd) => fileUtils.validateRequirements(opencodeTarget.config, cwd),
  /**
   * Get detailed OpenCode-specific help text
   */
  getHelpText() {
    let help = generateHelpText(opencodeTarget.config);
    help += "OpenCode-Specific Information:\n";
    help += "  Configuration File: opencode.jsonc\n";
    help += "  Schema: https://opencode.ai/config.json\n";
    help += "  Agent Format: Markdown with YAML front matter\n";
    help += "  MCP Integration: Automatic server discovery\n\n";
    help += "Example Agent Structure:\n";
    help += "  ---\n";
    help += `  name: "My Agent"
`;
    help += `  description: "Agent description"
`;
    help += "  ---\n\n";
    help += "  Agent content here...\n\n";
    return help;
  },
  /**
   * Detect if this target is being used in the current environment
   */
  detectFromEnvironment() {
    try {
      const cwd = process.cwd();
      return fs4.existsSync(path4.join(cwd, "opencode.jsonc"));
    } catch {
      return false;
    }
  }
};

// src/targets/claude-code.ts
import fs5 from "fs";
import path5 from "path";
var claudeCodeTarget = {
  id: "claude-code",
  name: "Claude Code",
  description: "Claude Code CLI with YAML front matter agents (.claude/agents/*.md)",
  category: "cli",
  isImplemented: true,
  isDefault: false,
  config: {
    agentDir: ".claude/agents",
    agentExtension: ".md",
    agentFormat: "yaml-frontmatter",
    stripYaml: false,
    flatten: false,
    configFile: ".mcp.json",
    configSchema: null,
    mcpConfigPath: "mcpServers",
    rulesFile: "CLAUDE.md",
    installation: {
      createAgentDir: true,
      createConfigFile: true,
      supportedMcpServers: true
    }
  },
  /**
   * Transform agent content for Claude Code
   * Convert OpenCode format to Claude Code format with proper name/description extraction
   */
  async transformAgentContent(content, metadata, sourcePath) {
    const { metadata: existingMetadata, content: baseContent } = await yamlUtils.extractFrontMatter(content);
    const claudeCodeMetadata = convertToClaudeCodeFormat(
      existingMetadata,
      baseContent,
      sourcePath
    );
    if (metadata) {
      Object.assign(claudeCodeMetadata, metadata);
    }
    return yamlUtils.addFrontMatter(baseContent, claudeCodeMetadata);
  },
  /**
   * Transform MCP server configuration for Claude Code
   * Convert from various formats to Claude Code's optimal format
   */
  transformMCPConfig(config) {
    if (config.type === "local") {
      const [command, ...args] = config.command;
      return {
        type: "stdio",
        command,
        ...args && args.length > 0 && { args },
        ...config.environment && { env: config.environment }
      };
    }
    if (config.type === "stdio") {
      return {
        type: "stdio",
        command: config.command,
        ...config.args && config.args.length > 0 && { args: config.args },
        ...config.env && { env: config.env }
      };
    }
    if (config.type === "remote") {
      return {
        type: "http",
        url: config.url,
        ...config.headers && { headers: config.headers }
      };
    }
    if (config.type === "http") {
      return {
        type: "http",
        url: config.url,
        ...config.headers && { headers: config.headers }
      };
    }
    return config;
  },
  getConfigPath: (cwd) => Promise.resolve(fileUtils.getConfigPath(claudeCodeTarget.config, cwd)),
  /**
   * Read Claude Code configuration with structure normalization
   */
  async readConfig(cwd) {
    const config = await fileUtils.readConfig(claudeCodeTarget.config, cwd);
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    return config;
  },
  /**
   * Write Claude Code configuration with structure normalization
   */
  async writeConfig(cwd, config) {
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    await fileUtils.writeConfig(claudeCodeTarget.config, cwd, config);
  },
  validateRequirements: (cwd) => fileUtils.validateRequirements(claudeCodeTarget.config, cwd),
  /**
   * Get detailed Claude Code-specific help text
   */
  getHelpText() {
    let help = generateHelpText(claudeCodeTarget.config);
    help += "Claude Code-Specific Information:\n";
    help += "  Configuration File: .mcp.json\n";
    help += "  Agent Format: Markdown with YAML front matter\n";
    help += "  MCP Integration: Full server support\n\n";
    help += "Example Agent Structure:\n";
    help += "  ---\n";
    help += `  name: "code-reviewer"
`;
    help += `  description: "Expert code review specialist"
`;
    help += "  ---\n\n";
    help += "  Agent content here...\n\n";
    help += `Note: Only 'name' and 'description' fields are supported.
`;
    help += "Tools field omitted to allow all tools by default (whitelist model limitation).\n";
    help += "Unsupported fields (mode, temperature, etc.) are automatically removed.\n\n";
    help += "Example MCP Configuration:\n";
    help += "  {\n";
    help += `    "mcpServers": {
`;
    help += `      "filesystem": {
`;
    help += `        "type": "stdio",
`;
    help += `        "command": "npx",
`;
    help += `        "args": ["@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"]
`;
    help += "      },\n";
    help += `      "git": {
`;
    help += `        "type": "stdio",
`;
    help += `        "command": "npx",
`;
    help += `        "args": ["@modelcontextprotocol/server-git", "."],
`;
    help += `        "env": {
`;
    help += `          "GIT_TRACE": "1"
`;
    help += "        }\n";
    help += "      },\n";
    help += `      "api-server": {
`;
    help += `        "type": "http",
`;
    help += `        "url": "https://api.example.com/mcp",
`;
    help += `        "headers": {
`;
    help += `          "Authorization": "Bearer $API_KEY"
`;
    help += "        }\n";
    help += "      }\n";
    help += "    }\n";
    help += "  }\n\n";
    help += "Note: Environment variables can be expanded in command, args, env, url, and headers.\n\n";
    return help;
  },
  /**
   * Execute command using Claude Code with system prompt and user prompt
   */
  async executeCommand(systemPrompt, userPrompt, options = {}) {
    const enhancedSystemPrompt = systemPromptUtils.createOverridePrompt(systemPrompt, {
      critical: true
    });
    if (options.dryRun) {
      console.log("\u{1F50D} Dry run: Would execute Claude Code with --append-system-prompt");
      console.log("\u{1F4DD} System prompt to append length:", enhancedSystemPrompt.length, "characters");
      console.log("\u{1F4DD} User prompt length:", userPrompt.length, "characters");
      console.log("\u2705 Dry run completed successfully");
      return;
    }
    const { spawn } = await import("child_process");
    const { CLIError: CLIError2 } = await import("./error-handler-4SKBQW3N.js");
    return new Promise((resolve, reject) => {
      const args = ["--system-prompt", enhancedSystemPrompt, "--dangerously-skip-permissions"];
      if (userPrompt.trim() !== "") {
        args.push(userPrompt);
      }
      if (options.verbose) {
        console.log(`\u{1F680} Executing Claude Code with system prompt`);
        console.log(`\u{1F4DD} System prompt length: ${enhancedSystemPrompt.length} characters`);
        console.log(`\u{1F4DD} User prompt length: ${userPrompt.length} characters`);
      }
      const child = spawn("claude", args, {
        stdio: "inherit",
        shell: false
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new CLIError2(`Claude Code exited with code ${code}`, "CLAUDE_ERROR"));
        }
      });
      child.on("error", (error) => {
        reject(new CLIError2(`Failed to execute Claude Code: ${error.message}`, "CLAUDE_NOT_FOUND"));
      });
    });
  },
  /**
   * Detect if this target is being used in the current environment
   */
  detectFromEnvironment() {
    try {
      const cwd = process.cwd();
      return fs5.existsSync(path5.join(cwd, ".mcp.json"));
    } catch {
      return false;
    }
  }
};
function convertToClaudeCodeFormat(openCodeMetadata, content, sourcePath) {
  const agentName = openCodeMetadata.name || pathUtils.extractAgentName(content, openCodeMetadata, sourcePath);
  const description = openCodeMetadata.description || pathUtils.extractDescription(content);
  const result = {
    name: agentName,
    description
  };
  if (openCodeMetadata.model && openCodeMetadata.model !== "inherit") {
    result.model = openCodeMetadata.model;
  }
  return result;
}

// src/config/targets.ts
var TargetRegistry = class {
  targets = [];
  /**
   * Register a target
   */
  register(target) {
    this.targets.push(target);
  }
  /**
   * Get all targets
   */
  getAllTargets() {
    return [...this.targets];
  }
  /**
   * Get implemented targets only
   */
  getImplementedTargets() {
    return this.targets.filter((target) => target.isImplemented);
  }
  /**
   * Get all target IDs
   */
  getAllTargetIDs() {
    return this.targets.map((target) => target.id);
  }
  /**
   * Get implemented target IDs
   */
  getImplementedTargetIDs() {
    return this.getImplementedTargets().map((target) => target.id);
  }
  /**
   * Get target by ID
   */
  getTarget(id) {
    return this.targets.find((target) => target.id === id);
  }
  /**
   * Get default target
   */
  getDefaultTarget() {
    const defaultTarget = this.targets.find((target) => target.isDefault);
    if (!defaultTarget) {
      throw new Error("No default target configured");
    }
    return defaultTarget;
  }
  /**
   * Get targets that support MCP servers
   */
  getTargetsWithMCPSupport() {
    return this.getImplementedTargets().filter((target) => target.config.installation.supportedMcpServers);
  }
  /**
   * Check if target is implemented
   */
  isTargetImplemented(id) {
    const target = this.getTarget(id);
    return target?.isImplemented ?? false;
  }
  /**
   * Initialize targets - register all available targets
   */
  initialize() {
    if (this.targets.length > 0) {
      return;
    }
    this.register(opencodeTarget);
    this.register(claudeCodeTarget);
  }
};
var targetRegistry = new TargetRegistry();
targetRegistry.initialize();
var getAllTargetIDs = () => targetRegistry.getAllTargetIDs();
var getImplementedTargetIDs = () => targetRegistry.getImplementedTargetIDs();
var getDefaultTarget = () => targetRegistry.getDefaultTarget().id;
var getTarget = (id) => targetRegistry.getTarget(id);
var getTargetsWithMCPSupport = () => targetRegistry.getTargetsWithMCPSupport().map((target) => target.id);

// src/core/target-manager.ts
var TargetManager = class {
  /**
   * Get all available targets
   */
  getAllTargets() {
    return targetRegistry.getAllTargets();
  }
  /**
   * Get implemented targets only
   */
  getImplementedTargets() {
    return targetRegistry.getImplementedTargets();
  }
  /**
   * Get target by ID
   */
  getTarget(id) {
    return targetRegistry.getTarget(id);
  }
  /**
   * Resolve target with fallback to default and detection
   */
  async resolveTarget(options) {
    if (options.target) {
      if (!getTarget(options.target)) {
        throw new Error(`Unknown target: ${options.target}. Available targets: ${getAllTargetIDs().join(", ")}`);
      }
      return options.target;
    }
    const detectedTarget = this.detectTargetFromEnvironment();
    if (detectedTarget) {
      return detectedTarget;
    }
    const defaultTarget = getDefaultTarget();
    return defaultTarget;
  }
  /**
   * Detect target from current environment
   */
  detectTargetFromEnvironment() {
    try {
      const implementedTargets = this.getImplementedTargets();
      const nonDefaultTargets = implementedTargets.filter((target) => !target.isDefault);
      const defaultTargets = implementedTargets.filter((target) => target.isDefault);
      for (const target of nonDefaultTargets) {
        const detected = target.detectFromEnvironment && target.detectFromEnvironment();
        if (detected) {
          return target.id;
        }
      }
      for (const target of defaultTargets) {
        const detected = target.detectFromEnvironment && target.detectFromEnvironment();
        if (detected) {
          return target.id;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  /**
   * Check if target is implemented
   */
  isTargetImplemented(targetId) {
    return getTarget(targetId)?.isImplemented ?? false;
  }
  /**
   * Get targets that support MCP servers
   */
  getTargetsWithMCPSupport() {
    return getTargetsWithMCPSupport();
  }
  /**
   * Get implemented target IDs
   */
  getImplementedTargetIDs() {
    return getImplementedTargetIDs();
  }
  /**
   * Get all target IDs
   */
  getAllTargetIDs() {
    return getAllTargetIDs();
  }
};
var targetManager = new TargetManager();

// src/core/init.ts
async function getAgentFiles() {
  const __filename = fileURLToPath2(import.meta.url);
  const __dirname2 = path6.dirname(__filename);
  const agentsDir = path6.join(__dirname2, "..", "agents");
  if (!fs6.existsSync(agentsDir)) {
    throw new Error(`Could not find agents directory at: ${agentsDir}`);
  }
  const allFiles = [];
  const rootFiles = fs6.readdirSync(agentsDir, { withFileTypes: true }).filter((dirent) => dirent.isFile() && dirent.name.endsWith(".md")).map((dirent) => dirent.name);
  allFiles.push(...rootFiles);
  const subdirs = fs6.readdirSync(agentsDir, { withFileTypes: true }).filter((dirent) => dirent.isDirectory() && dirent.name !== "archived").map((dirent) => dirent.name);
  for (const subdir of subdirs) {
    const subdirPath = path6.join(agentsDir, subdir);
    const files = collectFiles(subdirPath, [".md"]);
    allFiles.push(...files.map((file) => path6.join(subdir, file)));
  }
  return allFiles;
}
async function installAgents(options) {
  const cwd = process.cwd();
  const results = [];
  const targetId = await targetManager.resolveTarget({ target: options.target });
  const target = targetManager.getTarget(targetId);
  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }
  console.log(`\u{1F4DD} Using target: ${target.name}`);
  const config = target.config;
  const agentsDir = path6.join(cwd, config.agentDir);
  const processContent = async (content, sourcePath) => {
    return await target.transformAgentContent(content, void 0, sourcePath);
  };
  if (options.clear && fs6.existsSync(agentsDir)) {
    let expectedFiles;
    const agentFiles2 = await getAgentFiles();
    expectedFiles = new Set(
      agentFiles2.map((filePath) => {
        const parsedPath = path6.parse(filePath);
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
  fs6.mkdirSync(agentsDir, { recursive: true });
  const agentFiles = await getAgentFiles();
  if (options.quiet !== true) {
    console.log(
      `\u{1F4C1} Installing ${agentFiles.length} agents to ${agentsDir.replace(`${process.cwd()}/`, "")}`
    );
    console.log("");
  }
  if (options.dryRun) {
    console.log("\u2705 Dry run completed - no files were modified");
    return;
  }
  const __filename = fileURLToPath2(import.meta.url);
  const __dirname2 = path6.dirname(__filename);
  const agentsSourceDir = path6.join(__dirname2, "..", "agents");
  const processPromises = agentFiles.map(async (agentFile) => {
    const sourcePath = path6.join(agentsSourceDir, agentFile);
    const destPath = path6.join(agentsDir, agentFile);
    const destDir = path6.dirname(destPath);
    if (!fs6.existsSync(destDir)) {
      fs6.mkdirSync(destDir, { recursive: true });
    }
    const localInfo = getLocalFileInfo(destPath);
    const _isNew = !localInfo;
    let content = fs6.readFileSync(sourcePath, "utf8");
    content = await processContent(content, agentFile);
    const localProcessed = localInfo ? await processContent(localInfo.content, agentFile) : "";
    const contentChanged = !localInfo || localProcessed !== content;
    if (contentChanged) {
      fs6.writeFileSync(destPath, content, "utf8");
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
async function installRules(options) {
  const cwd = process.cwd();
  const targetId = await targetManager.resolveTarget({ target: options.target });
  const target = targetManager.getTarget(targetId);
  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }
  if (!target.config.rulesFile) {
    return;
  }
  const availableRuleTypes = getAllRuleTypes();
  const existingRuleFiles = availableRuleTypes.filter((ruleType) => ruleFileExists(ruleType));
  if (existingRuleFiles.length === 0) {
    console.warn("\u26A0\uFE0F No rule files found in config/rules/");
    return;
  }
  let mergedContent = `# Development Rules

`;
  for (const ruleType of existingRuleFiles) {
    const rulePath = getRulesPath(ruleType);
    const ruleContent = fs6.readFileSync(rulePath, "utf8");
    const lines = ruleContent.split("\n");
    const contentStartIndex = lines.findIndex((line) => line.startsWith("# ")) + 1;
    const ruleMainContent = lines.slice(contentStartIndex).join("\n").trim();
    mergedContent += `---

${ruleMainContent}

`;
  }
  mergedContent = mergedContent.replace(/\n\n---\n\n$/, "");
  const rulesDestPath = path6.join(cwd, target.config.rulesFile);
  const localInfo = getLocalFileInfo(rulesDestPath);
  const templateContent = mergedContent;
  if (options.dryRun) {
    console.log(`\u{1F50D} Dry run: Would install rules file to ${rulesDestPath.replace(`${cwd}/`, "")}`);
    return;
  }
  if (localInfo && localInfo.content === templateContent) {
    if (options.quiet !== true) {
      console.log(`\u{1F4CB} Rules file already current: ${target.config.rulesFile}`);
    }
    return;
  }
  fs6.writeFileSync(rulesDestPath, templateContent, "utf8");
  if (options.quiet !== true) {
    const action = localInfo ? "Updated" : "Created";
    const ruleCount = existingRuleFiles.length;
    const ruleList = existingRuleFiles.map((type) => type.charAt(0).toUpperCase() + type.slice(1)).join(", ");
    console.log(`\u{1F4CB} ${action} rules file: ${target.config.rulesFile} (merged ${ruleCount} rules: ${ruleList})`);
  }
}

// src/utils/target-config.ts
async function addMCPServersToTarget(cwd, targetId, serverTypes) {
  const target = targetManager.getTarget(targetId);
  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }
  if (!target.config.installation.supportedMcpServers) {
    throw new Error(`Target ${targetId} does not support MCP servers`);
  }
  const config = await target.readConfig(cwd);
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
      const transformedConfig = target.transformMCPConfig(server.config);
      mcpSection[server.name] = transformedConfig;
      console.log(`\u{1F4E6} Added MCP server: ${server.name} (${server.description})`);
      addedCount++;
    }
  }
  await target.writeConfig(cwd, config);
  console.log(`\u2705 Updated ${target.config.configFile} with ${addedCount} new MCP server(s)`);
}
async function listMCPServersForTarget(cwd, targetId) {
  const target = targetManager.getTarget(targetId);
  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }
  const config = await target.readConfig(cwd);
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
  const target = targetManager.getTarget(targetId);
  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
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
  const config = await target.readConfig(cwd);
  const mcpConfigPath = target.config.mcpConfigPath;
  const mcpSection = getNestedProperty(config, mcpConfigPath);
  const isServerInstalled = !!mcpSection?.[server.name];
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
      await target.writeConfig(cwd, config);
      return false;
    }
    if (isServerInstalled && hasExistingValidKeys) {
      console.log(`\u2705 Keeping ${server.name} (existing API keys are valid)`);
      return true;
    }
    if (requiredEnvVars.length === 0 && optionalEnvVars.length > 0) {
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
      const transformedConfig = target.transformMCPConfig(baseConfig);
      mcpSectionForUpdate[server.name] = {
        ...transformedConfig,
        environment: {
          ...baseConfig.environment || {},
          ...apiKeys
        }
      };
    } else {
      const transformedConfig = target.transformMCPConfig(baseConfig);
      mcpSectionForUpdate[server.name] = transformedConfig;
    }
  }
  setNestedProperty(config, mcpConfigPath, mcpSectionForUpdate);
  await target.writeConfig(cwd, config);
  console.log(`\u2705 Updated ${server.name} with API keys for ${target.name}`);
  return true;
}
function validateTarget(targetId) {
  const target = targetManager.getTarget(targetId);
  if (!target) {
    throw new Error(`Unknown target: ${targetId}. Available targets: ${targetManager.getImplementedTargetIDs().join(", ")}`);
  }
  if (!target.isImplemented) {
    throw new Error(`Target '${targetId}' is not implemented. Available targets: ${targetManager.getImplementedTargetIDs().join(", ")}`);
  }
  return targetId;
}
function targetSupportsMCPServers(targetId) {
  const target = targetManager.getTarget(targetId);
  return target?.config.installation.supportedMcpServers ?? false;
}
function getNestedProperty(obj, path8) {
  return path8.split(".").reduce((current, key) => current?.[key], obj);
}
function setNestedProperty(obj, path8, value) {
  const keys = path8.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}
function deleteNestedProperty(obj, path8) {
  const keys = path8.split(".");
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
    if (!allEnvVars.length) {
      continue;
    }
    console.log(`
\u{1F511} Configuring API keys for ${server.description}:`);
    for (const envVar of allEnvVars) {
      const envConfig = server.envVars?.[envVar];
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
      description: `Force specific target (${targetManager.getImplementedTargetIDs().join(", ")}, default: opencode)`
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
    await installRules(options);
    console.log("");
    console.log("\u{1F389} Setup complete!");
    console.log("");
    console.log("\u{1F4CB} Next steps:");
    const target = targetManager.getTarget(targetId);
    if (targetId === "opencode") {
      console.log("   \u2022 Open OpenCode and start using your agents!");
      if (options.mcp !== false) {
        console.log("   \u2022 MCP tools will be automatically loaded by OpenCode");
      }
    } else {
      console.log(`   \u2022 Start using your agents with ${target?.name || targetId}!`);
      console.log(`   \u2022 Run 'sylphx-flow init --help' for target-specific information`);
    }
  }
};

// src/commands/mcp-command.ts
var mcpStartHandler = async () => {
  await import("./sylphx-flow-mcp-server-CTEXPGFR.js");
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
      const value = typeof safeValue === "string" ? safeValue.substring(0, 50) + (safeValue.length > 50 ? "..." : "") : `${JSON.stringify(safeValue).substring(0, 50)}...`;
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
      const value = typeof safeValue === "string" ? safeValue.substring(0, 50) + (safeValue.length > 50 ? "..." : "") : `${JSON.stringify(safeValue).substring(0, 50)}...`;
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
    const value = typeof safeValue === "string" ? safeValue.substring(0, 50) + (safeValue.length > 50 ? "..." : "") : `${JSON.stringify(safeValue).substring(0, 50)}...`;
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
  console.log("\u{1F4CD} Database: .sylphx-flow/memory.db");
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
              namespace: state.selectedEntry?.namespace,
              key: state.selectedEntry?.key,
              value: JSON.stringify(state.selectedEntry?.value, null, 2),
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
    if (!state.selectedEntry) {
      return null;
    }
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
import fs7 from "fs/promises";
import path7 from "path";
async function validateRunOptions(options) {
  options.target = await targetManager.resolveTarget({ target: options.target });
  if (!options.agent) {
    options.agent = "sparc-orchestrator";
  }
}
async function loadAgentContent(agentName) {
  try {
    const agentPath = path7.join(process.cwd(), "agents", `${agentName}.md`);
    try {
      const content = await fs7.readFile(agentPath, "utf-8");
      return content;
    } catch (_error) {
      const packageAgentPath = path7.join(__dirname, "../../agents", `${agentName}.md`);
      const content = await fs7.readFile(packageAgentPath, "utf-8");
      return content;
    }
  } catch (_error) {
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
function executeTargetCommand(targetId, systemPrompt, userPrompt, options) {
  const target = targetManager.getTarget(targetId);
  if (!target) {
    throw new CLIError(`Target not found: ${targetId}`, "TARGET_NOT_FOUND");
  }
  if (!target.isImplemented) {
    throw new CLIError(
      `Target '${targetId}' is not implemented. Supported targets: ${getExecutableTargets().join(", ")}`,
      "TARGET_NOT_IMPLEMENTED"
    );
  }
  if (!target.executeCommand) {
    throw new CLIError(
      `Target '${targetId}' does not support command execution. Supported targets: ${getExecutableTargets().join(", ")}`,
      "EXECUTION_NOT_SUPPORTED"
    );
  }
  return target.executeCommand(systemPrompt, userPrompt, options);
}
function getExecutableTargets() {
  return targetManager.getImplementedTargetIDs().filter((targetId) => {
    const target = targetManager.getTarget(targetId);
    return target?.executeCommand !== void 0;
  });
}
var runCommand = {
  name: "run",
  description: "Run a prompt with a specific agent (default: sparc-orchestrator) using the detected or specified target",
  options: [
    {
      flags: "--target <name>",
      description: `Target platform (${targetManager.getImplementedTargetIDs().join(", ")}, default: auto-detect)`
    },
    {
      flags: "--agent <name>",
      description: "Agent to use (default: sparc-orchestrator)"
    },
    { flags: "--verbose", description: "Show detailed output" },
    { flags: "--dry-run", description: "Show what would be done without executing the command" }
  ],
  arguments: [
    {
      name: "prompt",
      description: "The prompt to execute with the agent (optional - if not provided, will start Claude Code interactively)",
      required: false
    }
  ],
  handler: async (options) => {
    await validateRunOptions(options);
    const { prompt, agent, verbose } = options;
    if (verbose) {
      console.log("\u{1F680} Sylphx Flow Run");
      console.log("====================");
      console.log(`\u{1F3AF} Target: ${options.target}`);
      console.log(`\u{1F916} Agent: ${agent}`);
      if (prompt) {
        console.log(`\u{1F4AC} Prompt: ${prompt}`);
      } else {
        console.log("\u{1F4AC} Prompt: [Interactive mode]");
      }
      console.log("");
    }
    const agentContent = await loadAgentContent(agent);
    const agentInstructions = extractAgentInstructions(agentContent);
    const systemPrompt = `AGENT INSTRUCTIONS:
${agentInstructions}`;
    let userPrompt = "";
    if (prompt && prompt.trim() !== "") {
      userPrompt = prompt;
    }
    if (verbose) {
      console.log("\u{1F4DD} System Prompt:");
      console.log("================");
      console.log(systemPrompt.substring(0, 500) + (systemPrompt.length > 500 ? "..." : ""));
      console.log("");
      if (userPrompt.trim() !== "") {
        console.log("\u{1F4DD} User Prompt:");
        console.log("==============");
        console.log(userPrompt.substring(0, 500) + (userPrompt.length > 500 ? "..." : ""));
        console.log("");
      } else {
        console.log("\u{1F4DD} User Prompt: [Interactive mode - Claude will greet the user]");
        console.log("");
      }
    }
    await executeTargetCommand(options.target, systemPrompt, userPrompt, options);
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
  program.command("tui").description("Launch interactive Sylphx Flow TUI").option("--target <type>", "Target platform (opencode, default: auto-detect)").action(handleMemoryTui);
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
