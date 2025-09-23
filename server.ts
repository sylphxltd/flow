import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs/promises";
import path from "path";

// Static list of known rules
const KNOWN_RULES = {
  ai: ['ai-sdk-integration'],
  backend: ['serverless', 'trpc'],
  core: ['functional', 'general', 'perfect-execution', 'planning-first', 'serena-integration', 'testing', 'typescript'],
  data: ['drizzle', 'id-generation', 'redis'],
  devops: ['biome', 'observability'],
  framework: ['flutter', 'nextjs', 'react', 'sveltekit', 'zustand'],
  misc: ['response-language', 'tool-usage'],
  security: ['security-auth'],
  ui: ['pandacss']
};

const universalDescription = "This MCP server provides access to type-safe development rules for modern web development. Universal core principles: Enforce single responsibility, keep files/functions concise (<300 lines/file, <50 lines/function), use immutability, validate inputs/security at boundaries, plan with peer review/CI, avoid globals/mutables/hardcoded secrets. Tools are registered for each rule file. Each tool is named 'read_[category]_[rule_name]' (e.g., 'read_core_general') and returns the full rule content when called (parameterless). Always call the relevant tool to review the rule before applying it in your work.";

const server = new McpServer({
  name: "rules-mcp-server",
  version: "1.0.0",
  description: universalDescription
});

// Function to get rule content from GitHub
async function getRuleContent(category: string, ruleName: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/sylphxltd/rules/main/docs/rules/${category}/${ruleName}.mdc`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    return `Rule not found: ${category}/${ruleName}.mdc`;
  }
}

// Register tools statically
Object.entries(KNOWN_RULES).forEach(([category, rules]) => {
  rules.forEach((ruleName) => {
    const toolName = `read_${category}_${ruleName}`;
    const description = `Read the ${ruleName} rule from the ${category} category. IMPORTANT: Before implementing any changes or code related to this rule, always review the full content returned by this tool to ensure compliance. If you do not remember the details, call this tool first and read the content before proceeding.`;

    server.registerTool(
      toolName,
      {
        title: `Read ${ruleName} Rule (${category})`,
        description: description,
        inputSchema: z.object({}) as any
      },
      async (args: any, extra: any) => {
        try {
          const content = await getRuleContent(category, ruleName);
          return { content: [{ type: "text" as const, text: content }] };
        } catch (err) {
          return { content: [{ type: "text" as const, text: `Error loading rule: ${category}/${ruleName}` }] };
        }
      }
    );
  });
});

export default server;