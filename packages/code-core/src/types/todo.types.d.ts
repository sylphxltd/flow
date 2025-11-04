/**
 * Todo Types
 * Task tracking for LLM work progress
 */
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'removed';
export interface Todo {
    id: number;
    content: string;
    status: TodoStatus;
    activeForm: string;
    ordering: number;
}
export interface TodoUpdate {
    id?: number;
    content?: string;
    activeForm?: string;
    status?: TodoStatus;
    reorder?: {
        type: 'before' | 'after' | 'top' | 'last';
        id?: number;
    };
}
//# sourceMappingURL=todo.types.d.ts.map