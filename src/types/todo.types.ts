/**
 * Todo Types
 * Task tracking for LLM work progress
 */

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface Todo {
  id: string;
  content: string;
  status: TodoStatus;
  createdAt: number;
  updatedAt: number;
}
