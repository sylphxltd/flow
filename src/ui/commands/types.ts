/**
 * Command Types
 * Shared types for command system
 */

import type { AIConfig, ProviderId } from '../../config/ai-config.js';
import type { Session } from '../stores/app-store.js';

/**
 * Option for selection
 */
export interface SelectOption {
  label: string;
  value?: string;
}

/**
 * Command argument definition
 */
export interface CommandArg {
  name: string;
  description: string;
  required?: boolean;
  loadOptions?: (previousArgs: string[], context?: CommandContext) => Promise<SelectOption[]>;
}

/**
 * Question for selection
 */
export interface Question {
  id: string;
  question: string;
  options: SelectOption[];
}

/**
 * Input options for waitForInput
 */
export type WaitForInputOptions =
  | {
      type: 'text';
      prompt?: string;
      placeholder?: string;
    }
  | {
      type: 'selection';
      // Questions array - can be 1 question (single selection) or multiple (multi-selection)
      // Asking 1 question or 10 questions should use the same interface
      questions: Question[];
    };

/**
 * Command execution context
 * Provides methods for commands to interact with the system
 */
export interface CommandContext {
  // Arguments passed to command
  args: string[];

  // Send message to chat (like AI response)
  sendMessage: (content: string) => void;

  // Wait for user input (text or selection)
  // Returns: string for text, Record<string, string> for selection (question id -> answer id)
  // Note: selection with 1 question and 10 questions use the same interface
  waitForInput: (options: WaitForInputOptions) => Promise<string | Record<string, string>>;

  // Get current AI config
  getConfig: () => AIConfig | null;

  // Save AI config
  saveConfig: (config: AIConfig) => Promise<void>;

  // Get current session
  getCurrentSession: () => Session | undefined;

  // Update provider settings
  updateProvider: (provider: ProviderId, data: { apiKey?: string; defaultModel?: string }) => void;

  // Set AI config
  setAIConfig: (config: AIConfig) => void;

  // Update session model (preserve history)
  updateSessionModel: (sessionId: string, model: string) => void;

  // Update session provider and model (preserve history)
  updateSessionProvider: (sessionId: string, provider: ProviderId, model: string) => void;

  // Create new session
  createSession: (provider: ProviderId, model: string) => string;

  // Get all sessions
  getSessions: () => Session[];

  // Get current session ID
  getCurrentSessionId: () => string | null;

  // Set current session
  setCurrentSession: (sessionId: string | null) => void;

  // Navigate to different screen
  navigateTo: (screen: 'main-menu' | 'provider-management' | 'model-selection' | 'chat' | 'command-palette' | 'logs') => void;

  // Add debug log
  addLog: (message: string) => void;
}

/**
 * Command definition
 */
export interface Command {
  id: string;
  label: string;
  description: string;
  args?: CommandArg[];
  execute: (context: CommandContext) => Promise<string>;
}
