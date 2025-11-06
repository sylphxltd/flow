/**
 * Command Context Factory
 * Creates CommandContext objects for command execution
 */

import type { ReactNode } from 'react';
import type { Session } from '@sylphx/code-client';
import type { AIConfig, ProviderId } from '@sylphx/code-core';
import type { Command, CommandContext, WaitForInputOptions } from '../../../commands/types.js';

/**
 * Parameters needed to create command context
 *
 * ARCHITECTURE:
 * - Only pass what's truly needed for UI interaction
 * - Commands use useAppStore directly for most operations
 */
export interface CommandContextParams {
  // For message operations (complex logic)
  addMessage: (
    sessionId: string | null,
    role: 'user' | 'assistant',
    content: string,
    attachments?: any[],
    usage?: any,
    finishReason?: string,
    metadata?: any,
    todoSnapshot?: any[],
    provider?: ProviderId,
    model?: string
  ) => Promise<string>;

  // Current session ID for command session tracking
  currentSessionId: string | null;

  // File system operations
  saveConfig: (config: AIConfig) => Promise<void>;

  // AI operations
  sendUserMessageToAI: (
    message: string,
    attachments?: Array<{ path: string; relativePath: string; size?: number }>
  ) => Promise<void>;

  // UI state setters (for waitForInput implementation)
  setInput: (value: string) => void;
  setPendingInput: (options: WaitForInputOptions | null) => void;
  setMultiSelectionPage: (page: number) => void;
  setMultiSelectionAnswers: (answers: Record<string, string | string[]>) => void;
  setMultiSelectChoices: (choices: Set<string>) => void;
  setSelectedCommandIndex: (index: number) => void;
  setSelectionFilter: (filter: string) => void;
  setIsFilterMode: (isFilterMode: boolean) => void;
  setInputComponent: (component: ReactNode | null, title?: string) => void;

  // Refs for async operations
  inputResolver: React.MutableRefObject<
    ((value: string | Record<string, string | string[]>) => void) | null
  >;
  commandSessionRef: React.MutableRefObject<string | null>;

  // Convenience (could use store directly)
  addLog: (message: string) => void;
  getCommands: () => Command[];
}

/**
 * Create a CommandContext for command execution
 *
 * Factory function that creates a CommandContext object with all required methods.
 * Extracted from Chat.tsx to improve modularity and testability.
 */
export function createCommandContext(args: string[], params: CommandContextParams): CommandContext {
  const {
    addMessage,
    currentSessionId,
    saveConfig,
    sendUserMessageToAI,
    setInput,
    setPendingInput,
    setMultiSelectionPage,
    setMultiSelectionAnswers,
    setMultiSelectChoices,
    setSelectedCommandIndex,
    setSelectionFilter,
    setIsFilterMode,
    setInputComponent,
    inputResolver,
    commandSessionRef,
    addLog,
    getCommands,
  } = params;

  return {
    args,

    sendMessage: async (content: string) => {
      // Get selected provider/model from store directly
      const { useAppStore } = await import('@sylphx/code-client');
      const { selectedProvider, selectedModel } = useAppStore.getState();
      const provider = (selectedProvider || 'openrouter') as ProviderId;
      const model = selectedModel || 'anthropic/claude-3.5-sonnet';

      // Reuse existing command session or pass null (will create new session)
      const sessionIdToUse = commandSessionRef.current || currentSessionId;

      // addMessage returns the sessionId (either existing or newly created)
      const resultSessionId = await addMessage(
        sessionIdToUse,
        'assistant',
        content,
        undefined, // attachments
        undefined, // usage
        undefined, // finishReason
        undefined, // metadata
        undefined, // todoSnapshot
        provider,
        model
      );

      // Store the session ID for future messages
      if (!commandSessionRef.current) {
        commandSessionRef.current = resultSessionId;
      }
    },

    triggerAIResponse: async (
      message: string,
      attachments?: Array<{ path: string; relativePath: string; size?: number }>
    ) => {
      // Clear input
      setInput('');
      // Call the shared helper
      await sendUserMessageToAI(message, attachments);
    },

    waitForInput: (options) => {
      return new Promise((resolve) => {
        addLog(`[waitForInput] Waiting for ${options.type} input`);

        // Both text and selection use pendingInput for now
        // The Chat component handles rendering based on input type
        inputResolver.current = resolve;
        setPendingInput(options);
      });
    },

    setInputComponent: (component, title) => setInputComponent(component, title),
    saveConfig: (config) => saveConfig(config),
    getCommands: () => getCommands(),
    addLog: (message) => addLog(message),
  };
}
