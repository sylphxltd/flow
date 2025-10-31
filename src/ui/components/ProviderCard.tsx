/**
 * Provider Card Component
 * Display provider information
 */

import React from 'react';
import { Box, Text } from 'ink';
import { AI_PROVIDERS, type ProviderId } from '../../config/ai-config.js';

interface ProviderCardProps {
  providerId: ProviderId;
  apiKey?: string;
  defaultModel?: string;
  isDefault?: boolean;
}

export default function ProviderCard({
  providerId,
  apiKey,
  defaultModel,
  isDefault = false,
}: ProviderCardProps) {
  const provider = AI_PROVIDERS[providerId];

  const icons: Record<ProviderId, string> = {
    anthropic: '🔵',
    openai: '🟢',
    google: '🔴',
    openrouter: '🟣',
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isDefault ? 'green' : 'gray'}
      padding={1}
      marginBottom={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={isDefault ? 'green' : 'white'}>
          {icons[providerId]} {provider.name}
          {isDefault && <Text color="green"> (Default)</Text>}
        </Text>
      </Box>

      {/* API Key Status */}
      <Box>
        <Text dimColor>API Key: </Text>
        <Text color={apiKey ? 'green' : 'red'}>{apiKey ? '✓ Configured' : '✗ Not configured'}</Text>
      </Box>

      {/* Default Model */}
      {defaultModel && (
        <Box>
          <Text dimColor>Model: </Text>
          <Text>{defaultModel}</Text>
        </Box>
      )}

      {/* Model Count */}
      <Box>
        <Text dimColor>Available Models: </Text>
        <Text>{provider.models.length}</Text>
      </Box>
    </Box>
  );
}
