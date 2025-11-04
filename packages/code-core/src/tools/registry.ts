/**
 * Tool Registry
 * Central registry for all AI SDK tools
 */

import { filesystemTools } from './filesystem.js';
import { shellTools } from './shell.js';
import { searchTools } from './search.js';
import { interactionTools } from './interaction.js';
import { createTodoTool, type TodoToolContext } from './todo.js';

/**
 * Options for getting AI SDK tools
 */
export interface GetToolsOptions {
  /**
   * Whether to include interactive tools (ask). Default: true
   */
  interactive?: boolean;

  /**
   * Todo tool context for session management
   * If provided, todo tools will be included
   * If omitted, todo tools will be excluded
   */
  todoContext?: TodoToolContext;
}

/**
 * Get all tools in AI SDK Tool format
 *
 * @example
 * ```typescript
 * // Without todo tools (headless mode)
 * const tools = getAISDKTools();
 *
 * // With todo tools (requires session context)
 * const tools = getAISDKTools({
 *   todoContext: {
 *     getCurrentSession: async () => await db.getCurrentSession(),
 *     updateTodos: async (sessionId, todos, nextId) => await db.updateTodos(...)
 *   }
 * });
 * ```
 */
export function getAISDKTools(options: GetToolsOptions = {}) {
  const { interactive = true, todoContext } = options;

  const baseTools = {
    ...filesystemTools,
    ...shellTools,
    ...searchTools,
    ...(interactive ? interactionTools : {}),
  };

  // Add todo tools if context is provided
  if (todoContext) {
    return {
      ...baseTools,
      updateTodos: createTodoTool(todoContext),
    };
  }

  return baseTools;
}

/**
 * Get tool names grouped by category
 */
export function getToolCategories(options: GetToolsOptions = {}) {
  const { todoContext } = options;

  const categories: Record<string, string[]> = {
    filesystem: Object.keys(filesystemTools),
    shell: Object.keys(shellTools),
    search: Object.keys(searchTools),
    interaction: Object.keys(interactionTools),
  };

  if (todoContext) {
    categories.todo = ['updateTodos'];
  }

  return categories;
}

/**
 * Get all tool names
 */
export function getAllToolNames(options: GetToolsOptions = {}): string[] {
  return Object.keys(getAISDKTools(options));
}
