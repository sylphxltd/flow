/**
 * MessagePart Component
 * Unified rendering for both streaming and completed message parts
 *
 * PERFORMANCE: Memoized to prevent re-rendering unchanged message parts
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from './Spinner.js';
import MarkdownText from './MarkdownText.js';
import { ToolDisplay } from './ToolDisplay.js';
import type { MessagePart as MessagePartType } from '../../types/session.types.js';

interface MessagePartProps {
  part: MessagePartType | StreamingPart;
  isLastInStream?: boolean;
}

// Extended type for streaming parts - UNIFIED with status field
type StreamingPart =
  | { type: 'text'; content: string; status: 'active' | 'completed' | 'error' | 'abort' }
  | { type: 'reasoning'; content: string; status: 'active' | 'completed' | 'error' | 'abort'; duration?: number; startTime?: number }
  | { type: 'tool'; toolId: string; name: string; status: 'active' | 'completed' | 'error' | 'abort'; duration?: number; args?: unknown; result?: unknown; error?: string; startTime?: number }
  | { type: 'error'; error: string; status: 'completed' };

export const MessagePart = React.memo(function MessagePart({ part, isLastInStream = false }: MessagePartProps) {
  // Live duration tracking for streaming parts
  const [liveDuration, setLiveDuration] = useState<number | undefined>(undefined);

  // Extract stable values for dependencies (using unified status field)
  const partType = part.type;
  const partStatus = 'status' in part ? part.status : 'completed'; // Default to completed for old format
  const startTime = (part.type === 'reasoning' || part.type === 'tool') && 'startTime' in part ? part.startTime : null;

  useEffect(() => {
    // Check if this is an active (streaming) part with startTime
    const isActivePart = partStatus === 'active' && startTime;

    if (isActivePart && startTime) {
      // Set initial duration
      setLiveDuration(Date.now() - startTime);

      // Update every second
      const interval = setInterval(() => {
        setLiveDuration(Date.now() - startTime);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Clear live duration when part completes
      setLiveDuration(undefined);
      return undefined;
    }
  }, [partType, partStatus, startTime]);
  if (part.type === 'text') {
    return (
      <Box flexDirection="column" marginLeft={2} marginBottom={1}>
        <MarkdownText>
          {part.content}
        </MarkdownText>
        {isLastInStream && (
          <Box>
            <Text color="#FFD700">▊</Text>
          </Box>
        )}
      </Box>
    );
  }

  if (part.type === 'reasoning') {
    // Use unified status field
    const status = 'status' in part ? part.status : 'completed';
    const isActive = status === 'active';

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
      // Still streaming - show spinner with live duration
      const seconds = liveDuration ? Math.round(liveDuration / 1000) : 0;
      return (
        <Box flexDirection="column" marginLeft={2} marginBottom={1}>
          <Box>
            <Spinner color="#FFD700" />
            <Text dimColor> Thinking... {seconds}s</Text>
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
    // Use liveDuration for running tools, part.duration for completed/failed
    const displayDuration = part.status === 'active' ? liveDuration : part.duration;

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
      args?: unknown;
      result?: unknown;
      error?: string;
    } = { name: part.name, status: toolStatus };

    if (displayDuration !== undefined) toolProps.duration = displayDuration;
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
