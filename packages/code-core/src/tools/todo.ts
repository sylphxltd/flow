/**
 * Todo Management Tools
 * Tools for LLM to track and manage work progress
 *
 * Design: Per-session todo lists
 * ===============================
 *
 * Todos are scoped to sessions (not global) to prevent cross-contamination:
 * - Each session has independent todos
 * - updateTodos tool operates on current session
 * - New sessions start with empty todo list
 *
 * Why per-session?
 * - Context isolation: Session A's todos don't interfere with Session B
 * - LLM clarity: AI only sees tasks relevant to current conversation
 * - Prevents bug: Starting new session and seeing old session's todos
 *
 * Implementation:
 * - Tool gets current sessionId from store
 * - Calls store.updateTodos(sessionId, updates)
 * - Returns error if no active session
 */

import { tool } from 'ai';
import { z } from 'zod';
import { useAppStore } from '../ui/stores/app-store.js';
import { formatTodoChange } from '../ui/utils/todo-formatters.js';

/**
 * Update todos - Batch add/update todos
 *
 * ⚠️ IMPORTANT: This tool operates on the CURRENT session's todos only.
 * It does not affect other sessions' todos.
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
  execute: ({ todos }) => {
    const store = useAppStore.getState();
    const sessionId = store.currentSessionId;

    if (!sessionId) {
      return {
        error: 'No active session',
        summary: 'Failed: no active session',
        changes: [],
        total: 0,
      };
    }

    // Get current session's todos before update
    const session = store.sessions.find((s) => s.id === sessionId);
    if (!session) {
      return {
        error: 'Session not found',
        summary: 'Failed: session not found',
        changes: [],
        total: 0,
      };
    }

    const beforeState = session.todos;

    // Update todos for this session
    store.updateTodos(sessionId, todos);

    // Get updated session todos
    const updatedSession = store.sessions.find((s) => s.id === sessionId);
    const afterState = updatedSession?.todos || [];

    // Categorize changes
    const addedTodos = todos.filter((t) => t.id === undefined);
    const updatedTodos = todos.filter((t) => t.id !== undefined);

    // Build result using centralized formatters
    const changes: string[] = [];

    if (addedTodos.length > 0) {
      addedTodos.forEach((t) => {
        const addedTodo = afterState.find((todo) => todo.content === t.content);
        if (addedTodo) {
          changes.push(formatTodoChange('added', addedTodo));
        }
      });
    }

    if (updatedTodos.length > 0) {
      updatedTodos.forEach((t) => {
        const before = beforeState.find((todo) => todo.id === t.id);
        const after = afterState.find((todo) => todo.id === t.id);
        if (before && after) {
          if (t.status && t.status !== before.status) {
            changes.push(formatTodoChange('updated', after, before.status));
          } else if (t.reorder) {
            changes.push(formatTodoChange('reordered', after, undefined, t.reorder.type));
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
