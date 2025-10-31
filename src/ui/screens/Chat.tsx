/**
 * Chat Screen
 * AI chat interface with session management
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useAppStore } from '../stores/app-store.js';
import { useChat } from '../hooks/useChat.js';
import { useKeyboard } from '../hooks/useKeyboard.js';

export default function Chat() {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const navigateTo = useAppStore((state) => state.navigateTo);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const createSession = useAppStore((state) => state.createSession);

  const { sendMessage, currentSession } = useChat();

  // Create session if none exists
  useEffect(() => {
    if (!currentSessionId && aiConfig?.defaultProvider && aiConfig?.defaultModel) {
      createSession(aiConfig.defaultProvider, aiConfig.defaultModel);
    }
  }, [currentSessionId, aiConfig, createSession]);

  // Check if ready to chat
  if (!aiConfig?.defaultProvider || !aiConfig?.defaultModel) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Welcome to Sylphx Flow AI Chat
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="yellow">⚠️  No AI provider configured yet</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>To get started:</Text>
          <Text dimColor>1. Press <Text color="cyan">Ctrl+P</Text> to configure a provider</Text>
          <Text dimColor>2. Press <Text color="cyan">Ctrl+M</Text> to select a model</Text>
          <Text dimColor>3. Come back here to start chatting</Text>
        </Box>
      </Box>
    );
  }

  if (!currentSession) {
    return (
      <Box>
        <Text color="yellow">⏳ Creating session...</Text>
      </Box>
    );
  }

  const handleSubmit = async (value: string) => {
    if (!value.trim() || isStreaming) return;

    const userMessage = value.trim();
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    await sendMessage(
      userMessage,
      (chunk) => {
        setStreamingContent((prev) => prev + chunk);
      },
      () => {
        setIsStreaming(false);
        setStreamingContent('');
      }
    );
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          Chat Session
        </Text>
        <Text dimColor>
          Provider: {currentSession.provider} | Model: {currentSession.model}
        </Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" marginBottom={1} flexGrow={1}>
        {currentSession.messages.length === 0 && !isStreaming ? (
          <Text dimColor>Start chatting by typing a message below...</Text>
        ) : (
          <>
            {currentSession.messages.map((msg, i) => (
              <Box key={i} marginBottom={1} flexDirection="column">
                <Text bold color={msg.role === 'user' ? 'blue' : 'green'}>
                  {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}:
                </Text>
                <Text>{msg.content}</Text>
              </Box>
            ))}

            {isStreaming && (
              <Box marginBottom={1} flexDirection="column">
                <Text bold color="green">
                  🤖 Assistant:
                </Text>
                <Text>{streamingContent}</Text>
                <Text color="yellow">▊</Text>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Input */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        padding={1}
        flexDirection="column"
      >
        <Text dimColor>Message:</Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder={isStreaming ? 'Please wait...' : 'Type your message...'}
          showCursor={!isStreaming}
        />
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Type and press Enter to send</Text>
      </Box>
    </Box>
  );
}
