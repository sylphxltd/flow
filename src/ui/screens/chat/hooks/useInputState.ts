/**
 * Input State Hook
 * Manages input text, cursor position, and message history navigation
 */

import { useState, useMemo, useEffect } from 'react';
import { getSessionRepository } from '../../../../db/database.js';

export interface InputState {
  input: string;
  setInput: (input: string) => void;
  cursor: number;
  setCursor: (cursor: number) => void;
  normalizedCursor: number;
  messageHistory: string[];
  setMessageHistory: (history: string[] | ((prev: string[]) => string[])) => void;
  historyIndex: number;
  setHistoryIndex: (index: number) => void;
  tempInput: string;
  setTempInput: (input: string) => void;
}

export function useInputState(): InputState {
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0);
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempInput, setTempInput] = useState('');

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

  // Normalize cursor to valid range
  const normalizedCursor = useMemo(
    () => Math.max(0, Math.min(cursor, input.length)),
    [cursor, input.length]
  );

  return {
    input,
    setInput,
    cursor,
    setCursor,
    normalizedCursor,
    messageHistory,
    setMessageHistory,
    historyIndex,
    setHistoryIndex,
    tempInput,
    setTempInput,
  };
}
