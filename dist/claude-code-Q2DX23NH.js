import {
  CLIError
} from "./chunk-G3QAKGBG.js";
import {
  BaseTransformer
} from "./chunk-76EOT6BH.js";

// src/transformers/claude-code.ts
import { spawn } from "child_process";
var ClaudeCodeTransformer = class extends BaseTransformer {
  /**
   * Transform agent content for Claude Code
   * Claude Code uses YAML front matter with specific fields
   */
  async transformAgentContent(content, metadata, sourcePath) {
    const { metadata: existingMetadata, content: baseContent } = await this.extractYamlFrontMatter(content);
    const claudeCodeMetadata = this.convertToClaudeCodeFormat(
      existingMetadata,
      baseContent,
      sourcePath
    );
    if (metadata) {
      Object.assign(claudeCodeMetadata, metadata);
    }
    return this.addYamlFrontMatter(baseContent, claudeCodeMetadata);
  }
  /**
   * Convert OpenCode frontmatter to Claude Code format
   */
  convertToClaudeCodeFormat(openCodeMetadata, content, sourcePath) {
    const agentName = openCodeMetadata.name || this.extractAgentName(content, openCodeMetadata, sourcePath);
    const description = openCodeMetadata.description || this.extractDescription(content);
    const result = {
      name: agentName,
      description
    };
    if (openCodeMetadata.model && openCodeMetadata.model !== "inherit") {
      result.model = openCodeMetadata.model;
    }
    return result;
  }
  /**
   * Extract agent name from content, file path, or generate one
   */
  extractAgentName(content, metadata, sourcePath) {
    if (sourcePath) {
      const pathName = this.extractNameFromPath(sourcePath);
      if (pathName) {
        return pathName;
      }
    }
    const titleMatch = content.match(/^#\s+(.+?)(?:\s+Agent)?$/m);
    if (titleMatch) {
      const title = titleMatch[1].trim().toLowerCase();
      return title.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + (title.includes("agent") ? "" : "-agent");
    }
    if (metadata.description) {
      const desc = metadata.description.toLowerCase();
      if (desc.includes("coder")) {
        return "code-implementation-agent";
      }
      if (desc.includes("reviewer")) {
        return "code-reviewer";
      }
      if (desc.includes("planner")) {
        return "development-planner";
      }
      if (desc.includes("researcher")) {
        return "research-specialist";
      }
      if (desc.includes("tester")) {
        return "quality-tester";
      }
      if (desc.includes("analyze")) {
        return "analysis-specialist";
      }
      if (desc.includes("orchestrator")) {
        return "development-orchestrator";
      }
    }
    return "development-agent";
  }
  /**
   * Extract agent name from file path
   */
  extractNameFromPath(sourcePath) {
    if (!sourcePath) {
      return null;
    }
    const pathWithoutExt = sourcePath.replace(/\.md$/, "");
    const filename = pathWithoutExt.split("/").pop() || pathWithoutExt;
    const kebabName = filename.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (kebabName.includes("constitution")) {
      return "sdd-constitution";
    }
    if (kebabName.includes("implement")) {
      return "sdd-implement";
    }
    if (kebabName.includes("clarify")) {
      return "sdd-clarify";
    }
    if (kebabName.includes("release")) {
      return "sdd-release";
    }
    if (kebabName.includes("task")) {
      return "sdd-task";
    }
    if (kebabName.includes("plan")) {
      return "sdd-plan";
    }
    if (kebabName.includes("specify")) {
      return "sdd-specify";
    }
    if (kebabName.includes("analyze")) {
      return "sdd-analyze";
    }
    if (kebabName.includes("orchestrator")) {
      return "sdd-development-orchestrator";
    }
    if (kebabName.includes("coder")) {
      return "core-coder";
    }
    if (kebabName.includes("planner")) {
      return "core-planner";
    }
    if (kebabName.includes("researcher")) {
      return "core-researcher";
    }
    if (kebabName.includes("reviewer")) {
      return "core-reviewer";
    }
    if (kebabName.includes("tester")) {
      return "core-tester";
    }
    if (kebabName.includes("scout")) {
      return "hive-mind-scout-explorer";
    }
    if (kebabName.includes("collective")) {
      return "hive-mind-collective-intelligence-coordinator";
    }
    if (kebabName.includes("worker")) {
      return "hive-mind-worker-specialist";
    }
    if (kebabName.includes("memory")) {
      return "hive-mind-swarm-memory-manager";
    }
    if (kebabName.includes("queen")) {
      return "hive-mind-queen-coordinator";
    }
    return kebabName || null;
  }
  /**
   * Extract description from metadata or content
   */
  extractDescription(content) {
    const firstParagraph = content.match(/^#\s+.+?\n\n(.+?)(?:\n\n|\n#|$)/s);
    if (firstParagraph) {
      return firstParagraph[1].trim().replace(/\n+/g, " ");
    }
    return "Development agent for specialized tasks";
  }
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
  }
  /**
   * Read Claude Code configuration
   */
  async readConfig(cwd) {
    const config = await super.readConfig(cwd);
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    return config;
  }
  /**
   * Write Claude Code configuration
   */
  async writeConfig(cwd, config) {
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    await super.writeConfig(cwd, config);
  }
  /**
   * Validate Claude Code-specific requirements
   */
  async validateRequirements(cwd) {
    await super.validateRequirements(cwd);
  }
  /**
   * Get Claude Code-specific help text
   */
  getHelpText() {
    let help = super.getHelpText();
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
  }
  /**
   * Helper method to extract agent metadata from YAML front matter
   */
  async extractAgentMetadata(content) {
    const { metadata } = await this.extractYamlFrontMatter(content);
    if (typeof metadata === "string") {
      try {
        return JSON.parse(metadata);
      } catch {
        return { raw: metadata };
      }
    }
    return metadata || {};
  }
  /**
   * Helper method to update agent metadata in YAML front matter
   */
  async updateAgentMetadata(content, updates) {
    const { metadata: existingMetadata, content: baseContent } = await this.extractYamlFrontMatter(content);
    const updatedMetadata = { ...existingMetadata, ...updates };
    return this.addYamlFrontMatter(baseContent, updatedMetadata);
  }
  /**
   * Helper method to check if content has valid YAML front matter
   */
  hasValidYamlFrontMatter(content) {
    const yamlRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    return yamlRegex.test(content);
  }
  /**
   * Helper method to ensure content has YAML front matter
   */
  async ensureYamlFrontMatter(content, defaultMetadata = {}) {
    if (this.hasValidYamlFrontMatter(content)) {
      return content;
    }
    return this.addYamlFrontMatter(content, defaultMetadata);
  }
  /**
   * Helper method to validate Claude Code agent front matter
   */
  validateClaudeCodeFrontMatter(metadata) {
    const requiredFields = ["name", "description"];
    if (typeof metadata !== "object" || metadata === null) {
      return false;
    }
    for (const field of requiredFields) {
      if (!metadata[field]) {
        return false;
      }
    }
    if (metadata.tools && !Array.isArray(metadata.tools)) {
      return false;
    }
    return true;
  }
  /**
   * Helper method to normalize Claude Code agent front matter
   */
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
  /**
   * Execute command using Claude Code with system prompt and user prompt
   */
  async executeCommand(systemPrompt, userPrompt, options = {}) {
    if (options.dryRun) {
      console.log("\u{1F50D} Dry run: Would execute Claude Code with --append-system-prompt");
      console.log("\u{1F4DD} System prompt to append length:", systemPrompt.length, "characters");
      console.log("\u{1F4DD} User prompt length:", userPrompt.length, "characters");
      console.log("\u{1F4DD} System prompt to append preview:");
      console.log("---");
      console.log(systemPrompt.substring(0, 300) + (systemPrompt.length > 300 ? "..." : ""));
      console.log("---");
      console.log("\u{1F4DD} User prompt preview:");
      console.log("---");
      console.log(userPrompt.substring(0, 300) + (userPrompt.length > 300 ? "..." : ""));
      console.log("---");
      console.log("\u2705 Dry run completed successfully");
      return;
    }
    return new Promise((resolve, reject) => {
      const args = ["--append-system-prompt", systemPrompt, "--dangerously-skip-permissions"];
      if (userPrompt.trim() !== "") {
        args.push(userPrompt);
      }
      if (options.verbose) {
        console.log(
          `\u{1F680} Executing: claude --append-system-prompt "${systemPrompt.substring(0, 50)}..." ${userPrompt.trim() !== "" ? `"${userPrompt.substring(0, 50)}..." ` : ""}--dangerously-skip-permissions`
        );
        console.log(`\u{1F4DD} System prompt length: ${systemPrompt.length} characters`);
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
          reject(new CLIError(`Claude Code exited with code ${code}`, "CLAUDE_ERROR"));
        }
      });
      child.on("error", (error) => {
        reject(new CLIError(`Failed to execute Claude Code: ${error.message}`, "CLAUDE_NOT_FOUND"));
      });
    });
  }
};
export {
  ClaudeCodeTransformer
};
