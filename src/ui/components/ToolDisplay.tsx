/**
 * Tool Display Component
 * Simply renders the registered component for a tool
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from './Spinner.js';
import { useElapsedTime } from '../hooks/useElapsedTime.js';
import {
  getToolComponent,
  type ToolDisplayProps,
} from '../utils/tool-configs.js';

/**
 * Fallback display for unregistered tools
 */
function FallbackToolDisplay(props: ToolDisplayProps) {
  const { name, status, duration, startTime, args, error } = props;

  // Calculate real-time elapsed time for running tools
  const { display: durationDisplay } = useElapsedTime({
    startTime,
    duration,
    isRunning: status === 'running',
  });

  return (
    <Box flexDirection="column">
      <Box>
        {status === 'running' && (
          <>
            <Spinner color="#FFD700" />
            <Text> </Text>
          </>
        )}
        {status === 'completed' && <Text color="#00FF88">✓ </Text>}
        {status === 'failed' && <Text color="#FF3366">✗ </Text>}
        <Text bold>{name}</Text>
        {durationDisplay && (status === 'completed' || status === 'running') && (
          <Text dimColor> {durationDisplay}</Text>
        )}
      </Box>
      {status === 'failed' && error && (
        <Box marginLeft={2}>
          <Text color="#FF3366">{error}</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Main ToolDisplay component
 * Uses registered component or falls back to basic display
 */
export function ToolDisplay(props: ToolDisplayProps) {
  const Component = getToolComponent(props.name);

  if (!Component) {
    return <FallbackToolDisplay {...props} />;
  }

  return <Component {...props} />;
}
