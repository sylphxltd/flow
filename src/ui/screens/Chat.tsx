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
      <Box flexDirection="column" paddingX={2} paddingY={2}>
        <Box marginBottom={2}>
          <Text color="#00D9FF">▌</Text>
          <Text bold color="white"> WELCOME</Text>
        </Box>

        <Box marginBottom={2}>
          <Text color="#FFD700">▌</Text>
          <Text color="gray"> No AI provider configured yet</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1} gap={1}>
          <Box>
            <Text color="#00D9FF">1.</Text>
            <Text color="gray"> Press </Text>
            <Text bold color="#00D9FF">Ctrl+P</Text>
            <Text color="gray"> to configure a provider</Text>
          </Box>
          <Box>
            <Text color="#00D9FF">2.</Text>
            <Text color="gray"> Press </Text>
            <Text bold color="#00D9FF">Ctrl+M</Text>
            <Text color="gray"> to select a model</Text>
          </Box>
          <Box>
            <Text color="#00D9FF">3.</Text>
            <Text color="gray"> Start chatting with AI</Text>
          </Box>
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
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box marginBottom={2} flexDirection="column">
        <Box>
          <Text color="#00D9FF">▌</Text>
          <Text bold color="white"> CHAT SESSION</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text color="gray">
            {currentSession.provider} · {currentSession.model}
          </Text>
        </Box>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" marginBottom={2}>
        {currentSession.messages.length === 0 && !isStreaming ? (
          <Box paddingLeft={2}>
            <Text color="gray">Ready to chat. Type your message below...</Text>
          </Box>
        ) : (
          <>
            {currentSession.messages.map((msg, i) => (
              <Box key={i} marginBottom={2} flexDirection="column">
                {msg.role === 'user' ? (
                  <>
                    <Box marginBottom={1}>
                      <Text color="#00D9FF">▌</Text>
                      <Text bold color="#00D9FF"> YOU</Text>
                    </Box>
                    <Box paddingLeft={2}>
                      <Text color="white">{msg.content}</Text>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box marginBottom={1}>
                      <Text color="#00FF88">▌</Text>
                      <Text bold color="#00FF88"> ASSISTANT</Text>
                    </Box>
                    <Box paddingLeft={2}>
                      <Text color="gray">{msg.content}</Text>
                    </Box>
                  </>
                )}
              </Box>
            ))}

            {isStreaming && (
              <Box marginBottom={2} flexDirection="column">
                <Box marginBottom={1}>
                  <Text color="#00FF88">▌</Text>
                  <Text bold color="#00FF88"> ASSISTANT</Text>
                </Box>
                <Box paddingLeft={2}>
                  <Text color="gray">{streamingContent}</Text>
                  <Text color="#FFD700">▊</Text>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Input */}
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="#00D9FF">▌</Text>
          <Text bold color="white"> INPUT</Text>
        </Box>
        <Box paddingLeft={2} paddingRight={2} paddingY={1} borderStyle="round" borderColor="#00D9FF">
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder={isStreaming ? 'Waiting for response...' : 'Type your message...'}
            showCursor={!isStreaming}
          />
        </Box>
      </Box>
    </Box>
  );
}
