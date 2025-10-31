/**
 * Tool Registry
 * Central registry for all AI SDK tools
 */

import { filesystemTools } from './filesystem.js';
import { shellTools } from './shell.js';
import { searchTools } from './search.js';

/**
 * Get all tools in AI SDK Tool format
 */
export function getAISDKTools() {
  return {
    ...filesystemTools,
    ...shellTools,
    ...searchTools,
  };
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
