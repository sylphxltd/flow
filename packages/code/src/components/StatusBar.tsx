/**
 * Status Bar Component
 * Display important session info at the bottom
 */

import { useAppStore } from '@sylphx/code-client';
import type { ProviderId } from '@sylphx/code-core';
import { getProvider, getTokenizerInfo } from '@sylphx/code-core';
import { getAgentById } from '../embedded-context.js';
import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';

interface StatusBarProps {
  provider: ProviderId;
  model: string;
  usedTokens?: number;
}

/**
 * StatusBar Component
 *
 * SECURITY: Uses hardcoded metadata instead of calling provider API
 * - No API keys needed on client side
 * - Context length data from provider static metadata
 * - Safe for Web GUI and remote mode
 */
export default function StatusBar({ provider, model, usedTokens = 0 }: StatusBarProps) {
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

  useEffect(() => {
    async function loadModelDetails() {
      setLoading(true);
      try {
        const providerInstance = getProvider(provider);
        // SECURITY: Call getModelDetails WITHOUT config (uses hardcoded metadata only)
        // This prevents exposing API keys to client
        const details = await providerInstance.getModelDetails(model);
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
  }, [provider, model]);

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
  const usagePercent =
    contextLength && usedTokens > 0 ? Math.round((usedTokens / contextLength) * 100) : 0;

  return (
    <Box flexGrow={1} justifyContent="space-between" marginBottom={1}>
      {/* Left side: Agent, Rules, Provider and Model */}
      <Box>
        <Text dimColor>
          {agentName && `${agentName} · `}
          {enabledRulesCount} {enabledRulesCount === 1 ? 'rule' : 'rules'} · {provider} · {model}
        </Text>
      </Box>

      {/* Right side: Tokenizer and Context */}
      <Box>
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
