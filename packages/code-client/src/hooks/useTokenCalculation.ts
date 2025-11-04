/**
 * Token Calculation Hook
 * Calculates total token usage for the current session with memoization
 */

import { useEffect, useState, useRef } from 'react';
import type { Session } from '@sylphx/code-core';

// Global cache for token counts (shared across all sessions)
const tokenCache = new Map<string, number>();
const systemPromptCache = new Map<string, number>();
const toolsCache = new Map<string, number>();

// Generate cache key for message content
function getMessageCacheKey(sessionId: string, messageIndex: number, content: string): string {
  // Use hash of content + session + index for cache key
  return `${sessionId}:${messageIndex}:${content.substring(0, 100)}`;
}

export function useTokenCalculation(currentSession: Session | null): number {
  const [usedTokens, setUsedTokens] = useState(0);
  const lastCalculatedLength = useRef(0);
  const cachedTotal = useRef(0);
  const lastSessionId = useRef<string | null>(null);

  // Extract stable values to avoid triggering on object reference changes
  const sessionId = currentSession?.id ?? null;
  const messagesLength = currentSession?.messages.length ?? 0;
  const model = currentSession?.model ?? '';

  useEffect(() => {
    if (!currentSession || !sessionId) {
      setUsedTokens(0);
      lastCalculatedLength.current = 0;
      cachedTotal.current = 0;
      lastSessionId.current = null;
      return;
    }

    // Reset cache if session changed
    if (lastSessionId.current !== sessionId) {
      lastCalculatedLength.current = 0;
      cachedTotal.current = 0;
      lastSessionId.current = sessionId;
    }

    const calculateTokens = async () => {
      try {
        const { countTokens } = await import('../../utils/token-counter.js');
        const { SYSTEM_PROMPT } = await import('../../core/ai-sdk.js');
        const { getAISDKTools } = await import('../../tools/index.js');

        let total = 0;

        // System prompt tokens (cached by model)
        const systemPromptKey = `system:${currentSession.model}`;
        if (systemPromptCache.has(systemPromptKey)) {
          total += systemPromptCache.get(systemPromptKey)!;
        } else {
          const systemTokens = await countTokens(SYSTEM_PROMPT, currentSession.model);
          systemPromptCache.set(systemPromptKey, systemTokens);
          total += systemTokens;
        }

        // Tools tokens (cached by model)
        const toolsKey = `tools:${currentSession.model}`;
        if (toolsCache.has(toolsKey)) {
          total += toolsCache.get(toolsKey)!;
        } else {
          const tools = getAISDKTools();
          const toolsJson = JSON.stringify(tools);
          const toolsTokens = await countTokens(toolsJson, currentSession.model);
          toolsCache.set(toolsKey, toolsTokens);
          total += toolsTokens;
        }

        // Incremental calculation: only calculate new messages
        const messageCount = currentSession.messages.length;
        if (messageCount === lastCalculatedLength.current) {
          // No new messages, use cached total
          setUsedTokens(cachedTotal.current);
          return;
        }

        // Start from cached total if we have previously calculated messages
        if (lastCalculatedLength.current > 0) {
          total += cachedTotal.current - (systemPromptCache.get(systemPromptKey) || 0) - (toolsCache.get(toolsKey) || 0);
        }

        // Only calculate tokens for new messages
        const newMessages = currentSession.messages.slice(lastCalculatedLength.current);
        const startIndex = lastCalculatedLength.current;

        for (let i = 0; i < newMessages.length; i++) {
          const msg = newMessages[i];
          const msgIndex = startIndex + i;

          // Count main content (extract text from parts)
          let textContent = '';
          if (msg.content && Array.isArray(msg.content)) {
            textContent = msg.content
              .filter((part) => part.type === 'text')
              .map((part: any) => part.content)
              .join('\n');
          } else if (msg.content) {
            // Legacy format: content is a string
            textContent = String(msg.content);
          }

          // Check cache for this message
          const cacheKey = getMessageCacheKey(currentSession.id, msgIndex, textContent);
          if (tokenCache.has(cacheKey)) {
            total += tokenCache.get(cacheKey)!;
          } else {
            const msgTokens = await countTokens(textContent, currentSession.model);
            tokenCache.set(cacheKey, msgTokens);
            total += msgTokens;
          }

          // Count attachments if any
          if (msg.attachments && msg.attachments.length > 0) {
            for (const att of msg.attachments) {
              try {
                const attCacheKey = `${currentSession.id}:${msgIndex}:att:${att.path}`;
                if (tokenCache.has(attCacheKey)) {
                  total += tokenCache.get(attCacheKey)!;
                } else {
                  const { readFile } = await import('node:fs/promises');
                  const content = await readFile(att.path, 'utf8');
                  const attTokens = await countTokens(content, currentSession.model);
                  tokenCache.set(attCacheKey, attTokens);
                  total += attTokens;
                }
              } catch (error) {
                // File might not exist anymore, skip
              }
            }
          }
        }

        // Update cache state
        lastCalculatedLength.current = messageCount;
        cachedTotal.current = total;
        setUsedTokens(total);

        // Limit cache size to prevent memory leak (keep last 10k entries)
        if (tokenCache.size > 10000) {
          const entries = Array.from(tokenCache.entries());
          tokenCache.clear();
          // Keep newest 5000 entries
          entries.slice(-5000).forEach(([key, value]) => tokenCache.set(key, value));
        }
      } catch (error) {
        console.error('Failed to calculate token usage:', error);
      }
    };

    calculateTokens();
  }, [sessionId, messagesLength, model]); // Only depend on stable primitive values, not object references

  return usedTokens;
}
