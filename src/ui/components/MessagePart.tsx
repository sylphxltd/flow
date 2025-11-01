/**
 * MessagePart Component
 * Unified rendering for both streaming and completed message parts
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

// Extended type for streaming parts
type StreamingPart =
  | { type: 'text'; content: string }
  | { type: 'reasoning'; content: string; completed?: boolean; duration?: number; startTime?: number }
  | { type: 'tool'; toolId: string; name: string; status: 'running' | 'completed' | 'failed'; duration?: number; args?: unknown; result?: unknown; error?: string; startTime?: number }
  | { type: 'error'; error: string };

export function MessagePart({ part, isLastInStream = false }: MessagePartProps) {
  // Live duration tracking for streaming parts
  const [liveDuration, setLiveDuration] = useState<number | undefined>(undefined);

  // Extract stable values for dependencies
  const partType = part.type;
  const isReasoningCompleted = part.type === 'reasoning' && 'completed' in part ? part.completed : true;
  const toolStatus = part.type === 'tool' ? part.status : null;
  const startTime = (part.type === 'reasoning' || part.type === 'tool') && 'startTime' in part ? part.startTime : null;

  useEffect(() => {
    // Check if this is a running reasoning part
    const isRunningReasoning = partType === 'reasoning' && !isReasoningCompleted && startTime;

    // Check if this is a running tool part
    const isRunningTool = partType === 'tool' && toolStatus === 'running' && startTime;

    if ((isRunningReasoning || isRunningTool) && startTime) {
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
  }, [partType, isReasoningCompleted, toolStatus, startTime]);
  if (part.type === 'text') {
    return (
      <Box flexDirection="column">
        <MarkdownText prefix="▏ " prefixColor="#00FF88">
          {part.content}
        </MarkdownText>
        {isLastInStream && (
          <Box>
            <Text color="#00FF88">▏ </Text>
            <Text color="#FFD700">▊</Text>
          </Box>
        )}
      </Box>
    );
  }

  if (part.type === 'reasoning') {
    const isCompleted = 'completed' in part ? part.completed : true; // Completed messages don't have 'completed' field

    if (isCompleted) {
      // Show completed reasoning with duration
      const seconds = part.duration ? Math.round(part.duration / 1000) : 0;
      return (
        <Box flexDirection="column" paddingTop={1}>
          <Box>
            <Text color="#00FF88">▏ </Text>
            <Text dimColor>Thought {seconds}s</Text>
          </Box>
        </Box>
      );
    } else {
      // Still streaming - show spinner with live duration
      const seconds = liveDuration ? Math.round(liveDuration / 1000) : 0;
      return (
        <Box flexDirection="column" paddingTop={1}>
          <Box>
            <Text color="#00FF88">▏ </Text>
            <Spinner color="#FFD700" />
            <Text dimColor> Thinking... {seconds}s</Text>
          </Box>
        </Box>
      );
    }
  }

  if (part.type === 'error') {
    return (
      <Box>
        <Text color="#00FF88">▏ </Text>
        <Text color="red">❌ Error: {part.error}</Text>
      </Box>
    );
  }

  // Tool part
  if (part.type === 'tool') {
    // Use liveDuration for running tools, part.duration for completed/failed
    const displayDuration = part.status === 'running' ? liveDuration : part.duration;

    return (
      <Box>
        <Text color="#00FF88">▏ </Text>
        <ToolDisplay
          name={part.name}
          status={part.status}
          duration={displayDuration}
          args={part.args}
          result={part.result}
          error={part.error}
        />
      </Box>
    );
  }

  return null;
}
