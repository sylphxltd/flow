/**
 * Todo Management Tools
 * Tools for LLM to track and manage work progress
 *
 * Design: Dependency Injection for Headless Architecture
 * ======================================================
 *
 * This module provides a factory function to create todo tools with
 * injected session management. This allows the core SDK to remain
 * completely headless and stateless.
 *
 * Architecture:
 * - Tools are created via factory function with injected context
 * - Context provides session access and update methods
 * - No global state, no UI dependencies
 * - Works with any session management implementation
 *
 * Example usage:
 * ```typescript
 * const todoTool = createTodoTool({
 *   getCurrentSession: async () => await db.getCurrentSession(),
 *   updateTodos: async (sessionId, todos, nextId) => await db.updateTodos(...)
 * });
 * ```
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { Todo, TodoUpdate } from '../types/todo.types.js';
import { formatTodoChange } from '../utils/todo-formatters.js';

/**
 * Session context interface for todo tools
 * Consumers must implement this interface to provide session access
 */
export interface TodoToolContext {
  /**
   * Get the current session
   * Returns null if no session is active
   */
  getCurrentSession: () => Promise<{
    id: string;
    todos: Todo[];
    nextTodoId: number;
  } | null>;

  /**
   * Update todos for a session
   * This should persist the changes to the database
   */
  updateTodos: (sessionId: string, todos: Todo[], nextTodoId: number) => Promise<void>;
}

/**
 * Create todo tool with injected session context
 * This factory pattern allows the tool to work in any environment
 */
export function createTodoTool(context: TodoToolContext) {
  return tool({
    description: 'Update task list to track work progress',
    inputSchema: z.object({
      todos: z
        .array(
          z.object({
            id: z.number().optional().describe('ID to update existing, omit to add new'),
            content: z.string().optional().describe('Imperative form: "Build feature"'),
            activeForm: z.string().optional().describe('Present continuous: "Building feature"'),
            status: z
              .enum(['pending', 'in_progress', 'completed', 'removed'])
              .optional()
              .describe('pending | in_progress (keep ONE only) | completed | removed'),
            reorder: z
              .object({
                type: z.enum(['top', 'last', 'before', 'after']).describe('top | last | before | after'),
                id: z.number().optional().describe('Target ID (for before/after)'),
              })
              .optional()
              .describe('Change order'),
          })
        )
        .describe(
          'Add/update todos. Examples: [{ content: "Build login", activeForm: "Building login", status: "pending" }] | [{ id: 1, status: "completed" }]'
        ),
    }),
    execute: async ({ todos }) => {
      // Get current session from context
      const session = await context.getCurrentSession();

      if (!session) {
        return {
          error: 'No active session',
          summary: 'Failed: no active session',
          changes: [],
          total: 0,
        };
      }

      // Clone before state for change tracking
      const beforeState = [...session.todos];
      const workingTodos = [...session.todos];
      let nextTodoId = session.nextTodoId;

      // Apply updates to working copy
      for (const update of todos) {
        if (update.id === undefined || update.id === null) {
          // Add new todo
          const maxOrdering = workingTodos.length > 0 ? Math.max(...workingTodos.map((t) => t.ordering)) : 0;

          workingTodos.push({
            id: nextTodoId,
            content: update.content || '',
            activeForm: update.activeForm || '',
            status: update.status || 'pending',
            ordering: maxOrdering + 10,
          });
          nextTodoId++;
        } else {
          // Update existing todo
          const todo = workingTodos.find((t) => t.id === update.id);
          if (!todo) continue;

          if (update.content !== undefined) todo.content = update.content;
          if (update.activeForm !== undefined) todo.activeForm = update.activeForm;
          if (update.status !== undefined) todo.status = update.status;

          // Handle reordering
          if (update.reorder) {
            const { type, id: targetId } = update.reorder;

            if (type === 'top') {
              const minOrdering = Math.min(...workingTodos.map((t) => t.ordering));
              todo.ordering = minOrdering - 10;
            } else if (type === 'last') {
              const maxOrdering = Math.max(...workingTodos.map((t) => t.ordering));
              todo.ordering = maxOrdering + 10;
            } else if (type === 'before' && targetId !== undefined) {
              const target = workingTodos.find((t) => t.id === targetId);
              if (target) {
                const sorted = [...workingTodos].sort((a, b) => a.ordering - b.ordering || a.id - b.id);
                const targetIdx = sorted.findIndex((t) => t.id === targetId);
                const before = targetIdx > 0 ? sorted[targetIdx - 1] : null;

                if (before) {
                  todo.ordering = Math.floor((before.ordering + target.ordering) / 2);
                } else {
                  todo.ordering = target.ordering - 10;
                }
              }
            } else if (type === 'after' && targetId !== undefined) {
              const target = workingTodos.find((t) => t.id === targetId);
              if (target) {
                const sorted = [...workingTodos].sort((a, b) => a.ordering - b.ordering || a.id - b.id);
                const targetIdx = sorted.findIndex((t) => t.id === targetId);
                const after = targetIdx < sorted.length - 1 ? sorted[targetIdx + 1] : null;

                if (after) {
                  todo.ordering = Math.floor((target.ordering + after.ordering) / 2);
                } else {
                  todo.ordering = target.ordering + 10;
                }
              }
            }
          }
        }
      }

      // Persist changes via context
      await context.updateTodos(session.id, workingTodos, nextTodoId);

      // Build change summary
      const addedTodos = todos.filter((t) => t.id === undefined);
      const updatedTodos = todos.filter((t) => t.id !== undefined);
      const changes: string[] = [];

      if (addedTodos.length > 0) {
        addedTodos.forEach((t) => {
          const addedTodo = workingTodos.find((todo) => todo.content === t.content);
          if (addedTodo) {
            changes.push(formatTodoChange('added', addedTodo));
          }
        });
      }

      if (updatedTodos.length > 0) {
        updatedTodos.forEach((t) => {
          const before = beforeState.find((todo) => todo.id === t.id);
          const after = workingTodos.find((todo) => todo.id === t.id);
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
        total: workingTodos.filter((t) => t.status !== 'removed').length,
      };
    },
  });
}

/**
 * Export types for consumers
 */
export type { TodoToolContext };
