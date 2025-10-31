/**
 * Global App Store
 * Centralized state management for the entire TUI
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AIConfig, ProviderId } from '../../config/ai-config.js';

export type Screen = 'main-menu' | 'provider-management' | 'model-selection' | 'chat';

export interface Session {
  id: string;
  provider: ProviderId;
  model: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
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
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string) => void;
  setCurrentSession: (sessionId: string | null) => void;
  deleteSession: (sessionId: string) => void;

  // UI State
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    // Navigation
    currentScreen: 'main-menu',
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
    addMessage: (sessionId, role, content) =>
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.messages.push({
            role,
            content,
            timestamp: Date.now(),
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
  }))
);
