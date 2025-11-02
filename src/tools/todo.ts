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
  description: `Update your task list to track work progress. The user can see your task list above the input area.

Usage notes:
- Add new todos by omitting id, update existing by providing id
- User messages show your pending tasks
- Todos sorted by order added (first added = first to do)
- Use reorder to change priority
- Update multiple todos in one call

Fields:
- id: number (optional) - If provided, updates existing todo. If omitted, creates new todo with auto-increment ID
- content: string (optional when updating) - Imperative form (e.g., "Build feature", "Fix bug")
- activeForm: string (optional when updating) - Present continuous form shown when in_progress (e.g., "Building feature", "Fixing bug")
- status: "pending" | "in_progress" | "completed" | "removed" (optional when updating)
- reorder: object (optional) - Change task order
  - type: "top" | "last" | "before" | "after"
  - id: number (required when type is "before" or "after") - Reference todo ID

Best practices:
- Add a todo BEFORE starting work
- Keep exactly ONE task as "in_progress" at a time
- Mark "completed" or "removed" IMMEDIATELY after finishing
- Use reorder to prioritize tasks

Examples:
// Add new todos
updateTodos([
  { content: "Build login", activeForm: "Building login", status: "pending" },
  { content: "Write tests", activeForm: "Writing tests", status: "pending" }
])

// Update status
updateTodos([{ id: 1, status: "in_progress" }])

// Complete and start next
updateTodos([
  { id: 1, status: "completed" },
  { id: 2, status: "in_progress" }
])

// Move todo 3 to top
updateTodos([{ id: 3, reorder: { type: "top" } }])

// Move todo 5 before todo 2
updateTodos([{ id: 5, reorder: { type: "before", id: 2 } }])`,
  inputSchema: z.object({
    todos: z.array(z.object({
      id: z.number().optional().describe('Todo ID (omit to create new, provide to update existing)'),
      content: z.string().optional().describe('Task description (imperative form)'),
      activeForm: z.string().optional().describe('Present continuous form shown during execution'),
      status: z.enum(['pending', 'in_progress', 'completed', 'removed']).optional().describe('Task status'),
      reorder: z.object({
        type: z.enum(['top', 'last', 'before', 'after']).describe('Where to move the todo'),
        id: z.number().optional().describe('Reference todo ID (required for before/after)'),
      }).optional().describe('Change task order'),
    })).describe('List of todos to add or update'),
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
