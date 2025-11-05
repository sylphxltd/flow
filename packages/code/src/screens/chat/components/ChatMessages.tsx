/**
 * ChatMessages Component
 * Displays welcome message or message list based on session state
 */

import { Box, Text } from 'ink';
import type { SessionMessage } from '../../../../types/session.types.js';
import { MessageList } from '../../../components/MessageList.js';

interface ChatMessagesProps {
  hasSession: boolean;
  messages?: SessionMessage[];
  attachmentTokens: Map<string, number>;
}

export function ChatMessages({ hasSession, messages = [], attachmentTokens }: ChatMessagesProps) {
  if (!hasSession) {
    return (
      <Box paddingY={1} flexDirection="column">
        <Box paddingBottom={2}>
          <Text color="#00D9FF">▌</Text>
          <Text bold color="white">
            {' '}
            WELCOME
          </Text>
        </Box>
        <Box paddingBottom={1}>
          <Text dimColor>Start chatting by typing a message below.</Text>
        </Box>
        <Box paddingBottom={1}>
          <Text dimColor>Useful commands:</Text>
        </Box>
        <Box paddingLeft={2} paddingBottom={1}>
          <Text color="#00D9FF">/provider</Text>
          <Text dimColor> - Manage AI providers</Text>
        </Box>
        <Box paddingLeft={2} paddingBottom={1}>
          <Text color="#00D9FF">/help</Text>
          <Text dimColor> - Show all available commands</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexGrow={1} flexDirection="column">
      <MessageList messages={messages} attachmentTokens={attachmentTokens} />
    </Box>
  );
}
