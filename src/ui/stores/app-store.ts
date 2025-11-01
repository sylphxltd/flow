/**
 * Global App Store
 * Centralized state management for the entire TUI
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AIConfig, ProviderId } from '../../config/ai-config.js';

export type Screen = 'main-menu' | 'provider-management' | 'model-selection' | 'chat' | 'command-palette' | 'logs';

export type MessagePart =
  | { type: 'text'; content: string }
  | { type: 'tool'; name: string; status: 'running' | 'completed' | 'failed'; duration?: number; args?: unknown; result?: unknown };

export interface Session {
  id: string;
  provider: ProviderId;
  model: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    parts?: MessagePart[];
  }>;
  createdAt: number;
}

export interface AppState {
  // Navigation
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;

  // AI Configuration
  aiConfig: AIConfig | null;
  setAIConfig: (config: AIConfig) => void;
  updateProvider: (provider: ProviderId, data: { apiKey?: string; defaultModel?: string }) => void;
  removeProvider: (provider: ProviderId) => void;

  // Model Selection
  selectedProvider: ProviderId | null;
  selectedModel: string | null;
  setSelectedProvider: (provider: ProviderId | null) => void;
  setSelectedModel: (model: string | null) => void;

  // Chat Sessions
  sessions: Session[];
  currentSessionId: string | null;
  createSession: (provider: ProviderId, model: string) => string;
  updateSessionModel: (sessionId: string, model: string) => void;
  updateSessionProvider: (sessionId: string, provider: ProviderId, model: string) => void;
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string, parts?: MessagePart[]) => void;
  setCurrentSession: (sessionId: string | null) => void;
  deleteSession: (sessionId: string) => void;

  // UI State
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Debug Logs
  debugLogs: string[];
  addDebugLog: (message: string) => void;
  clearDebugLogs: () => void;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    // Navigation
    currentScreen: 'chat',
    navigateTo: (screen) =>
      set((state) => {
        state.currentScreen = screen;
      }),

    // AI Configuration
    aiConfig: null,
    setAIConfig: (config) =>
      set((state) => {
        state.aiConfig = config;
      }),
    updateProvider: (provider, data) =>
      set((state) => {
        if (!state.aiConfig) {
          state.aiConfig = { providers: {} };
        }
        if (!state.aiConfig.providers) {
          state.aiConfig.providers = {};
        }
        state.aiConfig.providers[provider] = {
          ...state.aiConfig.providers[provider],
          ...data,
        };
      }),
    removeProvider: (provider) =>
      set((state) => {
        if (state.aiConfig?.providers) {
          delete state.aiConfig.providers[provider];
        }
        if (state.aiConfig?.defaultProvider === provider) {
          state.aiConfig.defaultProvider = undefined;
          state.aiConfig.defaultModel = undefined;
        }
      }),

    // Model Selection
    selectedProvider: null,
    selectedModel: null,
    setSelectedProvider: (provider) =>
      set((state) => {
        state.selectedProvider = provider;
      }),
    setSelectedModel: (model) =>
      set((state) => {
        state.selectedModel = model;
      }),

    // Chat Sessions
    sessions: [],
    currentSessionId: null,
    createSession: (provider, model) => {
      const sessionId = `session-${Date.now()}`;
      set((state) => {
        state.sessions.push({
          id: sessionId,
          provider,
          model,
          messages: [],
          createdAt: Date.now(),
        });
        state.currentSessionId = sessionId;
      });
      return sessionId;
    },
    updateSessionModel: (sessionId, model) =>
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.model = model;
        }
      }),
    updateSessionProvider: (sessionId, provider, model) =>
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.provider = provider;
          session.model = model;
        }
      }),
    addMessage: (sessionId, role, content, parts) =>
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.messages.push({
            role,
            content,
            timestamp: Date.now(),
            parts,
          });
        }
      }),
    setCurrentSession: (sessionId) =>
      set((state) => {
        state.currentSessionId = sessionId;
      }),
    deleteSession: (sessionId) =>
      set((state) => {
        state.sessions = state.sessions.filter((s) => s.id !== sessionId);
        if (state.currentSessionId === sessionId) {
          state.currentSessionId = null;
        }
      }),

    // UI State
    isLoading: false,
    error: null,
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),
    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    // Debug Logs
    debugLogs: [],
    addDebugLog: (message) =>
      set((state) => {
        const timestamp = new Date().toLocaleTimeString();
        state.debugLogs.push(`[${timestamp}] ${message}`);
      }),
    clearDebugLogs: () =>
      set((state) => {
        state.debugLogs = [];
      }),
  }))
);
