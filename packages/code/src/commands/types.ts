/**
 * Command Types
 * Shared types for command system
 */

import type { ReactNode } from 'react';
import type { Session } from '@sylphx/code-client';
import type { AIConfig, ProviderId } from '@sylphx/code-core';

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
 *
 * ARCHITECTURE:
 * - Commands should directly use useAppStore for most operations
 * - CommandContext only provides UI-specific operations that need React context
 * - For store operations: import { useAppStore } from '@sylphx/code-client'
 */
export interface CommandContext {
  // Command arguments
  args: string[];

  // UI INTERACTION (needs React context)
  // Wait for user input (text or selection)
  waitForInput: (
    options: WaitForInputOptions
  ) => Promise<string | Record<string, string | string[]>>;

  // Replace input area with custom component
  setInputComponent: (component: ReactNode | null, title?: string) => void;

  // SPECIAL OPERATIONS (complex logic or file system)
  // Send message as assistant (wraps complex logic)
  sendMessage: (content: string) => void;

  // Send user message and trigger AI response
  triggerAIResponse: (
    message: string,
    attachments?: Array<{ path: string; relativePath: string; size?: number }>
  ) => Promise<void>;

  // Save config to file system (uses tRPC)
  saveConfig: (config: AIConfig) => Promise<void>;

  // CONVENIENCE (available from store but commonly used)
  // Get all commands (not in store)
  getCommands: () => Command[];

  // Add debug log (same as useAppStore.getState().addLog)
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
  execute: (context: CommandContext) => Promise<void>;
}
