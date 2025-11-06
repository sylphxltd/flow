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
 */
export interface CommandContextParams {
  // Zustand store methods (async ones return Promises)
  createSession: (provider: ProviderId, model: string) => Promise<string>;
  updateProvider: (provider: ProviderId, data: { apiKey?: string; defaultModel?: string }) => void;
  setAIConfig: (config: AIConfig) => void;
  updateSessionModel: (sessionId: string, model: string) => Promise<void>;
  updateSessionProvider: (sessionId: string, provider: ProviderId, model: string) => Promise<void>;
  setSelectedProvider: (provider: ProviderId | null) => void;
  setSelectedModel: (model: string | null) => void;
  navigateTo: (
    screen:
      | 'main-menu'
      | 'provider-management'
      | 'model-selection'
      | 'chat'
      | 'command-palette'
      | 'logs'
  ) => void;
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
  updateNotificationSettings: (
    settings: Partial<{ osNotifications: boolean; terminalNotifications: boolean; sound: boolean }>
  ) => void;

  // Store getters (use getState() to avoid reactivity)
  getAIConfig: () => AIConfig | null;
  getSessions: () => Promise<Session[]>;
  getCurrentSessionId: () => string | null;
  setCurrentSession: (sessionId: string | null) => Promise<void>;
  getNotificationSettings: () => {
    osNotifications: boolean;
    terminalNotifications: boolean;
    sound: boolean;
  };

  // Hook methods
  saveConfig: (config: AIConfig) => Promise<void>;
  getCurrentSession: () => Session | undefined;
  sendUserMessageToAI: (
    message: string,
    attachments?: Array<{ path: string; relativePath: string; size?: number }>
  ) => Promise<void>;

  // UI state setters
  setInput: (value: string) => void;
  setPendingInput: (options: WaitForInputOptions | null) => void;
  setMultiSelectionPage: (page: number) => void;
  setMultiSelectionAnswers: (answers: Record<string, string | string[]>) => void;
  setMultiSelectChoices: (choices: Set<string>) => void;
  setSelectedCommandIndex: (index: number) => void;
  setSelectionFilter: (filter: string) => void;
  setIsFilterMode: (isFilterMode: boolean) => void;
  setInputComponent: (component: ReactNode | null, title?: string) => void;

  // Refs
  inputResolver: React.MutableRefObject<
    ((value: string | Record<string, string | string[]>) => void) | null
  >;
  commandSessionRef: React.MutableRefObject<string | null>;

  // State
  currentSessionId: string | null;

  // Helper functions
  addLog: (message: string) => void;

  // Commands
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
    createSession,
    updateProvider,
    setAIConfig,
    updateSessionModel,
    updateSessionProvider,
    setSelectedProvider,
    setSelectedModel,
    navigateTo,
    addMessage,
    updateNotificationSettings,
    getAIConfig,
    getSessions,
    getCurrentSessionId,
    setCurrentSession,
    getNotificationSettings,
    saveConfig,
    getCurrentSession,
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
    currentSessionId,
    addLog,
    getCommands,
  } = params;

  return {
    args,

    sendMessage: async (content: string) => {
      // Get AI config to determine provider/model
      const aiConfig = getAIConfig();
      const provider = (aiConfig?.defaultProvider || 'openrouter') as ProviderId;
      const model = aiConfig?.defaultModel || 'anthropic/claude-3.5-sonnet';

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

    getConfig: () => getAIConfig(),
    saveConfig: (config) => saveConfig(config),
    getCurrentSession: () => getCurrentSession(),
    updateProvider: (provider, data) => updateProvider(provider, data),
    setAIConfig: (config) => setAIConfig(config),
    updateSessionModel: (sessionId, model) => updateSessionModel(sessionId, model),
    updateSessionProvider: (sessionId, provider, model) =>
      updateSessionProvider(sessionId, provider, model),
    setUISelectedProvider: (provider) => setSelectedProvider(provider),
    setUISelectedModel: (model) => setSelectedModel(model),
    createSession: (provider, model) => createSession(provider, model),
    getSessions: () => getSessions(),
    getCurrentSessionId: () => getCurrentSessionId(),
    setCurrentSession: (sessionId) => setCurrentSession(sessionId),
    navigateTo: (screen) => navigateTo(screen),
    addLog: (message) => addLog(message),
    notificationSettings: getNotificationSettings(),
    updateNotificationSettings: (settings) => updateNotificationSettings(settings),
    updateOutput: (content) => addLog(content),
    getCommands: () => getCommands(),
    setInputComponent: (component, title) => setInputComponent(component, title),
  };
}
