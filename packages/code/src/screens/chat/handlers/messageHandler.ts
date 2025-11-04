/**
 * Message Handler Factory
 * Creates handleSubmit callback for message submission
 */

import type { CommandContext } from '../../../commands/types.js';
import type { FileAttachment } from '../../../../types/session.types.js';

/**
 * Parameters needed to create handleSubmit
 */
export interface MessageHandlerParams {
  // State
  isStreaming: boolean;

  // Store methods
  createSession: (provider: ProviderId, model: string) => string;
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string, attachments?: any[]) => void;

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
  inputResolver: React.MutableRefObject<((value: string | Record<string, string | string[]>) => void) | null>;
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

/**
 * Type imports needed for parameters
 */
import type { WaitForInputOptions } from '../../../commands/types.js';
import type { Command } from '../../../commands/types.js';
import type { ProviderId } from '../../../../config/ai-config.js';

/**
 * Create handleSubmit callback for message submission
 *
 * Factory function that creates the handleSubmit callback.
 * Extracted from Chat.tsx to improve modularity and testability.
 */
export function createHandleSubmit(params: MessageHandlerParams) {
  const {
    isStreaming,
    createSession,
    addMessage,
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
      if (!commandSessionRef.current) {
        commandSessionRef.current = currentSessionId || createSession('openrouter', 'anthropic/claude-3.5-sonnet');
      }
      addMessage(commandSessionRef.current, 'user', value.trim());

      inputResolver.current(value.trim());
      inputResolver.current = null;
      setPendingInput(null);
      setInput('');
      return;
    }

    // If we're in command mode with active autocomplete, don't handle here
    // Let useInput handle the autocomplete selection
    if (value.startsWith('/') && filteredCommands.length > 0) {
      addLog(`[handleSubmit] Skipping, autocomplete active (${filteredCommands.length} suggestions)`);
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
        if (!commandSessionRef.current) {
          commandSessionRef.current = currentSessionId || createSession('openrouter', 'anthropic/claude-3.5-sonnet');
        }
        addMessage(commandSessionRef.current, 'user', userMessage);
        addMessage(commandSessionRef.current, 'assistant', `Unknown command: ${commandName}. Type /help for available commands.`);
        return;
      }

      // Clear input immediately
      setInput('');

      // Add user command to conversation
      if (!commandSessionRef.current) {
        commandSessionRef.current = currentSessionId || createSession('openrouter', 'anthropic/claude-3.5-sonnet');
      }
      addMessage(commandSessionRef.current, 'user', userMessage);

      // Execute command - let command handle interaction via CommandContext
      try {
        await command.execute(createCommandContext(args));
      } catch (error) {
        addMessage(commandSessionRef.current, 'assistant', `Error: ${error instanceof Error ? error.message : 'Command failed'}`);
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
    setMessageHistory(prev => {
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
