/**
 * TodoList Component
 * Displays LLM task progress above the input area
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Todo } from '../../types/todo.types.js';

interface TodoListProps {
  todos: Todo[];
}

export default function TodoList({ todos }: TodoListProps) {
  // Filter out completed and removed todos
  const activeTodos = todos.filter((t) => t.status !== 'completed' && t.status !== 'removed');

  if (activeTodos.length === 0) {
    return null;
  }

  // Sort by ordering ASC, id ASC (first added = first to do)
  const sortedTodos = [...activeTodos].sort((a, b) => {
    if (a.ordering !== b.ordering) {
      return a.ordering - b.ordering; // Lower ordering first
    }
    return a.id - b.id; // Lower id first if same ordering
  });

  const pendingTodos = sortedTodos.filter((t) => t.status === 'pending');
  const inProgressTodos = sortedTodos.filter((t) => t.status === 'in_progress');

  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1} borderStyle="round" borderColor="gray">
      {/* Header */}
      <Box marginBottom={0}>
        <Text bold color="#FFD700">
          Tasks ({activeTodos.length})
        </Text>
      </Box>

      {/* In Progress - Show [id] activeForm (present continuous) */}
      {inProgressTodos.map((todo) => (
        <Box key={`in-progress-${todo.id}`}>
          <Text color="#00FF88">▶ </Text>
          <Text color="#00FF88" dimColor>[{todo.id}] </Text>
          <Text color="#00FF88">{todo.activeForm}</Text>
        </Box>
      ))}

      {/* Pending - Show [id] content (imperative) */}
      {pendingTodos.map((todo) => (
        <Box key={`pending-${todo.id}`}>
          <Text dimColor>○ [{todo.id}] {todo.content}</Text>
        </Box>
      ))}
    </Box>
  );
}
