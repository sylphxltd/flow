/**
 * Global App Store
 * Centralized state management for the entire TUI
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AIConfig, ProviderId } from '../../config/ai-config.js';
import type { Session, MessagePart, FileAttachment, TokenUsage } from '../../types/session.types.js';
import type { Todo, TodoUpdate } from '../../types/todo.types.js';
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
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: MessagePart[], attachments?: FileAttachment[], usage?: TokenUsage, finishReason?: string) => void;
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
  nextTodoId: number;
  updateTodos: (updates: TodoUpdate[]) => void;
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
    addMessage: (sessionId, role, content, attachments, usage, finishReason) =>
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.messages.push({
            role,
            content,
            timestamp: Date.now(),
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
    nextTodoId: 1,
    updateTodos: (updates) =>
      set((state) => {
        for (const update of updates) {
          if (update.id === undefined || update.id === null) {
            // Add new todo
            const newId = state.nextTodoId;
            const maxOrdering = state.todos.length > 0
              ? Math.max(...state.todos.map((t) => t.ordering))
              : 0;

            state.todos.push({
              id: newId,
              content: update.content || '',
              activeForm: update.activeForm || '',
              status: update.status || 'pending',
              ordering: maxOrdering + 10,
            });
            state.nextTodoId = newId + 1;
          } else {
            // Update existing todo
            const todo = state.todos.find((t) => t.id === update.id);
            if (!todo) continue;

            // Update fields
            if (update.content !== undefined) todo.content = update.content;
            if (update.activeForm !== undefined) todo.activeForm = update.activeForm;
            if (update.status !== undefined) todo.status = update.status;

            // Handle reordering
            if (update.reorder) {
              const { type, id: targetId } = update.reorder;

              if (type === 'top') {
                const minOrdering = Math.min(...state.todos.map((t) => t.ordering));
                todo.ordering = minOrdering - 10;
              } else if (type === 'last') {
                const maxOrdering = Math.max(...state.todos.map((t) => t.ordering));
                todo.ordering = maxOrdering + 10;
              } else if (type === 'before' && targetId !== undefined) {
                const target = state.todos.find((t) => t.id === targetId);
                if (target) {
                  // Find the todo before target (lower ordering, shows earlier)
                  const sorted = [...state.todos].sort((a, b) => a.ordering - b.ordering || a.id - b.id);
                  const targetIdx = sorted.findIndex((t) => t.id === targetId);
                  const before = targetIdx > 0 ? sorted[targetIdx - 1] : null;

                  if (before) {
                    // Insert between before and target
                    todo.ordering = Math.floor((before.ordering + target.ordering) / 2);
                  } else {
                    // Target is first, put this todo before it
                    todo.ordering = target.ordering - 10;
                  }
                }
              } else if (type === 'after' && targetId !== undefined) {
                const target = state.todos.find((t) => t.id === targetId);
                if (target) {
                  // Find the todo after target (higher ordering, shows later)
                  const sorted = [...state.todos].sort((a, b) => a.ordering - b.ordering || a.id - b.id);
                  const targetIdx = sorted.findIndex((t) => t.id === targetId);
                  const after = targetIdx < sorted.length - 1 ? sorted[targetIdx + 1] : null;

                  if (after) {
                    // Insert between target and after
                    todo.ordering = Math.floor((target.ordering + after.ordering) / 2);
                  } else {
                    // Target is last, put this todo after it
                    todo.ordering = target.ordering + 10;
                  }
                }
              }
            }
          }
        }
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
