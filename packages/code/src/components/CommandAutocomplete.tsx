/**
 * Command Autocomplete Component
 * Shows command suggestions when user types /command with arguments
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from './Spinner.js';
import type { Command } from '../commands/types.js';

interface CommandAutocompleteProps {
  commands: Command[];
  selectedCommandIndex: number;
  currentlyLoading: string | null;
  loadError: string | null;
}

export function CommandAutocomplete({
  commands,
  selectedCommandIndex,
  currentlyLoading,
  loadError,
}: CommandAutocompleteProps) {
  if (currentlyLoading) {
    return (
      <Box marginTop={1}>
        <Spinner color="#FFD700" />
        <Text color="gray"> Loading options...</Text>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text color="red">Failed to load options</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{loadError}</Text>
        </Box>
      </Box>
    );
  }

  if (commands.length === 0) {
    return null;
  }

  // Calculate visible window based on selection
  const maxVisible = 5;
  const totalCommands = commands.length;

  // Center the selection in the visible window
  let startIdx = Math.max(0, selectedCommandIndex - Math.floor(maxVisible / 2));
  let endIdx = Math.min(totalCommands, startIdx + maxVisible);

  // Adjust if we're at the end
  if (endIdx === totalCommands) {
    startIdx = Math.max(0, endIdx - maxVisible);
  }

  const visibleCommands = commands.slice(startIdx, endIdx);

  return (
    <Box flexDirection="column" marginTop={1}>
      {startIdx > 0 && (
        <Box>
          <Text dimColor>  ↑ {startIdx} more above</Text>
        </Box>
      )}
      {visibleCommands.map((cmd, idx) => {
        const actualIdx = startIdx + idx;
        return (
          <Box key={cmd.id}>
            <Text
              color={actualIdx === selectedCommandIndex ? '#00FF88' : 'gray'}
              bold={actualIdx === selectedCommandIndex}
            >
              {actualIdx === selectedCommandIndex ? '> ' : '  '}
              {cmd.label}
            </Text>
            {cmd.description && <Text dimColor> {cmd.description}</Text>}
          </Box>
        );
      })}
      {endIdx < totalCommands && (
        <Box>
          <Text dimColor>  ↓ {totalCommands - endIdx} more below</Text>
        </Box>
      )}
    </Box>
  );
}
