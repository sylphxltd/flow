/**
 * Main App Component
 * Root React + Ink component with screen routing
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from './stores/app-store.js';
import ProviderManagement from './screens/ProviderManagement.js';
import ModelSelection from './screens/ModelSelection.js';
import CommandPalette from './screens/CommandPalette.js';
import Chat from './screens/Chat.js';
import Logs from './screens/Logs.js';
import { useAIConfig } from './hooks/useAIConfig.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useSessionPersistence } from './hooks/useSessionPersistence.js';
import { initializeAgentManager } from '../core/agent-manager.js';

export default function App() {
  const currentScreen = useAppStore((state) => state.currentScreen);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const setError = useAppStore((state) => state.setError);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState<string | null>(null);

  // Load AI config on mount
  const { loadConfig } = useAIConfig();

  // Load sessions from disk on mount
  useSessionPersistence();

  // Note: useKeyboard is disabled - shortcuts are handled in each screen to avoid conflicts with TextInput
  // useKeyboard();

  // Handle command palette commands
  const handleCommand = (command: string) => {
    setCommandPaletteCommand(command);
  };

  useEffect(() => {
    // Initialize agent manager
    const cwd = process.cwd();
    initializeAgentManager(cwd).catch((err) => {
      console.error('Failed to initialize agent manager:', err);
    });

    // Load AI config
    loadConfig().catch((err) => {
      console.error('Failed to load config:', err);
    });
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
    <Box flexDirection="column" width="100%" height="100%" paddingX={1}>
      {/* Header */}
      <Box paddingY={1}>
        <Text bold color="#00D9FF">⚡ SYLPHX FLOW</Text>
        <Text dimColor> │ </Text>
        <Text dimColor>AI Development Assistant</Text>
      </Box>

      {/* Error Display */}
      {error && (
        <Box paddingY={1}>
          <Text color="#FF3366">▌</Text>
          <Text color="#FF3366" bold> ERROR </Text>
          <Text color="gray">{error}</Text>
        </Box>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Box paddingY={1}>
          <Text color="#FFD700">▌</Text>
          <Text color="#FFD700" bold> LOADING</Text>
          <Text color="gray">...</Text>
        </Box>
      )}

      {/* Screen Router */}
      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {currentScreen === 'chat' && <Chat commandFromPalette={commandPaletteCommand} />}
        {currentScreen === 'provider-management' && <ProviderManagement />}
        {currentScreen === 'model-selection' && <ModelSelection />}
        {currentScreen === 'command-palette' && <CommandPalette onCommand={handleCommand} />}
        {currentScreen === 'logs' && <Logs />}
      </Box>
    </Box>
  );
}
