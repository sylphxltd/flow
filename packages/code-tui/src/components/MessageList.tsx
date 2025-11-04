/**
 * MessageList Component
 *
 * Simple nested rendering - each message renders its own header + parts
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { SessionMessage } from '@sylphx/code-core';
import { MessagePart } from './MessagePart.js';
import { formatTokenCount } from '@sylphx/code-core';

interface MessageListProps {
  messages: SessionMessage[];
  attachmentTokens: Map<string, number>;
}

export function MessageList({ messages, attachmentTokens }: MessageListProps) {
  return (
    <>
      {messages.map((msg) => (
        <Box key={`${msg.role}-${msg.timestamp}`} flexDirection="column">
          {/* Message Header */}
          <Box paddingTop={1} paddingX={1}>
            {msg.role === 'user' ? (
              <Text color="#00D9FF">▌ YOU</Text>
            ) : (
              <Text color="#00FF88">▌ SYLPHX</Text>
            )}
          </Box>

          {/* Message Content */}
          {msg.content && Array.isArray(msg.content) ? (
            msg.content.map((part, idx) => (
              <MessagePart key={`part-${idx}`} part={part} />
            ))
          ) : msg.content ? (
            <Box marginLeft={2}>
              <Text>{String(msg.content)}</Text>
            </Box>
          ) : msg.status === 'active' ? (
            <Box paddingX={1} marginLeft={2}>
              <Text dimColor>...</Text>
            </Box>
          ) : null}

          {/* Attachments (for user messages) */}
          {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
            msg.attachments.map((att) => (
              <Box key={`att-${att.path}`} marginLeft={2}>
                <Text dimColor>Attached(</Text>
                <Text color="#00D9FF">{att.relativePath}</Text>
                <Text dimColor>)</Text>
                {attachmentTokens.has(att.path) && (
                  <>
                    <Text dimColor> </Text>
                    <Text dimColor>{formatTokenCount(attachmentTokens.get(att.path)!)} Tokens</Text>
                  </>
                )}
              </Box>
            ))
          )}

          {/* Footer (for assistant messages) */}
          {msg.role === 'assistant' && msg.status !== 'active' && (msg.status === 'abort' || msg.status === 'error' || msg.usage) && (
            <Box flexDirection="column">
              {msg.status === 'abort' && (
                <Box marginLeft={2} marginBottom={1}>
                  <Text color="#FFD700">[Aborted]</Text>
                </Box>
              )}
              {msg.status === 'error' && (
                <Box marginLeft={2} marginBottom={1}>
                  <Text color="#FF3366">[Error]</Text>
                </Box>
              )}
              {msg.usage && (
                <Box marginLeft={2}>
                  <Text dimColor>
                    {msg.usage.promptTokens.toLocaleString()} → {msg.usage.completionTokens.toLocaleString()}
                  </Text>
                </Box>
              )}
            </Box>
          )}
        </Box>
      ))}
    </>
  );
}
