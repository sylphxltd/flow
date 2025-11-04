/**
 * ChatHeader Component
 * Displays app title and current chat session title
 */

import { Box, Text } from 'ink';

interface ChatHeaderProps {
  currentSessionTitle?: string;
  isTitleStreaming: boolean;
  streamingTitle: string;
}

export function ChatHeader({ currentSessionTitle, isTitleStreaming, streamingTitle }: ChatHeaderProps) {
  return (
    <>
      {/* App Header */}
      <Box paddingX={1} paddingY={1}>
        <Text bold color="#00D9FF">SYLPHX FLOW</Text>
        <Text dimColor> │ </Text>
        <Text dimColor>AI Development Assistant</Text>
      </Box>

      {/* Chat Title - shows current session title with streaming support */}
      {currentSessionTitle && (
        <Box paddingX={1} paddingBottom={1} flexShrink={0}>
          <Text color="#00D9FF">▌ CHAT</Text>
          <Text color="#00D9FF"> · </Text>
          {isTitleStreaming ? (
            <>
              <Text color="white">{streamingTitle}</Text>
              <Text color="#FFD700">▊</Text>
            </>
          ) : (
            <Text color="white">{currentSessionTitle || 'New Chat'}</Text>
          )}
        </Box>
      )}
    </>
  );
}
