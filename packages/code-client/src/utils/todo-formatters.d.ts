/**
 * Todo Formatters
 * Centralized todo display logic - single source of truth
 */
import type { Todo } from '@sylphx/code-core';
/**
 * Get icon for todo status
 */
export declare const getTodoIcon: (status: Todo["status"]) => string;
/**
 * Get color for todo status
 */
export declare const getTodoColor: (status: Todo["status"]) => string;
/**
 * Get display text for todo (activeForm for in_progress, content otherwise)
 */
export declare const getTodoDisplayText: (todo: Todo) => string;
/**
 * Check if todo text should be dimmed
 */
export declare const isTodoDimmed: (status: Todo["status"]) => boolean;
/**
 * Check if todo text should be bold
 */
export declare const isTodoBold: (status: Todo["status"]) => boolean;
/**
 * Check if todo text should have strikethrough
 */
export declare const isTodoStrikethrough: (status: Todo["status"]) => boolean;
/**
 * Format todo for tool result display
 */
export declare const formatTodoChange: (type: "added" | "updated" | "reordered", todo: Todo, beforeStatus?: Todo["status"], reorderType?: string) => string;
/**
 * Format todo count for summary
 */
export declare const formatTodoCount: (todos: Todo[]) => string;
//# sourceMappingURL=todo-formatters.d.ts.map