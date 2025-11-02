/**
 * Todo Management Tools
 * Tools for LLM to track and manage work progress
 */

import { tool } from 'ai';
import { z } from 'zod';
import { useAppStore } from '../ui/stores/app-store.js';

/**
 * Update todo list - Replace entire todo list
 */
export const updateTodosTool = tool({
  description: `Update your task list to track work progress. The user can see your task list above the input area.

Usage notes:
- Call this tool whenever tasks change (add, update status, remove)
- Provide the complete todo list each time (replaces existing list)
- Each todo must have:
  - content: Imperative form (e.g., "Build feature X", "Fix bug Y")
  - status: pending | in_progress | completed
  - activeForm: Present continuous form shown during execution (e.g., "Building feature X", "Fixing bug Y")

Best practices:
- Add a todo BEFORE starting significant work
- Keep exactly ONE task as "in_progress" at a time
- Mark completed IMMEDIATELY after finishing (don't batch)
- Remove tasks from the list when completed (or keep if you want user to see completion)
- Use clear, action-oriented descriptions

Example:
updateTodos({
  todos: [
    { content: "Build login feature", status: "in_progress", activeForm: "Building login feature" },
    { content: "Write tests", status: "pending", activeForm: "Writing tests" },
    { content: "Update documentation", status: "pending", activeForm: "Updating documentation" }
  ]
})`,
  inputSchema: z.object({
    todos: z.array(z.object({
      content: z.string().min(1).describe('Task description (imperative form)'),
      status: z.enum(['pending', 'in_progress', 'completed']).describe('Task status'),
      activeForm: z.string().min(1).describe('Present continuous form for display during execution'),
    })).describe('Complete todo list (replaces existing list)'),
  }),
  execute: async ({ todos }) => {
    const store = useAppStore.getState();
    store.setTodos(todos);

    if (todos.length === 0) {
      return 'Todos cleared';
    }

    const pending = todos.filter((t) => t.status === 'pending').length;
    const inProgress = todos.filter((t) => t.status === 'in_progress').length;
    const completed = todos.filter((t) => t.status === 'completed').length;

    return `Todos updated: ${inProgress} in progress, ${pending} pending, ${completed} completed (${todos.length} total)`;
  },
});

/**
 * Export all todo tools
 */
export const todoTools = {
  updateTodos: updateTodosTool,
};
