/**
 * Todo Management Tools
 * Tools for LLM to track and manage work progress
 */

import { tool } from 'ai';
import { z } from 'zod';
import { useAppStore } from '../ui/stores/app-store.js';

/**
 * Update todos - Batch add/update todos
 */
export const updateTodosTool = tool({
  description: 'Update task list to track work progress',
  inputSchema: z.object({
    todos: z.array(z.object({
      id: z.number().optional().describe('Omit to add new todo, provide to update existing. User messages show IDs: [1] Task name'),
      content: z.string().optional().describe('Imperative form (e.g., "Build feature", "Fix bug"). Required when adding new todo'),
      activeForm: z.string().optional().describe('Present continuous form (e.g., "Building feature") shown when status=in_progress. Required when adding new todo'),
      status: z.enum(['pending', 'in_progress', 'completed', 'removed']).optional().describe('pending: not started | in_progress: currently working (keep ONLY ONE) | completed: done | removed: cancelled'),
      reorder: z.object({
        type: z.enum(['top', 'last', 'before', 'after']).describe('top: move to first | last: move to end | before: insert before target | after: insert after target'),
        id: z.number().optional().describe('Target todo ID (required for before/after)'),
      }).optional().describe('Change task order. Default order: first added = first to do'),
    })).describe('Batch add/update todos. Examples: [{ content: "Build login", activeForm: "Building login", status: "pending" }] to add | [{ id: 1, status: "completed" }, { id: 2, status: "in_progress" }] to update | [{ id: 3, reorder: { type: "top" } }] to prioritize'),
  }),
  execute: async ({ todos }) => {
    const store = useAppStore.getState();
    store.updateTodos(todos);

    const added = todos.filter((t) => t.id === undefined).length;
    const updated = todos.filter((t) => t.id !== undefined).length;

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} added`);
    if (updated > 0) parts.push(`${updated} updated`);

    return `Todos updated: ${parts.join(', ') || 'no changes'}`;
  },
});

/**
 * Export all todo tools
 */
export const todoTools = {
  updateTodos: updateTodosTool,
};
