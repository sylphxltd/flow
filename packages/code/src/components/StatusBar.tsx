/**
 * Status Bar Component
 * Display important session info at the bottom
 */

import { useAppStore, useTRPCClient } from '@sylphx/code-client';
import type { ProviderId } from '@sylphx/code-core';
import { getAgentById } from '../embedded-context.js';
import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';

interface StatusBarProps {
  provider: ProviderId | null;
  model: string | null;
  usedTokens?: number;
}

/**
 * StatusBar Component
 *
 * SECURITY: Uses tRPC server endpoints for all data
 * - No API keys exposed on client side
 * - All business logic on server
 * - Safe for Web GUI and remote mode
 */
export default function StatusBar({ provider, model, usedTokens = 0 }: StatusBarProps) {
  const trpc = useTRPCClient();
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
    // If no provider/model configured, skip loading
    if (!provider || !model) {
      setLoading(false);
      return;
    }

    async function loadModelDetails() {
      setLoading(true);
      try {
        // Use tRPC to get model details from server
        const detailsResult = await trpc.config.getModelDetails.query({
          providerId: provider!,
          modelId: model!,
        });

        if (detailsResult.success && detailsResult.details) {
          setContextLength(detailsResult.details.contextLength || null);
        }

        // Get tokenizer info from server
        const tokInfo = await trpc.config.getTokenizerInfo.query({ model: model! });
        setTokenizerInfo(tokInfo);
      } catch (error) {
        console.error('Failed to load model details:', error);
      } finally {
        setLoading(false);
      }
    }

    loadModelDetails();
  }, [provider, model, trpc]);

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

  // Handle unconfigured state
  if (!provider || !model) {
    return (
      <Box flexGrow={1} justifyContent="space-between" marginBottom={1}>
        <Box>
          <Text dimColor>
            {agentName && `${agentName} · `}
            {enabledRulesCount} {enabledRulesCount === 1 ? 'rule' : 'rules'}
          </Text>
        </Box>
        <Box>
          <Text color="yellow">⚠ No AI provider configured - use /provider to configure</Text>
        </Box>
      </Box>
    );
  }

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
