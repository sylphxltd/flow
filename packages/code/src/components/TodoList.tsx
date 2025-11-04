/**
 * TodoList Component
 * Displays LLM task progress above the input area
 */

import {
  getTodoColor,
  getTodoDisplayText,
  getTodoIcon,
  isTodoBold,
  isTodoDimmed,
  isTodoStrikethrough,
  useAppStore,
} from '@sylphx/code-client';
import type { Todo } from '@sylphx/code-core';
import { Box, Text } from 'ink';
import React, { useMemo } from 'react';

const MAX_VISIBLE_LINES = 5;

export default function TodoList() {
  // Get current session's todos (tRPC: cached in store)
  const currentSession = useAppStore((state) => state.currentSession);
  const todos = currentSession?.todos || [];

  // Calculate progress
  const completedCount = todos.filter((t) => t.status === 'completed').length;
  const totalCount = todos.filter((t) => t.status !== 'removed').length;

  // Filter out removed todos (show completed with strikethrough)
  const displayTodos = todos.filter((t) => t.status !== 'removed');

  // Sort by ordering ASC, id ASC (first added = first to do)
  const sortedTodos = useMemo(() => {
    return [...displayTodos].sort((a, b) => {
      if (a.ordering !== b.ordering) {
        return a.ordering - b.ordering;
      }
      return a.id - b.id;
    });
  }, [displayTodos]);

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

  // Early return AFTER all hooks have been called
  if (displayTodos.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" paddingTop={1}>
      {/* Header with simple progress */}
      <Box>
        <Text color="#FFD700">▌ TASKS</Text>
        <Text color="#FFD700"> · </Text>
        <Text dimColor>
          {completedCount}/{totalCount}
        </Text>
      </Box>

      {/* Scroll indicator top */}
      {hasMoreAbove && (
        <Box marginLeft={2}>
          <Text dimColor>↑ {scrollOffset} more above</Text>
        </Box>
      )}

      {/* Todo list */}
      {visibleTodos.map((todo) => {
        const icon = getTodoIcon(todo.status);
        const color = getTodoColor(todo.status);
        const displayText = getTodoDisplayText(todo);
        const dimmed = isTodoDimmed(todo.status);
        const bold = isTodoBold(todo.status);
        const strikethrough = isTodoStrikethrough(todo.status);

        return (
          <Box key={`todo-${todo.id}`} marginLeft={2}>
            <Text color={color} bold={bold} dimColor={dimmed}>
              {icon}{' '}
            </Text>
            <Text color={color} bold={bold} dimColor={dimmed} strikethrough={strikethrough}>
              {displayText}
            </Text>
          </Box>
        );
      })}

      {/* Scroll indicator bottom */}
      {hasMoreBelow && (
        <Box marginLeft={2}>
          <Text dimColor>↓ {sortedTodos.length - scrollOffset - MAX_VISIBLE_LINES} more below</Text>
        </Box>
      )}
    </Box>
  );
}
