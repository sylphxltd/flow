/**
 * Message Handler Factory
 * Creates handleSubmit callback for message submission
 */

import type { FileAttachment } from '../../../../types/session.types.js';
import type { CommandContext } from '../../../commands/types.js';

/**
 * Parameters needed to create handleSubmit
 */
export interface MessageHandlerParams {
  // State
  isStreaming: boolean;

  // Store methods
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
  getAIConfig: () => { defaultProvider?: string; defaultModel?: string } | null;

  // UI state
  pendingInput: WaitForInputOptions | null;
  filteredCommands: Command[];
  pendingAttachments: FileAttachment[];

  // UI state setters
  setHistoryIndex: (index: number) => void;
  setTempInput: (input: string) => void;
  setInput: (value: string) => void;
  setPendingInput: (options: WaitForInputOptions | null) => void;
  setPendingCommand: (command: { command: Command; currentInput: string } | null) => void;
  setMessageHistory: (updater: (prev: string[]) => string[]) => void;
  clearAttachments: () => void;

  // Refs
  inputResolver: React.MutableRefObject<
    ((value: string | Record<string, string | string[]>) => void) | null
  >;
  commandSessionRef: React.MutableRefObject<string | null>;
  skipNextSubmit: React.MutableRefObject<boolean>;

  // State
  currentSessionId: string | null;

  // Helper functions
  addLog: (message: string) => void;
  sendUserMessageToAI: (message: string, attachments?: FileAttachment[]) => Promise<void>;
  createCommandContext: (args: string[]) => CommandContext;

  // Commands
  getCommands: () => Command[];
}

import type { ProviderId } from '../../../../config/ai-config.js';
/**
 * Type imports needed for parameters
 */
import type { Command, WaitForInputOptions } from '../../../commands/types.js';

/**
 * Create handleSubmit callback for message submission
 *
 * Factory function that creates the handleSubmit callback.
 * Extracted from Chat.tsx to improve modularity and testability.
 */
export function createHandleSubmit(params: MessageHandlerParams) {
  const {
    isStreaming,
    addMessage,
    getAIConfig,
    pendingInput,
    filteredCommands,
    pendingAttachments,
    setHistoryIndex,
    setTempInput,
    setInput,
    setPendingInput,
    setPendingCommand,
    setMessageHistory,
    clearAttachments,
    inputResolver,
    commandSessionRef,
    skipNextSubmit,
    currentSessionId,
    addLog,
    sendUserMessageToAI,
    createCommandContext,
    getCommands,
  } = params;

  return async (value: string) => {
    if (!value.trim()) return;

    // Reset history browsing state
    // (messageHistory will auto-update from sessions after message is added)
    setHistoryIndex(-1);
    setTempInput('');

    // If already streaming, ignore submit (don't start new stream)
    if (isStreaming) {
      return;
    }

    // Handle pendingInput for text type
    if (pendingInput && pendingInput.type === 'text' && inputResolver.current) {
      addLog(`[handleSubmit] Resolving text input: ${value}`);

      // Add user's text input to chat history
      const aiConfig = getAIConfig();
      const provider = (aiConfig?.defaultProvider || 'openrouter') as ProviderId;
      const model = aiConfig?.defaultModel || 'anthropic/claude-3.5-sonnet';

      const sessionIdToUse = commandSessionRef.current || currentSessionId;
      const resultSessionId = await addMessage(
        sessionIdToUse,
        'user',
        value.trim(),
        undefined, // attachments
        undefined, // usage
        undefined, // finishReason
        undefined, // metadata
        undefined, // todoSnapshot
        provider,
        model
      );

      // Store session ID if created
      if (!commandSessionRef.current) {
        commandSessionRef.current = resultSessionId;
      }

      inputResolver.current(value.trim());
      inputResolver.current = null;
      setPendingInput(null);
      setInput('');
      return;
    }

    // If we're in command mode with active autocomplete, don't handle here
    // Let useInput handle the autocomplete selection
    if (value.startsWith('/') && filteredCommands.length > 0) {
      addLog(
        `[handleSubmit] Skipping, autocomplete active (${filteredCommands.length} suggestions)`
      );
      return;
    }

    // Skip if we just handled this in autocomplete (prevent double execution)
    if (skipNextSubmit.current) {
      addLog(`[handleSubmit] Skipping due to skipNextSubmit flag: ${value}`);
      skipNextSubmit.current = false;
      return;
    }

    addLog(`[handleSubmit] Processing: ${value}`);
    const userMessage = value.trim();

    // Check if it's a command
    if (userMessage.startsWith('/')) {
      const parts = userMessage.split(' ');
      const commandName = parts[0];
      const args = parts.slice(1);

      // Find matching command
      const commands = getCommands();
      const command = commands.find((cmd) => cmd.label === commandName);

      if (!command) {
        // Unknown command - add to conversation
        setInput('');

        const aiConfig = getAIConfig();
        const provider = (aiConfig?.defaultProvider || 'openrouter') as ProviderId;
        const model = aiConfig?.defaultModel || 'anthropic/claude-3.5-sonnet';

        const sessionIdToUse = commandSessionRef.current || currentSessionId;
        const resultSessionId = await addMessage(
          sessionIdToUse,
          'user',
          userMessage,
          undefined, undefined, undefined, undefined, undefined,
          provider,
          model
        );

        if (!commandSessionRef.current) {
          commandSessionRef.current = resultSessionId;
        }

        await addMessage(
          commandSessionRef.current,
          'assistant',
          `Unknown command: ${commandName}. Type /help for available commands.`,
          undefined, undefined, undefined, undefined, undefined,
          provider,
          model
        );
        return;
      }

      // Clear input immediately
      setInput('');

      // Add user command to conversation
      const aiConfig = getAIConfig();
      const provider = (aiConfig?.defaultProvider || 'openrouter') as ProviderId;
      const model = aiConfig?.defaultModel || 'anthropic/claude-3.5-sonnet';

      const sessionIdToUse = commandSessionRef.current || currentSessionId;
      const resultSessionId = await addMessage(
        sessionIdToUse,
        'user',
        userMessage,
        undefined, undefined, undefined, undefined, undefined,
        provider,
        model
      );

      if (!commandSessionRef.current) {
        commandSessionRef.current = resultSessionId;
      }

      // Execute command - command has full control via CommandContext
      try {
        const result = await command.execute(createCommandContext(args));

        // If command returns a result string, add it to conversation
        if (result && typeof result === 'string' && commandSessionRef.current) {
          await addMessage(
            commandSessionRef.current,
            'assistant',
            result
          );
        }
      } catch (error) {
        if (commandSessionRef.current) {
          await addMessage(
            commandSessionRef.current,
            'assistant',
            `Error: ${error instanceof Error ? error.message : 'Command failed'}`
          );
        }
      }

      setPendingCommand(null);
      return;
    }

    // For regular messages, clear input after getting the value
    setInput('');

    // Get attachments for this message
    const attachmentsForMessage: FileAttachment[] = [...pendingAttachments];

    // Clear pending attachments after capturing them
    clearAttachments();

    // Regular message - send to AI using shared helper
    await sendUserMessageToAI(userMessage, attachmentsForMessage);

    // Add to message history (append since we store oldest-first)
    setMessageHistory((prev) => {
      // Don't add if it's the same as the last entry (most recent)
      if (prev.length > 0 && prev[prev.length - 1] === userMessage) {
        return prev;
      }
      // Append new message and keep last 100
      const newHistory = [...prev, userMessage];
      if (newHistory.length > 100) {
        return newHistory.slice(-100); // Keep most recent 100
      }
      return newHistory;
    });
  };
}
