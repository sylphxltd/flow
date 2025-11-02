/**
 * Todo Types
 * Task tracking for LLM work progress
 */

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'removed';

export interface Todo {
  id: number;
  content: string;
  status: TodoStatus;
  activeForm: string; // Present continuous form (e.g., "Building feature X")
  ordering: number;   // For custom ordering (higher = earlier in list)
}

export interface TodoUpdate {
  id?: number;
  content?: string;
  activeForm?: string;
  status?: TodoStatus;
  reorder?: {
    type: 'before' | 'after' | 'top' | 'last';
    id?: number; // Required when type is 'before' or 'after'
  };
}
