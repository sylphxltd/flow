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
  usedTokens?: number;
}

export default function StatusBar({ provider, model, apiKey, usedTokens = 0 }: StatusBarProps) {
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

  // Calculate usage percentage
  const usagePercent = contextLength && usedTokens > 0
    ? Math.round((usedTokens / contextLength) * 100)
    : 0;

  return (
    <Box>
      <Text dimColor>
        {provider} · {model}
      </Text>
      {!loading && contextLength && usedTokens > 0 && (
        <>
          <Text dimColor> │ </Text>
          <Text dimColor>
            Context: {formatNumber(usedTokens)}/{formatNumber(contextLength)} ({usagePercent}%)
          </Text>
        </>
      )}
      {!loading && contextLength && usedTokens === 0 && (
        <>
          <Text dimColor> │ </Text>
          <Text dimColor>Context: {formatNumber(contextLength)}</Text>
        </>
      )}
    </Box>
  );
}
