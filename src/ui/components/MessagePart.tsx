/**
 * MessagePart Component
 * Unified rendering for both streaming and completed message parts
 */

import React from 'react';
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
  | { type: 'reasoning'; content: string; completed?: boolean; duration?: number }
  | { type: 'tool'; toolId: string; name: string; status: 'running' | 'completed' | 'failed'; duration?: number; args?: unknown; result?: unknown; error?: string }
  | { type: 'error'; error: string };

export function MessagePart({ part, isLastInStream = false }: MessagePartProps) {
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
      return (
        <Box flexDirection="column">
          <Box />
          <Box>
            <Text color="#00FF88">▏ </Text>
            <Text dimColor>Thought{part.duration ? ` ${Math.round(part.duration / 1000)}s` : ''}</Text>
          </Box>
        </Box>
      );
    } else {
      // Still streaming - show spinner
      return (
        <Box flexDirection="column">
          <Box />
          <Box>
            <Text color="#00FF88">▏ </Text>
            <Spinner color="#FFD700" />
            <Text dimColor> Thinking...</Text>
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
    return (
      <Box>
        <Text color="#00FF88">▏ </Text>
        <ToolDisplay
          name={part.name}
          status={part.status}
          duration={part.duration}
          args={part.args}
          result={part.result}
          error={part.error}
        />
      </Box>
    );
  }

  return null;
}
