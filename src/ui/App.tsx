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
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" padding={1} marginBottom={1}>
        <Text bold color="cyan">
          🤖 Sylphx Flow - AI Development Assistant
        </Text>
      </Box>

      {/* Error Display */}
      {error && (
        <Box borderStyle="round" borderColor="red" padding={1} marginBottom={1}>
          <Text color="red">❌ {error}</Text>
        </Box>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Box marginBottom={1}>
          <Text color="yellow">⏳ Loading...</Text>
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
        <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
          <Text dimColor>
            Shortcuts: <Text color="cyan">Ctrl+P</Text> Providers | <Text color="cyan">Ctrl+M</Text> Models | <Text color="cyan">Ctrl+Q</Text> Quit
          </Text>
        </Box>
      )}
    </Box>
  );
}
