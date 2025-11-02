/**
 * Todo Management Tools
 * Tools for LLM to track and manage work progress
 */

import { tool } from 'ai';
import { z } from 'zod';
import { useAppStore } from '../ui/stores/app-store.js';

/**
 * Manage todos - Add, update, or complete tasks
 */
export const manageTodosTool = tool({
  description: `Manage your task list to track work progress. Use this to:
- Add new tasks when starting work on something
- Update task status as you progress (pending → in_progress → completed)
- Mark tasks as completed when done
- Remove tasks that are no longer needed

The user can see your task list above the input area to track your progress.

Best practices:
- Add a todo BEFORE starting significant work
- Keep exactly ONE task as "in_progress" at a time
- Mark completed IMMEDIATELY after finishing (don't batch completions)
- Remove tasks that become irrelevant
- Use clear, action-oriented descriptions

Status meanings:
- pending: Not started yet
- in_progress: Currently working on (only one at a time)
- completed: Finished successfully`,
  inputSchema: z.object({
    action: z.enum(['add', 'update', 'remove', 'list']).describe('Action to perform'),
    todoId: z.string().optional().describe('Todo ID (required for update/remove)'),
    content: z.string().optional().describe('Task description (required for add, optional for update)'),
    status: z.enum(['pending', 'in_progress', 'completed']).optional().describe('Task status (optional for update)'),
  }),
  execute: async ({ action, todoId, content, status }) => {
    const store = useAppStore.getState();

    switch (action) {
      case 'add': {
        if (!content) {
          return 'Error: content is required for add action';
        }
        const id = store.addTodo(content);
        return `Added todo: "${content}" (ID: ${id})`;
      }

      case 'update': {
        if (!todoId) {
          return 'Error: todoId is required for update action';
        }
        const todo = store.todos.find((t) => t.id === todoId);
        if (!todo) {
          return `Error: Todo with ID ${todoId} not found`;
        }

        const updates: { content?: string; status?: 'pending' | 'in_progress' | 'completed' } = {};
        if (content !== undefined) updates.content = content;
        if (status !== undefined) updates.status = status;

        store.updateTodo(todoId, updates);

        const parts: string[] = [];
        if (content !== undefined) parts.push(`content: "${content}"`);
        if (status !== undefined) parts.push(`status: ${status}`);

        return `Updated todo ${todoId}: ${parts.join(', ')}`;
      }

      case 'remove': {
        if (!todoId) {
          return 'Error: todoId is required for remove action';
        }
        const todo = store.todos.find((t) => t.id === todoId);
        if (!todo) {
          return `Error: Todo with ID ${todoId} not found`;
        }

        store.removeTodo(todoId);
        return `Removed todo: "${todo.content}"`;
      }

      case 'list': {
        const todos = store.todos;
        if (todos.length === 0) {
          return 'No todos';
        }

        const grouped = {
          pending: todos.filter((t) => t.status === 'pending'),
          in_progress: todos.filter((t) => t.status === 'in_progress'),
          completed: todos.filter((t) => t.status === 'completed'),
        };

        const lines: string[] = [];

        if (grouped.in_progress.length > 0) {
          lines.push('In Progress:');
          grouped.in_progress.forEach((t) => lines.push(`  → ${t.content} (${t.id})`));
        }

        if (grouped.pending.length > 0) {
          lines.push('Pending:');
          grouped.pending.forEach((t) => lines.push(`  ○ ${t.content} (${t.id})`));
        }

        if (grouped.completed.length > 0) {
          lines.push('Completed:');
          grouped.completed.forEach((t) => lines.push(`  ✓ ${t.content} (${t.id})`));
        }

        return lines.join('\n');
      }
    }
  },
});

/**
 * Export all todo tools
 */
export const todoTools = {
  manageTodos: manageTodosTool,
};
