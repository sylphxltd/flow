/**
 * Message Rendering Helpers
 *
 * Flat rendering architecture for chat messages:
 * - Collect all UI elements into flat array of RenderItems
 * - Split by completion status
 * - Render completed in single Static, active in Dynamic
 */

import React from 'react';
import { Box, Text } from 'ink';
import { StreamingPartWrapper } from '../components/StreamingPartWrapper.js';
import { formatTokenCount } from '../../utils/token-counter.js';
import type { MessagePart as StreamPart, SessionMessage } from '../../types/session.types.js';

/**
 * Render item for flat rendering
 */
export type RenderItem = {
  key: string;
  isCompleted: boolean;
  component: React.ReactNode;
};

/**
 * Generate stable key for a streaming part
 */
export function getStreamingPartKey(part: StreamPart, idx: number): string {
  return part.type === 'tool'
    ? `part-tool-${part.toolId}`
    : part.type === 'reasoning'
    ? `part-reasoning-${part.startTime}`
    : part.type === 'error'
    ? `part-error-${idx}`
    : `part-text-${idx}`;
}

/**
 * Collect user message items (header, parts, attachments)
 */
export function collectUserMessageItems(
  msg: SessionMessage,
  attachmentTokens: Map<string, number>
): RenderItem[] {
  const items: RenderItem[] = [];

  // Header
  items.push({
    key: `user-header-${msg.timestamp}`,
    isCompleted: true,
    component: (
      <Box paddingTop={1} paddingX={1}>
        <Text color="#00D9FF">▌ YOU</Text>
      </Box>
    ),
  });

  // Content parts
  if (msg.content && Array.isArray(msg.content)) {
    msg.content.forEach((part, idx) => {
      items.push({
        key: `user-${msg.timestamp}-part-${idx}`,
        isCompleted: true,
        component: <StreamingPartWrapper part={part} />,
      });
    });
  } else if (msg.content) {
    items.push({
      key: `user-${msg.timestamp}-content`,
      isCompleted: true,
      component: (
        <Box marginLeft={2}>
          <Text>{String(msg.content)}</Text>
        </Box>
      ),
    });
  }

  // Attachments
  if (msg.attachments && msg.attachments.length > 0) {
    msg.attachments.forEach((att) => {
      items.push({
        key: `user-${msg.timestamp}-att-${att.path}`,
        isCompleted: true,
        component: (
          <Box marginLeft={2}>
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
        ),
      });
    });
  }

  return items;
}

/**
 * Collect assistant message items (header, parts, footer)
 */
export function collectAssistantMessageItems(msg: SessionMessage): RenderItem[] {
  const items: RenderItem[] = [];

  // Header
  items.push({
    key: `assistant-header-${msg.timestamp}`,
    isCompleted: true,
    component: (
      <Box paddingX={1} paddingTop={1}>
        <Text color="#00FF88">▌ SYLPHX</Text>
      </Box>
    ),
  });

  // Content parts
  const streamParts = msg.content;
  if (streamParts.length > 0) {
    streamParts.forEach((part, idx) => {
      items.push({
        key: getStreamingPartKey(part, idx),
        isCompleted: part.status !== 'active',
        component: (
          <StreamingPartWrapper
            part={part}
            debugRegion={part.status !== 'active' ? 'static' : 'dynamic'}
          />
        ),
      });
    });
  } else if (msg.status === 'active') {
    // No parts yet - waiting indicator
    items.push({
      key: `assistant-${msg.timestamp}-waiting`,
      isCompleted: false,
      component: (
        <Box paddingX={1} marginLeft={2}>
          <Text dimColor>...</Text>
        </Box>
      ),
    });
  }

  // Footer (status badges + usage)
  if (msg.status !== 'active' && (msg.status === 'abort' || msg.status === 'error' || msg.usage)) {
    items.push({
      key: `assistant-footer-${msg.timestamp}`,
      isCompleted: true,
      component: (
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
      ),
    });
  }

  return items;
}

/**
 * Split items into continuous completed and remaining active
 */
export function splitItemsByCompletion(items: RenderItem[]): {
  completedItems: RenderItem[];
  activeItems: RenderItem[];
} {
  const firstActiveIndex = items.findIndex((item) => !item.isCompleted);

  if (firstActiveIndex === -1) {
    // All completed
    return { completedItems: items, activeItems: [] };
  }

  return {
    completedItems: items.slice(0, firstActiveIndex),
    activeItems: items.slice(firstActiveIndex),
  };
}
