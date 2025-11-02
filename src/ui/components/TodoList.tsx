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
  // Only show pending and in_progress todos
  const activeTodos = todos.filter((t) => t.status !== 'completed');

  if (activeTodos.length === 0) {
    return null;
  }

  const pendingTodos = activeTodos.filter((t) => t.status === 'pending');
  const inProgressTodos = activeTodos.filter((t) => t.status === 'in_progress');

  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1} borderStyle="round" borderColor="gray">
      {/* Header */}
      <Box marginBottom={0}>
        <Text bold color="#FFD700">
          Tasks ({activeTodos.length})
        </Text>
      </Box>

      {/* In Progress - Show activeForm (present continuous) */}
      {inProgressTodos.map((todo, idx) => (
        <Box key={`in-progress-${idx}`}>
          <Text color="#00FF88">▶ </Text>
          <Text color="#00FF88">{todo.activeForm}</Text>
        </Box>
      ))}

      {/* Pending - Show content (imperative) */}
      {pendingTodos.map((todo, idx) => (
        <Box key={`pending-${idx}`}>
          <Text dimColor>○ </Text>
          <Text dimColor>{todo.content}</Text>
        </Box>
      ))}
    </Box>
  );
}
