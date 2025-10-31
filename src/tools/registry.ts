/**
 * Tool Registry
 * Central registry for all AI SDK tools
 */

import type { Tool } from 'ai';
import { createTool, type ToolDefinition } from './base.js';
import { filesystemTools } from './filesystem.js';
import { shellTools } from './shell.js';
import { searchTools } from './search.js';

/**
 * All available tools
 */
const ALL_TOOLS: Record<string, ToolDefinition> = {
  ...filesystemTools,
  ...shellTools,
  ...searchTools,
};

/**
 * Get all tools in AI SDK Tool format
 */
export function getAISDKTools(): Record<string, Tool> {
  const tools: Record<string, Tool> = {};

  for (const [name, tool] of Object.entries(ALL_TOOLS)) {
    tools[name] = createTool(tool);
  }

  return tools;
}

/**
 * Get specific tools by name
 */
export function getTools(names: string[]): Record<string, Tool> {
  const tools: Record<string, Tool> = {};

  for (const name of names) {
    if (ALL_TOOLS[name]) {
      tools[name] = createTool(ALL_TOOLS[name]);
    }
  }

  return tools;
}

/**
 * Get tool names grouped by category
 */
export function getToolCategories() {
  return {
    filesystem: Object.keys(filesystemTools),
    shell: Object.keys(shellTools),
    search: Object.keys(searchTools),
  };
}

/**
 * Get all tool names
 */
export function getAllToolNames(): string[] {
  return Object.keys(ALL_TOOLS);
}
