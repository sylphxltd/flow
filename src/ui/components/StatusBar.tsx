/**
 * Status Bar Component
 * Display important session info at the bottom
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { ProviderId } from '../../config/ai-config.js';
import { getProvider } from '../../providers/index.js';

interface StatusBarProps {
  provider: ProviderId;
  model: string;
  apiKey?: string;
  messageCount: number;
}

export default function StatusBar({ provider, model, apiKey, messageCount }: StatusBarProps) {
  const [contextLength, setContextLength] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModelDetails() {
      setLoading(true);
      try {
        const providerInstance = getProvider(provider);
        const details = await providerInstance.getModelDetails(model, apiKey);
        setContextLength(details?.contextLength || null);
      } catch (error) {
        console.error('Failed to load model details:', error);
      } finally {
        setLoading(false);
      }
    }

    loadModelDetails();
  }, [provider, model, apiKey]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}k`;
    }
    return num.toString();
  };

  return (
    <Box flexShrink={0} paddingTop={1}>
      <Text dimColor>
        {provider} · {model}
      </Text>
      {!loading && contextLength && (
        <>
          <Text dimColor> │ </Text>
          <Text dimColor>Context: {formatNumber(contextLength)}</Text>
        </>
      )}
      <Text dimColor> │ </Text>
      <Text dimColor>Messages: {messageCount}</Text>
    </Box>
  );
}
