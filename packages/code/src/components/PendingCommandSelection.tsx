/**
 * Pending Command Selection Component
 * Shows option selection UI when a command requires arguments
 */

import { calculateScrollViewport } from '@sylphx/code-core';
import { Box, Text } from 'ink';
import React from 'react';
import type { Command } from '../commands/types.js';
import Spinner from './Spinner.js';

interface PendingCommandSelectionProps {
  pendingCommand: { command: Command; currentInput: string };
  currentlyLoading: string | null;
  loadError: string | null;
  cachedOptions: Map<string, Array<{ id: string; name: string; label: string; value?: string }>>;
  selectedCommandIndex: number;
  onSelect: (option: { id: string; name: string; label: string; value?: string }) => void;
}

export function PendingCommandSelection({
  pendingCommand,
  currentlyLoading,
  loadError,
  cachedOptions,
  selectedCommandIndex,
  onSelect,
}: PendingCommandSelectionProps) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text dimColor>Select {pendingCommand.command.args?.[0]?.name || 'option'}:</Text>
      </Box>

      {/* Loading state */}
      {currentlyLoading ? (
        <Box>
          <Spinner color="#FFD700" />
          <Text color="gray"> Loading options...</Text>
        </Box>
      ) : loadError ? (
        /* Error state */
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="red">Failed to load options</Text>
          </Box>
          <Box marginBottom={1}>
            <Text dimColor>{loadError}</Text>
          </Box>
          <Box>
            <Text dimColor>Press Esc to cancel</Text>
          </Box>
        </Box>
      ) : (
        (() => {
          /* Options list */
          const firstArg = pendingCommand.command.args?.[0];
          const cacheKey = firstArg ? `${pendingCommand.command.id}:${firstArg.name}` : '';
          const options = cacheKey ? cachedOptions.get(cacheKey) || [] : [];

          if (options.length === 0) {
            return (
              <Box flexDirection="column">
                <Box marginBottom={1}>
                  <Text color="yellow">No options available</Text>
                </Box>
                <Box>
                  <Text dimColor>Press Esc to cancel</Text>
                </Box>
              </Box>
            );
          }

          // Calculate scroll window to keep selected item visible
          const viewport = calculateScrollViewport(options, selectedCommandIndex);

          return (
            <>
              {viewport.hasItemsAbove && (
                <Box marginBottom={1}>
                  <Text dimColor>... {viewport.itemsAboveCount} more above</Text>
                </Box>
              )}
              {viewport.visibleItems.map((option, idx) => {
                const absoluteIdx = viewport.scrollOffset + idx;
                return (
                  <Box
                    key={option.value || option.label}
                    paddingY={0}
                    onClick={() => onSelect(option)}
                  >
                    <Text
                      color={absoluteIdx === selectedCommandIndex ? '#00FF88' : 'gray'}
                      bold={absoluteIdx === selectedCommandIndex}
                    >
                      {absoluteIdx === selectedCommandIndex ? '> ' : '  '}
                      {option.label}
                    </Text>
                  </Box>
                );
              })}
              {viewport.hasItemsBelow && (
                <Box marginTop={1}>
                  <Text dimColor>... {viewport.itemsBelowCount} more below</Text>
                </Box>
              )}
              <Box marginTop={1}>
                <Text dimColor>↑↓ Navigate · Enter Select · Esc Cancel</Text>
              </Box>
            </>
          );
        })()
      )}
    </Box>
  );
}
