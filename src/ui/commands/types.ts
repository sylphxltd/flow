/**
 * Command Types
 * Shared types for command system
 */

import type { AIConfig, ProviderId } from '../../config/ai-config.js';
import type { Session } from '../stores/app-store.js';

/**
 * Command argument definition
 */
export interface CommandArg {
  name: string;
  description: string;
  required?: boolean;
  loadOptions?: () => Promise<Array<{ id: string; name: string }>>;
}

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
  waitForInput: (options: {
    type: 'text' | 'selection';
    prompt?: string;
    options?: Array<{ id: string; name: string }>;
    placeholder?: string;
  }) => Promise<string>;

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

  // Create new session
  createSession: (provider: ProviderId, model: string) => string;

  // Get all sessions
  getSessions: () => Session[];

  // Get current session ID
  getCurrentSessionId: () => string | null;

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
