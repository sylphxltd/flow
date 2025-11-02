/**
 * TodoList Component
 * Displays LLM task progress above the input area
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '../stores/app-store.js';
import type { Todo } from '../../types/todo.types.js';

const MAX_VISIBLE_LINES = 5;

export default function TodoList() {
  // Subscribe directly to store for real-time updates
  const todos = useAppStore((state) => state.todos);
  // Calculate progress
  const completedCount = todos.filter((t) => t.status === 'completed').length;
  const totalCount = todos.filter((t) => t.status !== 'removed').length;

  // Filter out removed todos (show completed with strikethrough)
  const displayTodos = todos.filter((t) => t.status !== 'removed');

  if (displayTodos.length === 0) {
    return null;
  }

  // Sort by ordering ASC, id ASC (first added = first to do)
  const sortedTodos = [...displayTodos].sort((a, b) => {
    if (a.ordering !== b.ordering) {
      return a.ordering - b.ordering;
    }
    return a.id - b.id;
  });

  // Auto-scroll to in_progress task
  const inProgressIndex = sortedTodos.findIndex((t) => t.status === 'in_progress');
  const scrollOffset = useMemo(() => {
    if (inProgressIndex === -1) return 0;
    // Center the in_progress task in the viewport
    const targetScroll = Math.max(0, inProgressIndex - Math.floor(MAX_VISIBLE_LINES / 2));
    return Math.min(targetScroll, Math.max(0, sortedTodos.length - MAX_VISIBLE_LINES));
  }, [inProgressIndex, sortedTodos.length]);

  // Get visible todos
  const visibleTodos = sortedTodos.slice(scrollOffset, scrollOffset + MAX_VISIBLE_LINES);
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + MAX_VISIBLE_LINES < sortedTodos.length;

  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1} borderStyle="round" borderColor="gray">
      {/* Header with simple progress */}
      <Box marginBottom={0}>
        <Text bold color="#FFD700">
          Tasks {completedCount}/{totalCount}
        </Text>
      </Box>

      {/* Scroll indicator top */}
      {hasMoreAbove && (
        <Box>
          <Text dimColor>↑ {scrollOffset} more above</Text>
        </Box>
      )}

      {/* Todo list */}
      {visibleTodos.map((todo) => {
        const isInProgress = todo.status === 'in_progress';
        const isCompleted = todo.status === 'completed';
        const isPending = todo.status === 'pending';

        // Display text
        const displayText = isInProgress ? todo.activeForm : todo.content;

        return (
          <Box key={`todo-${todo.id}`}>
            {isInProgress && (
              <>
                <Text bold color="#00FF88">▶ </Text>
                <Text bold color="#00FF88">{displayText}</Text>
              </>
            )}
            {isPending && (
              <>
                <Text dimColor>○ </Text>
                <Text dimColor>{displayText}</Text>
              </>
            )}
            {isCompleted && (
              <>
                <Text color="green">✓ </Text>
                <Text dimColor strikethrough>{displayText}</Text>
              </>
            )}
          </Box>
        );
      })}

      {/* Scroll indicator bottom */}
      {hasMoreBelow && (
        <Box>
          <Text dimColor>↓ {sortedTodos.length - scrollOffset - MAX_VISIBLE_LINES} more below</Text>
        </Box>
      )}
    </Box>
  );
}
