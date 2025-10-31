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

  const colors: Record<ProviderId, string> = {
    anthropic: '#00D9FF',
    openai: '#00FF88',
    google: '#FF6B6B',
    openrouter: '#A855F7',
  };

  const color = colors[providerId];

  return (
    <Box flexDirection="column" marginBottom={2} paddingX={2}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={color}>▌</Text>
        <Text bold color="white"> {provider.name.toUpperCase()}</Text>
        {isDefault && (
          <>
            <Text color="gray"> · </Text>
            <Text color="#FFD700">DEFAULT</Text>
          </>
        )}
      </Box>

      {/* Details */}
      <Box flexDirection="column" paddingLeft={2} gap={1}>
        {/* API Key Status */}
        <Box>
          <Text color="gray">API Key </Text>
          <Text color="gray">│ </Text>
          {apiKey ? (
            <Text color="#00FF88">✓ Configured</Text>
          ) : (
            <Text color="#FF3366">✗ Not configured</Text>
          )}
        </Box>

        {/* Default Model */}
        {defaultModel && (
          <Box>
            <Text color="gray">Model </Text>
            <Text color="gray">│ </Text>
            <Text color="white">{defaultModel}</Text>
          </Box>
        )}

        {/* Model Count */}
        <Box>
          <Text color="gray">Available </Text>
          <Text color="gray">│ </Text>
          <Text color={color}>{provider.models.length} models</Text>
        </Box>
      </Box>
    </Box>
  );
}
