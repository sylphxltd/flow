/**
 * Token Calculation Hook
 * Calculates total token usage for the current session
 */

import { useEffect, useState } from 'react';
import type { Session } from '../../types/session.types.js';

export function useTokenCalculation(currentSession: Session | null): number {
  const [usedTokens, setUsedTokens] = useState(0);

  useEffect(() => {
    if (!currentSession) {
      setUsedTokens(0);
      return;
    }

    const calculateTokens = async () => {
      try {
        const { countTokens } = await import('../../utils/token-counter.js');
        const { SYSTEM_PROMPT } = await import('../../core/ai-sdk.js');
        const { getAISDKTools } = await import('../../tools/index.js');

        let total = 0;

        // System prompt tokens
        total += await countTokens(SYSTEM_PROMPT, currentSession.model);

        // Tools tokens
        const tools = getAISDKTools();
        const toolsJson = JSON.stringify(tools);
        total += await countTokens(toolsJson, currentSession.model);

        // Messages tokens
        for (const msg of currentSession.messages) {
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
          total += await countTokens(textContent, currentSession.model);

          // Count attachments if any
          if (msg.attachments && msg.attachments.length > 0) {
            for (const att of msg.attachments) {
              try {
                const { readFile } = await import('node:fs/promises');
                const content = await readFile(att.path, 'utf8');
                total += await countTokens(content, currentSession.model);
              } catch (error) {
                // File might not exist anymore, skip
              }
            }
          }
        }

        setUsedTokens(total);
      } catch (error) {
        console.error('Failed to calculate token usage:', error);
      }
    };

    calculateTokens();
  }, [currentSession, currentSession?.messages.length]);

  return usedTokens;
}
