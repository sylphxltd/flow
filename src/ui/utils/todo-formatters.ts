/**
 * Todo Formatters
 * Centralized todo display logic - single source of truth
 */

import type { Todo } from '../../types/todo.types.js';

/**
 * Get icon for todo status
 */
export const getTodoIcon = (status: Todo['status']): string => {
  switch (status) {
    case 'in_progress':
      return '▶';
    case 'pending':
      return '○';
    case 'completed':
      return '✓';
    case 'removed':
      return '✗';
  }
};

/**
 * Get color for todo status
 */
export const getTodoColor = (status: Todo['status']): string => {
  switch (status) {
    case 'in_progress':
      return '#00FF88';
    case 'pending':
      return 'gray';
    case 'completed':
      return 'green';
    case 'removed':
      return 'red';
  }
};

/**
 * Get display text for todo (activeForm for in_progress, content otherwise)
 */
export const getTodoDisplayText = (todo: Todo): string => {
  return todo.status === 'in_progress' ? todo.activeForm : todo.content;
};

/**
 * Check if todo text should be dimmed
 */
export const isTodoDimmed = (status: Todo['status']): boolean => {
  return status === 'pending' || status === 'completed';
};

/**
 * Check if todo text should be bold
 */
export const isTodoBold = (status: Todo['status']): boolean => {
  return status === 'in_progress';
};

/**
 * Check if todo text should have strikethrough
 */
export const isTodoStrikethrough = (status: Todo['status']): boolean => {
  return status === 'completed';
};

/**
 * Format todo for tool result display
 */
export const formatTodoChange = (
  type: 'added' | 'updated' | 'reordered',
  todo: Todo,
  beforeStatus?: Todo['status'],
  reorderType?: string
): string => {
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
};

/**
 * Format todo count for summary
 */
export const formatTodoCount = (todos: Todo[]): string => {
  const active = todos.filter((t) => t.status !== 'removed');
  const completed = todos.filter((t) => t.status === 'completed');
  const inProgress = todos.filter((t) => t.status === 'in_progress');
  const pending = todos.filter((t) => t.status === 'pending');

  return `${completed.length}/${active.length} (${inProgress.length} in progress, ${pending.length} pending)`;
};
