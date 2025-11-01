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
    'claude-code': '#FF9500',
    zai: '#FFD700',
  };

  const color = colors[providerId];

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={color}>▌ {provider.name.toUpperCase()}</Text>
        {isDefault && (
          <>
            <Text dimColor> · </Text>
            <Text color="#FFD700">DEFAULT</Text>
          </>
        )}
      </Box>

      {/* Details */}
      <Box paddingLeft={2}>
        {/* Claude Code doesn't need API key, it uses CLI auth */}
        {providerId === 'claude-code' ? (
          <>
            <Text color="#00FF88">✓</Text>
            <Text dimColor> CLI Auth</Text>
          </>
        ) : apiKey ? (
          <Text color="#00FF88">✓</Text>
        ) : (
          <Text color="#FF3366">✗</Text>
        )}
        <Text dimColor> │ </Text>
        {defaultModel && (
          <>
            <Text color="white">{defaultModel}</Text>
            <Text dimColor> │ </Text>
          </>
        )}
        <Text color={color}>
          {provider.models.length > 0 ? `${provider.models.length} models` : 'Dynamic models'}
        </Text>
      </Box>
    </Box>
  );
}
