/**
 * Status Bar Component
 * Display important session info at the bottom
 * Includes performance monitoring (FPS)
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { ProviderId } from '../../config/ai-config.js';
import { getProvider } from '../../providers/index.js';
import { getTokenizerInfo } from '../../utils/token-counter.js';
import { getAgentById } from '../../core/agent-manager.js';
import { useAppStore } from '../stores/app-store.js';
import { useFPS } from '../hooks/useFPS.js';

interface StatusBarProps {
  provider: ProviderId;
  model: string;
  apiKey?: string;
  usedTokens?: number;
}

export default function StatusBar({ provider, model, apiKey, usedTokens = 0 }: StatusBarProps) {
  const [contextLength, setContextLength] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenizerInfo, setTokenizerInfo] = useState<{
    modelName: string;
    tokenizerName: string;
    loaded: boolean;
    failed: boolean;
  } | null>(null);

  // Subscribe to current agent from store (event-driven, no polling!)
  const currentAgentId = useAppStore((state) => state.currentAgentId);
  const currentAgent = getAgentById(currentAgentId);
  const agentName = currentAgent?.metadata.name || '';

  // Subscribe to enabled rules count
  const enabledRulesCount = useAppStore((state) => state.enabledRuleIds.length);

  // Track rendering performance
  const { fps, isDegraded, isSlow } = useFPS();

  useEffect(() => {
    async function loadModelDetails() {
      setLoading(true);
      try {
        const providerInstance = getProvider(provider);
        const details = await providerInstance.getModelDetails(model, apiKey);
        setContextLength(details?.contextLength || null);

        // Get tokenizer info
        const tokInfo = await getTokenizerInfo(model);
        setTokenizerInfo(tokInfo);
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
    <Box flexGrow={1} justifyContent="space-between" marginBottom={1}>
      {/* Left side: Agent, Rules, Provider and Model */}
      <Box>
        <Text dimColor>
          {agentName && `${agentName} · `}{enabledRulesCount} {enabledRulesCount === 1 ? 'rule' : 'rules'} · {provider} · {model}
        </Text>
      </Box>

      {/* Right side: FPS, Tokenizer and Context */}
      <Box>
        {/* FPS indicator with color based on performance */}
        <Text color={isSlow ? '#FF3366' : isDegraded ? '#FFD700' : '#00FF88'}>
          {fps}fps
        </Text>
        {(!loading && tokenizerInfo) || (!loading && contextLength) ? (
          <Text dimColor> │ </Text>
        ) : null}
        {!loading && tokenizerInfo ? (
          <>
            <Text dimColor>
              {tokenizerInfo.tokenizerName}
              {tokenizerInfo.failed && ' (fallback)'}
            </Text>
            {contextLength ? <Text dimColor> │ </Text> : null}
          </>
        ) : null}
        {!loading && contextLength && usedTokens > 0 ? (
          <Text dimColor>
            Context: {formatNumber(usedTokens)}/{formatNumber(contextLength)} ({usagePercent}%)
          </Text>
        ) : null}
        {!loading && contextLength && usedTokens === 0 ? (
          <Text dimColor>Context: {formatNumber(contextLength)}</Text>
        ) : null}
      </Box>
    </Box>
  );
}
