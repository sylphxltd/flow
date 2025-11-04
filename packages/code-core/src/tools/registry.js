/**
 * Tool Registry
 * Central registry for all AI SDK tools
 */
import { filesystemTools } from './filesystem.js';
import { shellTools } from './shell.js';
import { searchTools } from './search.js';
import { interactionTools } from './interaction.js';
import { createTodoTool } from './todo.js';
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
export function getAISDKTools(options = {}) {
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
export function getToolCategories(options = {}) {
    const { todoContext } = options;
    const categories = {
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
export function getAllToolNames(options = {}) {
    return Object.keys(getAISDKTools(options));
}
//# sourceMappingURL=registry.js.map