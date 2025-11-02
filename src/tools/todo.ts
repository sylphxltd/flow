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
      id: z.number().optional().describe('ID to update existing, omit to add new'),
      content: z.string().optional().describe('Imperative form: "Build feature"'),
      activeForm: z.string().optional().describe('Present continuous: "Building feature"'),
      status: z.enum(['pending', 'in_progress', 'completed', 'removed']).optional().describe('pending | in_progress (keep ONE only) | completed | removed'),
      reorder: z.object({
        type: z.enum(['top', 'last', 'before', 'after']).describe('top | last | before | after'),
        id: z.number().optional().describe('Target ID (for before/after)'),
      }).optional().describe('Change order'),
    })).describe('Add/update todos. Examples: [{ content: "Build login", activeForm: "Building login", status: "pending" }] | [{ id: 1, status: "completed" }]'),
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
