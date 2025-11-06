/**
 * Ask Tool Handler Hook
 * Handles Ask tool in client-server architecture via tRPC streaming
 *
 * Flow:
 * 1. Server sends 'ask-question' streaming event
 * 2. This hook receives it via onAskQuestion callback
 * 3. Displays UI for user to answer
 * 4. User answers → calls answerAsk mutation
 * 5. Server receives answer and continues AI stream
 */

import { useCallback } from 'react';
import { getTRPCClient } from '../trpc-provider.js';
import type { WaitForInputOptions } from '../types/command-types.js';

interface UseAskToolHandlerProps {
  currentSessionId: string | null;
  setPendingInput: (input: WaitForInputOptions | null) => void;
  setMultiSelectionPage: (page: number) => void;
  setMultiSelectionAnswers: (answers: Record<string, string | string[]>) => void;
  setSelectionFilter: (filter: string) => void;
  setSelectedCommandIndex: (index: number) => void;
  inputResolver: React.MutableRefObject<((value: string | Record<string, string | string[]>) => void) | null>;
  addDebugLog: (message: string) => void;
}

export function useAskToolHandler({
  currentSessionId,
  setPendingInput,
  setMultiSelectionPage,
  setMultiSelectionAnswers,
  setSelectionFilter,
  setSelectedCommandIndex,
  inputResolver,
  addDebugLog,
}: UseAskToolHandlerProps) {
  /**
   * Handle ask-question event from streaming
   * Called when server sends ask-question event
   */
  const handleAskQuestion = useCallback((
    questionId: string,
    questions: Array<{
      question: string;
      header: string;
      multiSelect: boolean;
      options: Array<{
        label: string;
        description: string;
      }>;
    }>
  ) => {
    addDebugLog(`[ask tool] Received question (${questions.length} question${questions.length > 1 ? 's' : ''})`);

    // Setup resolver that will call answerAsk mutation
    inputResolver.current = async (answers: string | Record<string, string | string[]>) => {
      if (!currentSessionId) {
        throw new Error('No active session');
      }

      const client = getTRPCClient();

      // Convert string answer to Record format if needed
      const answerRecord = typeof answers === 'string'
        ? { '0': answers }
        : answers;

      try {
        // Send answer to server via mutation
        await client.message.answerAsk.mutate({
          sessionId: currentSessionId,
          questionId,
          answers: answerRecord,
        });

        addDebugLog('[ask tool] Answer sent to server');
      } catch (error) {
        addDebugLog(`[ask tool] Error sending answer: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    };

    // Convert to WaitForInputOptions format for UI
    setPendingInput({
      questions: questions.map((q, idx) => ({
        id: `q${idx}`,
        question: q.question,
        header: q.header,
        options: q.options.map((opt, optIdx) => ({
          id: `opt${optIdx}`,
          label: opt.label,
          description: opt.description,
        })),
        multiSelect: q.multiSelect,
      })),
    } as unknown as WaitForInputOptions);

    // Reset selection state
    setMultiSelectionPage(0);
    setMultiSelectionAnswers({});
    setSelectionFilter('');
    setSelectedCommandIndex(0);
  }, [
    currentSessionId,
    addDebugLog,
    setPendingInput,
    setMultiSelectionPage,
    setMultiSelectionAnswers,
    setSelectionFilter,
    setSelectedCommandIndex,
    inputResolver,
  ]);

  return { handleAskQuestion };
}
