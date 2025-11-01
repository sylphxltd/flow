/**
 * Log Panel Component
 * Display real-time logs for debugging
 */

import React from 'react';
import { Box, Text } from 'ink';

interface LogPanelProps {
  logs: string[];
  maxLines?: number;
}

export default function LogPanel({ logs, maxLines = 10 }: LogPanelProps) {
  const displayLogs = logs.slice(-maxLines);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Box marginBottom={1}>
        <Text color="yellow" bold>DEBUG LOGS</Text>
      </Box>
      {displayLogs.length === 0 ? (
        <Text dimColor>No logs yet...</Text>
      ) : (
        displayLogs.map((log, idx) => (
          <Text key={idx} dimColor>{log}</Text>
        ))
      )}
    </Box>
  );
}
