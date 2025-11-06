/**
 * Token Calculation Hook
 * Calculates total token usage for the current session
 *
 * Design: Sum up usage from all messages (server provides usage per message)
 * No need to call tokenizer - server already calculated tokens during streaming
 */

import { useMemo } from 'react';
import type { Session } from '@sylphx/code-core';

export function useTokenCalculation(currentSession: Session | null): number {
  return useMemo(() => {
    if (!currentSession) {
      return 0;
    }

    // Sum up totalTokens from all messages that have usage
    let total = 0;
    for (const message of currentSession.messages) {
      if (message.usage) {
        total += message.usage.totalTokens;
      }
    }

    return total;
  }, [currentSession?.id, currentSession?.messages.length]);
}
