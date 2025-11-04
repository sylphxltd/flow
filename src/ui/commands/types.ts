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
  freeText?: boolean; // If true, user can input custom text instead of selecting
  placeholder?: string; // Placeholder text for free text input (e.g., "Enter custom option...")
  checked?: boolean; // Default checked state for multi-select (overrides Question.preSelected)
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
  multiSelect?: boolean; // If true, user can select multiple options (returns string[])
  preSelected?: string[]; // Pre-selected values for multi-select mode (option values)
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

  // Send user message and trigger AI response
  // Used for commands that want to continue the conversation (like compact)
  triggerAIResponse: (message: string, attachments?: Array<{ path: string; relativePath: string; size?: number }>) => Promise<void>;

  // Wait for user input (text or selection)
  // Returns: string for text, Record<string, string | string[]> for selection
  //   - Single-select: question id -> answer id (string)
  //   - Multi-select: question id -> answer ids (string[])
  // Note: selection with 1 question and 10 questions use the same interface
  waitForInput: (options: WaitForInputOptions) => Promise<string | Record<string, string | string[]>>;

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

  // Set UI selected provider and model (for UI state synchronization)
  setUISelectedProvider: (provider: ProviderId | null) => void;
  setUISelectedModel: (model: string | null) => void;

  // Get all available commands (for help command)
  getCommands: () => Command[];

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

  // Notification settings
  notificationSettings: {
    osNotifications: boolean;
    terminalNotifications: boolean;
    sound: boolean;
  };
  updateNotificationSettings: (settings: Partial<{ osNotifications: boolean; terminalNotifications: boolean; sound: boolean }>) => void;

  // Update output for commands that display information
  updateOutput: (content: string) => void;
}

/**
 * Command definition
 */
export interface Command {
  id: string;
  label: string;
  description: string;
  args?: CommandArg[];
  execute: (context: CommandContext) => Promise<void>;
}
