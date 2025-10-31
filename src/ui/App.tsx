/**
 * Main App Component
 * Root React + Ink component with screen routing
 */

import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from './stores/app-store.js';
import ProviderManagement from './screens/ProviderManagement.js';
import ModelSelection from './screens/ModelSelection.js';
import Chat from './screens/Chat.js';
import { useAIConfig } from './hooks/useAIConfig.js';
import { useKeyboard } from './hooks/useKeyboard.js';

export default function App() {
  const currentScreen = useAppStore((state) => state.currentScreen);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const setError = useAppStore((state) => state.setError);

  // Load AI config on mount
  const { loadConfig } = useAIConfig();

  // Global keyboard shortcuts
  useKeyboard();

  useEffect(() => {
    loadConfig();
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, setError]);

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color="#00D9FF">
            ╭─────────────────────────────────────────────╮
          </Text>
        </Box>
        <Box paddingLeft={2} paddingRight={2}>
          <Text bold color="#00D9FF">
            ⚡ SYLPHX FLOW
          </Text>
          <Text dimColor> │ </Text>
          <Text color="gray">AI Development Assistant</Text>
        </Box>
        <Box>
          <Text bold color="#00D9FF">
            ╰─────────────────────────────────────────────╯
          </Text>
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Box marginBottom={1}>
          <Box>
            <Text color="#FF3366">▌</Text>
            <Text color="#FF3366" bold> ERROR </Text>
            <Text color="gray"> {error}</Text>
          </Box>
        </Box>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Box marginBottom={1}>
          <Text color="#FFD700">▌</Text>
          <Text color="#FFD700" bold> LOADING</Text>
          <Text color="gray">...</Text>
        </Box>
      )}

      {/* Screen Router */}
      <Box flexDirection="column">
        {currentScreen === 'chat' && <Chat />}
        {currentScreen === 'provider-management' && <ProviderManagement />}
        {currentScreen === 'model-selection' && <ModelSelection />}
      </Box>

      {/* Global Shortcuts Help */}
      {currentScreen === 'chat' && (
        <Box marginTop={1} paddingY={1} paddingX={2}>
          <Text color="#00D9FF">◆</Text>
          <Text color="gray"> </Text>
          <Text color="#00D9FF" bold>Ctrl+P</Text>
          <Text dimColor> Providers </Text>
          <Text color="gray">│</Text>
          <Text dimColor> </Text>
          <Text color="#00D9FF" bold>Ctrl+M</Text>
          <Text dimColor> Models </Text>
          <Text color="gray">│</Text>
          <Text dimColor> </Text>
          <Text color="#00D9FF" bold>Ctrl+Q</Text>
          <Text dimColor> Quit</Text>
        </Box>
      )}
    </Box>
  );
}
