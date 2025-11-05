/**
 * Command Types
 * Shared types for command system (used by hooks)
 */

import type { Session } from '../stores/app-store.js';
import type { AIConfig, ProviderId } from '@sylphx/code-core';

/**
 * Option for selection
 */
export interface SelectOption {
  label: string;
  value?: string;
  freeText?: boolean;
  placeholder?: string;
  checked?: boolean;
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
  multiSelect?: boolean;
  preSelected?: string[];
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
      questions: Question[];
    };

/**
 * Command execution context
 */
export interface CommandContext {
  args: string[];
  sendMessage: (content: string) => Promise<void>;
  triggerAIResponse: (
    message: string,
    attachments?: Array<{ path: string; relativePath: string; size?: number }>
  ) => Promise<void>;
  waitForInput: (
    options: WaitForInputOptions
  ) => Promise<string | Record<string, string | string[]>>;
  getConfig: () => AIConfig | null;
  saveConfig: (config: AIConfig) => Promise<void>;
  getCurrentSession: () => Session | undefined;
  updateProvider: (provider: ProviderId, data: { apiKey?: string; defaultModel?: string }) => void;
  setAIConfig: (config: AIConfig) => void;
  updateSessionModel: (sessionId: string, model: string) => Promise<void>;
  updateSessionProvider: (sessionId: string, provider: ProviderId, model: string) => Promise<void>;
  setSelectedProvider: (provider: ProviderId | null) => void;
  setSelectedModel: (model: string | null) => void;
  createSession: (provider: ProviderId, model: string) => Promise<string>;
  setCurrentSession: (sessionId: string | null) => Promise<void>;
  getCurrentSessionId: () => string | null;
}

/**
 * Command definition
 */
export interface Command {
  id: string;
  label: string;
  description: string;
  args?: CommandArg[];
  execute: (context: CommandContext) => Promise<string | void> | string | void;
}
