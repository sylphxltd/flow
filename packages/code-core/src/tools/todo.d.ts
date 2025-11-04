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
import type { Todo } from '../types/todo.types.js';
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
export declare function createTodoTool(context: TodoToolContext): import("ai").Tool<{
    todos: {
        id?: number | undefined;
        content?: string | undefined;
        activeForm?: string | undefined;
        status?: "pending" | "in_progress" | "completed" | "removed" | undefined;
        reorder?: {
            type: "before" | "after" | "top" | "last";
            id?: number | undefined;
        } | undefined;
    }[];
}, {
    error: string;
    summary: string;
    changes: never[];
    total: number;
} | {
    summary: string;
    changes: string[];
    total: number;
    error?: undefined;
}>;
/**
 * Export types for consumers
 */
export type { TodoToolContext };
//# sourceMappingURL=todo.d.ts.map