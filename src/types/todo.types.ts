/**
 * Todo Types
 * Task tracking for LLM work progress
 */

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface Todo {
  content: string;
  status: TodoStatus;
  activeForm: string; // Present continuous form (e.g., "Building feature X")
}
