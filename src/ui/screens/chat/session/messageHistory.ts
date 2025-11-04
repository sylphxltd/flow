/**
 * Message History Hook
 * Manages loading and tracking of user message history from database
 */

import { useState, useEffect } from 'react';
import { getSessionRepository } from '../../../../db/database.js';

/**
 * Custom hook to load and manage message history
 *
 * @returns Object containing messageHistory and setMessageHistory
 */
export function useMessageHistory() {
  const [messageHistory, setMessageHistory] = useState<string[]>([]);

  // Load message history from database on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const repo = await getSessionRepository();
        const history = await repo.getRecentUserMessages(100);
        // Reverse to get oldest-first order (for bash-like navigation)
        setMessageHistory(history.reverse());
      } catch (error) {
        console.error('Failed to load message history:', error);
      }
    };
    loadHistory();
  }, []); // Only load once on mount

  return {
    messageHistory,
    setMessageHistory,
  };
}
