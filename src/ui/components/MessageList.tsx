/**
 * MessageList Component
 *
 * Renders all chat messages using flat rendering architecture
 */

import React from 'react';
import { Box, Static } from 'ink';
import type { SessionMessage } from '../../types/session.types.js';
import {
  collectUserMessageItems,
  collectAssistantMessageItems,
  splitItemsByCompletion,
  type RenderItem,
} from '../screens/messageRendering.js';

interface MessageListProps {
  messages: SessionMessage[];
  attachmentTokens: Map<string, number>;
  sessionId: string; // Used as React key to force re-mount on session switch
}

export function MessageList({ messages, attachmentTokens, sessionId }: MessageListProps) {
  // Collect all render items from messages
  const items: RenderItem[] = messages.flatMap((msg) =>
    msg.role === 'user'
      ? collectUserMessageItems(msg, attachmentTokens)
      : collectAssistantMessageItems(msg)
  );

  // Split into continuous completed and remaining active
  const { completedItems, activeItems } = splitItemsByCompletion(items);

  return (
    <>
      {/* Completed items frozen in single Static */}
      {completedItems.length > 0 && (
        <Static items={completedItems}>
          {(item) => <Box key={item.key}>{item.component}</Box>}
        </Static>
      )}

      {/* Active items rendered dynamically */}
      {activeItems.map((item) => (
        <Box key={item.key}>{item.component}</Box>
      ))}
    </>
  );
}
