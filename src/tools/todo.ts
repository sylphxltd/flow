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
    const beforeState = store.todos;

    store.updateTodos(todos);

    const afterState = store.todos;

    // Categorize changes
    const addedTodos = todos.filter((t) => t.id === undefined);
    const updatedTodos = todos.filter((t) => t.id !== undefined);

    // Build result
    const changes: string[] = [];

    if (addedTodos.length > 0) {
      addedTodos.forEach((t) => {
        changes.push(`+ ${t.content}`);
      });
    }

    if (updatedTodos.length > 0) {
      updatedTodos.forEach((t) => {
        const before = beforeState.find((todo) => todo.id === t.id);
        const after = afterState.find((todo) => todo.id === t.id);
        if (before && after) {
          if (t.status && t.status !== before.status) {
            changes.push(`[${t.id}] ${before.status} → ${t.status}`);
          } else if (t.reorder) {
            changes.push(`[${t.id}] reordered to ${t.reorder.type}`);
          }
        }
      });
    }

    return {
      summary: `${addedTodos.length} added, ${updatedTodos.length} updated`,
      changes: changes.length > 0 ? changes : ['No changes'],
      total: afterState.filter((t) => t.status !== 'removed').length,
    };
  },
});

/**
 * Export all todo tools
 */
export const todoTools = {
  updateTodos: updateTodosTool,
};
