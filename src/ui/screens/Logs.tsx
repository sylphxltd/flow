/**
 * Logs Screen
 * View debug logs for troubleshooting
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../stores/app-store.js';

export default function Logs() {
  const debugLogs = useAppStore((state) => state.debugLogs);
  const clearDebugLogs = useAppStore((state) => state.clearDebugLogs);
  const navigateTo = useAppStore((state) => state.navigateTo);

  // Keyboard shortcuts
  useInput((input, key) => {
    if (key.escape) {
      navigateTo('chat');
      return;
    }
    if (input === 'c' || input === 'C') {
      clearDebugLogs();
      return;
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <Box flexShrink={0} paddingBottom={1}>
        <Text color="#00D9FF">▌ DEBUG LOGS</Text>
        <Text dimColor> · {debugLogs.length} entries</Text>
      </Box>

      {/* Log list */}
      <Box flexGrow={1} flexDirection="column" paddingY={1}>
        {debugLogs.length === 0 ? (
          <Box>
            <Text dimColor>No logs yet...</Text>
          </Box>
        ) : (
          debugLogs.slice(-100).map((log, idx) => (
            <Text key={idx} dimColor>
              {log}
            </Text>
          ))
        )}
      </Box>

      {/* Footer */}
      <Box flexShrink={0} paddingTop={1}>
        <Text dimColor>Esc Back · C Clear logs</Text>
      </Box>
    </Box>
  );
}
