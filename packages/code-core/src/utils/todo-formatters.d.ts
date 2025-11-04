/**
 * Todo Formatters
 * Pure functions for formatting todo display
 * No UI dependencies - just string formatting
 */
import type { Todo } from '../types/todo.types.js';
/**
 * Format todo change for tool result display
 */
export declare function formatTodoChange(type: 'added' | 'updated' | 'reordered', todo: Todo, beforeStatus?: Todo['status'], reorderType?: string): string;
/**
 * Format todo count for summary
 */
export declare function formatTodoCount(todos: Todo[]): string;
//# sourceMappingURL=todo-formatters.d.ts.map