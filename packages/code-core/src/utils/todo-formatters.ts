/**
 * Todo Formatters
 * Pure functions for formatting todo display
 * No UI dependencies - just string formatting
 */

import type { Todo } from '../types/todo.types.js';

/**
 * Format todo change for tool result display
 */
export function formatTodoChange(
  type: 'added' | 'updated' | 'reordered',
  todo: Todo,
  beforeStatus?: Todo['status'],
  reorderType?: string
): string {
  if (type === 'added') {
    return `+ ${todo.content}`;
  }

  if (type === 'reordered' && reorderType) {
    return `[${todo.id}] reordered to ${reorderType}`;
  }

  if (type === 'updated' && beforeStatus && beforeStatus !== todo.status) {
    return `[${todo.id}] ${beforeStatus} → ${todo.status}`;
  }

  return `[${todo.id}] updated`;
}

/**
 * Format todo count for summary
 */
export function formatTodoCount(todos: Todo[]): string {
  const active = todos.filter((t) => t.status !== 'removed');
  const completed = todos.filter((t) => t.status === 'completed');
  const inProgress = todos.filter((t) => t.status === 'in_progress');
  const pending = todos.filter((t) => t.status === 'pending');

  return `${completed.length}/${active.length} (${inProgress.length} in progress, ${pending.length} pending)`;
}
