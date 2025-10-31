/**
 * Chat Screen
 * AI chat interface with session management
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useAppStore } from '../stores/app-store.js';
import { useChat } from '../hooks/useChat.js';
import StatusBar from '../components/StatusBar.js';

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
      <Box flexDirection="column" flexGrow={1} paddingY={2}>
        <Box paddingBottom={2}>
          <Text color="#00D9FF">▌</Text>
          <Text bold color="white"> WELCOME</Text>
        </Box>

        <Box paddingBottom={2}>
          <Text color="#FFD700">▌</Text>
          <Text color="gray"> No AI provider configured yet</Text>
        </Box>

        <Box flexDirection="column" gap={1}>
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
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <Box flexShrink={0} paddingBottom={1}>
        <Text color="#00D9FF">▌ CHAT</Text>
      </Box>

      {/* Messages - Scrollable area */}
      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {currentSession.messages.length === 0 && !isStreaming ? (
          <Box paddingY={1}>
            <Text dimColor>Ready to chat...</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {currentSession.messages.map((msg, i) => (
              <Box key={i} paddingY={1} flexDirection="column">
                {msg.role === 'user' ? (
                  <>
                    <Box marginBottom={1}>
                      <Text color="#00D9FF">▌ YOU</Text>
                    </Box>
                    <Text color="white">{msg.content}</Text>
                  </>
                ) : (
                  <>
                    <Box marginBottom={1}>
                      <Text color="#00FF88">▌ ASSISTANT</Text>
                    </Box>
                    <Text color="gray">{msg.content}</Text>
                  </>
                )}
              </Box>
            ))}

            {isStreaming && (
              <Box paddingY={1} flexDirection="column">
                <Box marginBottom={1}>
                  <Text color="#00FF88">▌ ASSISTANT</Text>
                </Box>
                <Text color="gray">{streamingContent}</Text>
                <Text color="#FFD700">▊</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Input - Fixed */}
      <Box flexDirection="column" flexShrink={0} paddingTop={1}>
        <Box marginBottom={1}>
          <Text color="#00D9FF">▌ INPUT</Text>
        </Box>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder={isStreaming ? 'Waiting...' : 'Type your message...'}
          showCursor={!isStreaming}
        />
      </Box>

      {/* Status Bar - Fixed at bottom */}
      <StatusBar
        provider={currentSession.provider}
        model={currentSession.model}
        apiKey={aiConfig?.providers?.[currentSession.provider]?.apiKey}
        messageCount={currentSession.messages.length}
      />
    </Box>
  );
}
