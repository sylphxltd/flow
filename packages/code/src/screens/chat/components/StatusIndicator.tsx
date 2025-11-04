/**
 * StatusIndicator Component
 * Displays streaming status with spinner and contextual text
 */

import { Box, Text } from 'ink';
import type { MessagePart } from '../../../../types/session.types.js';
import Spinner from '../../../components/Spinner.js';

interface StatusIndicatorProps {
  isStreaming: boolean;
  streamParts: MessagePart[];
}

export function StatusIndicator({ isStreaming, streamParts }: StatusIndicatorProps) {
  if (!isStreaming) {
    return (
      <Box paddingY={1}>
        <Text> </Text>
      </Box>
    );
  }

  // Determine status text based on streaming state
  const getStatusText = () => {
    if (streamParts.length === 0) {
      return 'Thinking...';
    } else if (streamParts.some((p) => p.type === 'tool' && p.status === 'active')) {
      return 'Working...';
    } else if (streamParts.some((p) => p.type === 'reasoning')) {
      return 'Thinking...';
    } else {
      return 'Typing...';
    }
  };

  return (
    <Box paddingY={1}>
      <Spinner color="#FFD700" />
      <Text color="#FFD700"> {getStatusText()}</Text>
      <Text dimColor> (ESC to cancel)</Text>
    </Box>
  );
}
