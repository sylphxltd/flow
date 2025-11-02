/**
 * File Autocomplete Component
 * Shows file suggestions when user types @filename
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from './Spinner.js';

interface FileAutocompleteProps {
  files: Array<{ path: string; relativePath: string; size: number }>;
  selectedFileIndex: number;
  filesLoading: boolean;
}

export function FileAutocomplete({
  files,
  selectedFileIndex,
  filesLoading,
}: FileAutocompleteProps) {
  if (filesLoading) {
    return (
      <Box marginTop={1}>
        <Spinner color="#FFD700" />
        <Text color="gray"> Loading files...</Text>
      </Box>
    );
  }

  if (files.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box marginBottom={1}>
        <Text dimColor>Files (↑↓ to select, Tab/Enter to attach):</Text>
      </Box>
      {files.map((file, idx) => (
        <Box key={file.path} marginLeft={2}>
          <Text
            color={idx === selectedFileIndex ? '#00FF88' : 'gray'}
            bold={idx === selectedFileIndex}
          >
            {idx === selectedFileIndex ? '> ' : '  '}
            {file.relativePath}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
