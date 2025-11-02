/**
 * Global App Store
 * Centralized state management for the entire TUI
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AIConfig, ProviderId } from '../../config/ai-config.js';
import type { Session, MessagePart, FileAttachment, TokenUsage } from '../../types/session.types.js';
import type { Todo } from '../../types/todo.types.js';
import { saveSession as saveSessionToFile } from '../../utils/session-manager.js';

export type Screen = 'main-menu' | 'provider-management' | 'model-selection' | 'chat' | 'command-palette' | 'logs';
export type { Session, MessagePart } from '../../types/session.types.js';

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
  updateSessionTitle: (sessionId: string, title: string) => void;
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string, parts?: MessagePart[], attachments?: FileAttachment[], usage?: TokenUsage, finishReason?: string) => void;
  setCurrentSession: (sessionId: string | null) => void;
  deleteSession: (sessionId: string) => void;

  // UI State
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Agent State
  currentAgentId: string;
  setCurrentAgentId: (agentId: string) => void;

  // Rule State
  enabledRuleIds: string[];
  setEnabledRuleIds: (ruleIds: string[]) => void;

  // Debug Logs
  debugLogs: string[];
  addDebugLog: (message: string) => void;
  clearDebugLogs: () => void;

  // Todo State
  todos: Todo[];
  addTodo: (content: string) => string;
  updateTodo: (id: string, updates: Partial<Pick<Todo, 'content' | 'status'>>) => void;
  removeTodo: (id: string) => void;
  clearCompletedTodos: () => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector(
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
      const now = Date.now();
      set((state) => {
        state.sessions.push({
          id: sessionId,
          provider,
          model,
          messages: [],
          created: now,
          updated: now,
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
    updateSessionTitle: (sessionId, title) =>
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.title = title;
        }
      }),
    addMessage: (sessionId, role, content, parts, attachments, usage, finishReason) =>
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.messages.push({
            role,
            content,
            timestamp: Date.now(),
            ...(parts !== undefined && { parts }),
            ...(attachments !== undefined && attachments.length > 0 && { attachments }),
            ...(usage !== undefined && { usage }),
            ...(finishReason !== undefined && { finishReason }),
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

    // Agent State
    currentAgentId: 'coder',
    setCurrentAgentId: (agentId) =>
      set((state) => {
        state.currentAgentId = agentId;
      }),

    // Rule State
    enabledRuleIds: [],
    setEnabledRuleIds: (ruleIds) =>
      set((state) => {
        state.enabledRuleIds = ruleIds;
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

    // Todo State
    todos: [],
    addTodo: (content) => {
      const id = `todo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();
      set((state) => {
        state.todos.push({
          id,
          content,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        });
      });
      return id;
    },
    updateTodo: (id, updates) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          if (updates.content !== undefined) {
            todo.content = updates.content;
          }
          if (updates.status !== undefined) {
            todo.status = updates.status;
          }
          todo.updatedAt = Date.now();
        }
      }),
    removeTodo: (id) =>
      set((state) => {
        state.todos = state.todos.filter((t) => t.id !== id);
      }),
    clearCompletedTodos: () =>
      set((state) => {
        state.todos = state.todos.filter((t) => t.status !== 'completed');
      }),
    }))
  )
);

// Subscribe to sessions changes and persist to disk
useAppStore.subscribe(
  (state) => state.sessions,
  (sessions) => {
    // Save all sessions to disk whenever sessions array changes
    sessions.forEach(async (session) => {
      try {
        await saveSessionToFile(session);
      } catch (error) {
        console.error(`Failed to persist session ${session.id}:`, error);
      }
    });
  },
  { fireImmediately: false } // Don't fire on initialization
);
