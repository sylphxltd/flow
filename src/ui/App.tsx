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
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box>
        <Text bold color="#00D9FF">⚡ SYLPHX FLOW</Text>
        <Text dimColor> │ </Text>
        <Text dimColor>AI Development Assistant</Text>
      </Box>

      {/* Error Display */}
      {error && (
        <Box marginTop={1}>
          <Text color="#FF3366">▌</Text>
          <Text color="#FF3366" bold> ERROR </Text>
          <Text color="gray">{error}</Text>
        </Box>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Box marginTop={1}>
          <Text color="#FFD700">▌</Text>
          <Text color="#FFD700" bold> LOADING</Text>
          <Text color="gray">...</Text>
        </Box>
      )}

      {/* Screen Router */}
      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {currentScreen === 'chat' && <Chat />}
        {currentScreen === 'provider-management' && <ProviderManagement />}
        {currentScreen === 'model-selection' && <ModelSelection />}
      </Box>

      {/* Global Shortcuts Help */}
      {currentScreen === 'chat' && (
        <Box marginTop={1}>
          <Text dimColor>Ctrl+P Providers │ Ctrl+M Models │ Ctrl+Q Quit</Text>
        </Box>
      )}
    </Box>
  );
}
