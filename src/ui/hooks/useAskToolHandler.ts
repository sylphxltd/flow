/**
 * Ask Tool Handler Hook
 * Registers user input handler for the ask tool
 */

import { useEffect } from 'react';
import { setUserInputHandler, clearUserInputHandler, setQueueUpdateCallback } from '../../tools/interaction.js';
import type { WaitForInputOptions } from '../commands/types.js';

interface UseAskToolHandlerProps {
  setPendingInput: (input: WaitForInputOptions | null) => void;
  setMultiSelectionPage: (page: number) => void;
  setMultiSelectionAnswers: (answers: Record<string, string | string[]>) => void;
  setSelectionFilter: (filter: string) => void;
  setSelectedCommandIndex: (index: number) => void;
  setAskQueueLength: (length: number) => void;
  inputResolver: React.MutableRefObject<((value: string | Record<string, string | string[]>) => void) | null>;
  addDebugLog: (message: string) => void;
}

export function useAskToolHandler({
  setPendingInput,
  setMultiSelectionPage,
  setMultiSelectionAnswers,
  setSelectionFilter,
  setSelectedCommandIndex,
  setAskQueueLength,
  inputResolver,
  addDebugLog,
}: UseAskToolHandlerProps) {
  useEffect(() => {
    setUserInputHandler((request) => {
      return new Promise((resolve) => {
        addDebugLog(`[ask tool] Waiting for user selection (${request.questions.length} question${request.questions.length > 1 ? 's' : ''})`);
        inputResolver.current = resolve;
        setPendingInput(request);

        // Reset selection state
        setMultiSelectionPage(0);
        setMultiSelectionAnswers({});
        setSelectionFilter('');
        setSelectedCommandIndex(0);
      });
    });

    // Set queue update callback
    setQueueUpdateCallback((count) => {
      setAskQueueLength(count);
    });

    return () => {
      clearUserInputHandler();
    };
  }, [
    addDebugLog,
    setPendingInput,
    setMultiSelectionPage,
    setMultiSelectionAnswers,
    setSelectionFilter,
    setSelectedCommandIndex,
    setAskQueueLength,
    inputResolver,
  ]);
}
