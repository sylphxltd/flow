/**
 * MessagePart Component
 * Unified rendering for both streaming and completed message parts
 *
 * PERFORMANCE: Memoized to prevent re-rendering unchanged message parts
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from './Spinner.js';
import MarkdownText from './MarkdownText.js';
import { ToolDisplay } from './ToolDisplay.js';
import { useElapsedTime } from '../hooks/useElapsedTime.js';
import type { MessagePart as MessagePartType } from '../../types/session.types.js';

interface MessagePartProps {
  part: MessagePartType | StreamingPart;
}

// Extended type for streaming parts - UNIFIED with status field
type StreamingPart =
  | { type: 'text'; content: string; status: 'active' | 'completed' | 'error' | 'abort' }
  | { type: 'reasoning'; content: string; status: 'active' | 'completed' | 'error' | 'abort'; duration?: number; startTime?: number }
  | { type: 'tool'; toolId: string; name: string; status: 'active' | 'completed' | 'error' | 'abort'; duration?: number; args?: unknown; result?: unknown; error?: string; startTime?: number }
  | { type: 'error'; error: string; status: 'completed' };

export const MessagePart = React.memo(function MessagePart({ part }: MessagePartProps) {
  if (part.type === 'text') {
    return (
      <Box flexDirection="column" marginLeft={2} marginBottom={1}>
        <MarkdownText>
          {part.content}
        </MarkdownText>
      </Box>
    );
  }

  if (part.type === 'reasoning') {
    // Use unified status field
    const status = 'status' in part ? part.status : 'completed';
    const isActive = status === 'active';

    // Calculate real-time elapsed time for active reasoning
    const { display: durationDisplay } = useElapsedTime({
      startTime: part.startTime,
      duration: part.duration,
      isRunning: isActive,
    });

    if (!isActive) {
      // Show completed reasoning with duration
      const seconds = part.duration ? Math.round(part.duration / 1000) : 0;
      return (
        <Box flexDirection="column" marginLeft={2} marginBottom={1}>
          <Box>
            <Text dimColor>Thought {seconds}s</Text>
          </Box>
        </Box>
      );
    } else {
      // Still streaming - show spinner with real-time duration
      return (
        <Box flexDirection="column" marginLeft={2} marginBottom={1}>
          <Box>
            <Spinner color="#FFD700" />
            <Text dimColor> Thinking... {durationDisplay}</Text>
          </Box>
        </Box>
      );
    }
  }

  if (part.type === 'error') {
    return (
      <Box marginLeft={2} marginBottom={1}>
        <Text color="red">{part.error}</Text>
      </Box>
    );
  }

  // Tool part
  if (part.type === 'tool') {
    // Map MessagePart status to ToolDisplay status
    const toolStatus: 'running' | 'completed' | 'failed' =
      part.status === 'active' ? 'running' :
      part.status === 'error' || part.status === 'abort' ? 'failed' :
      'completed';

    // Build props conditionally to satisfy exactOptionalPropertyTypes
    const toolProps: {
      name: string;
      status: 'running' | 'completed' | 'failed';
      duration?: number;
      startTime?: number;
      args?: unknown;
      result?: unknown;
      error?: string;
    } = { name: part.name, status: toolStatus };

    // Pass duration for completed/failed tools
    if (part.duration !== undefined) toolProps.duration = part.duration;
    // Pass startTime for running tools (ToolDisplay will calculate elapsed time)
    if (part.startTime !== undefined) toolProps.startTime = part.startTime;
    if (part.args !== undefined) toolProps.args = part.args;
    if (part.result !== undefined) toolProps.result = part.result;
    if (part.error !== undefined) toolProps.error = part.error;

    return (
      <Box marginLeft={2} marginBottom={1}>
        <ToolDisplay {...toolProps} />
      </Box>
    );
  }

  return null;
});
