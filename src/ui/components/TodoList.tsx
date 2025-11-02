/**
 * TodoList Component
 * Displays LLM task progress above the input area
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Todo } from '../../types/todo.types.js';

interface TodoListProps {
  todos: Todo[];
}

const MAX_VISIBLE_LINES = 5;

export default function TodoList({ todos }: TodoListProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  // Calculate progress
  const completedCount = todos.filter((t) => t.status === 'completed').length;
  const totalCount = todos.filter((t) => t.status !== 'removed').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter out completed and removed todos
  const activeTodos = todos.filter((t) => t.status !== 'completed' && t.status !== 'removed');

  if (activeTodos.length === 0 && totalCount === 0) {
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

  // Combine todos for display (in-progress first, then pending)
  const allDisplayTodos = [...inProgressTodos, ...pendingTodos];
  const totalLines = allDisplayTodos.length;
  const maxScroll = Math.max(0, totalLines - MAX_VISIBLE_LINES);

  // Handle scroll input
  useInput((input, key) => {
    if (key.upArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setScrollOffset((prev) => Math.min(maxScroll, prev + 1));
    }
  });

  // Clamp scroll offset
  const clampedScroll = Math.min(scrollOffset, maxScroll);

  // Get visible todos
  const visibleTodos = allDisplayTodos.slice(clampedScroll, clampedScroll + MAX_VISIBLE_LINES);

  // Progress bar
  const barWidth = 20;
  const filledWidth = Math.round((progressPercent / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;
  const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);

  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1} borderStyle="round" borderColor="gray">
      {/* Header with progress */}
      <Box marginBottom={0}>
        <Text bold color="#FFD700">
          Tasks {completedCount}/{totalCount}
        </Text>
        <Text dimColor> </Text>
        <Text color="#FFD700">{progressBar}</Text>
        <Text dimColor> {progressPercent}%</Text>
      </Box>

      {/* Scrollable todo list */}
      {visibleTodos.map((todo) => {
        const isInProgress = todo.status === 'in_progress';
        return (
          <Box key={`todo-${todo.id}`}>
            {isInProgress ? (
              <>
                <Text color="#00FF88">▶ </Text>
                <Text color="#00FF88" dimColor>[{todo.id}] </Text>
                <Text color="#00FF88">{todo.activeForm}</Text>
              </>
            ) : (
              <Text dimColor>○ [{todo.id}] {todo.content}</Text>
            )}
          </Box>
        );
      })}

      {/* Scroll indicator */}
      {totalLines > MAX_VISIBLE_LINES && (
        <Box marginTop={0}>
          <Text dimColor>
            {clampedScroll > 0 && '↑ '}
            Showing {clampedScroll + 1}-{Math.min(clampedScroll + MAX_VISIBLE_LINES, totalLines)} of {totalLines}
            {clampedScroll < maxScroll && ' ↓'}
          </Text>
        </Box>
      )}
    </Box>
  );
}
