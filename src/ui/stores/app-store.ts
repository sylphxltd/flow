/**
 * Global App Store
 * Centralized state management for the entire TUI
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AIConfig, ProviderId } from '../../config/ai-config.js';
import type { Session, MessagePart, FileAttachment, TokenUsage, MessageMetadata } from '../../types/session.types.js';
import type { Todo, TodoUpdate } from '../../types/todo.types.js';
import { getSessionRepository } from '../../db/database.js';

export type Screen = 'main-menu' | 'provider-management' | 'model-selection' | 'chat' | 'command-palette' | 'logs' | 'dashboard';
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
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string | MessagePart[], attachments?: FileAttachment[], usage?: TokenUsage, finishReason?: string, metadata?: MessageMetadata, todoSnapshot?: Todo[]) => void;
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

  // Notification Settings
  notificationSettings: {
    osNotifications: boolean;
    terminalNotifications: boolean;
    sound: boolean;
  };
  updateNotificationSettings: (settings: Partial<AppState['notificationSettings']>) => void;

  // Todo State (per-session, accessed via currentSession)
  updateTodos: (sessionId: string, updates: TodoUpdate[]) => void;
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

      // Update state immediately (optimistic update)
      set((state) => {
        state.sessions.push({
          id: sessionId,
          provider,
          model,
          messages: [],
          todos: [], // Initialize empty todos for this session
          nextTodoId: 1, // Start todo IDs from 1
          created: now,
          updated: now,
        });
        state.currentSessionId = sessionId;
      });

      // Create in database asynchronously with SAME ID (critical for consistency!)
      getSessionRepository().then((repo) => {
        repo.createSessionFromData({
          id: sessionId,
          provider,
          model,
          nextTodoId: 1,
          created: now,
          updated: now,
        }).catch((error) => {
          console.error('Failed to create session in database:', error);
        });
      });

      return sessionId;
    },
    updateSessionModel: (sessionId, model) => {
      // Update database asynchronously
      getSessionRepository().then((repo) => {
        repo.updateSessionModel(sessionId, model).catch((error) => {
          console.error('Failed to update session model in database:', error);
        });
      });

      // Update state immediately
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.model = model;
        }
      });
    },
    updateSessionProvider: (sessionId, provider, model) => {
      // Update database asynchronously
      getSessionRepository().then((repo) => {
        repo.updateSessionProvider(sessionId, provider, model).catch((error) => {
          console.error('Failed to update session provider in database:', error);
        });
      });

      // Update state immediately
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.provider = provider;
          session.model = model;
        }
      });
    },
    updateSessionTitle: (sessionId, title) => {
      // Update database asynchronously
      getSessionRepository().then((repo) => {
        repo.updateSessionTitle(sessionId, title).catch((error) => {
          console.error('Failed to update session title in database:', error);
        });
      });

      // Update state immediately
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.title = title;
        }
      });
    },
    addMessage: (sessionId, role, content, attachments, usage, finishReason, metadata, todoSnapshot) => {
      // Normalize content to MessagePart[] format
      const normalizedContent: MessagePart[] = typeof content === 'string'
        ? [{ type: 'text', content }]
        : content;

      // Add to database asynchronously
      getSessionRepository().then((repo) => {
        repo
          .addMessage(sessionId, role, normalizedContent, attachments, usage, finishReason, metadata, todoSnapshot)
          .catch((error) => {
            console.error('Failed to add message to database:', error);
          });
      });

      // Update state immediately (optimistic update)
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.messages.push({
            role,
            content: normalizedContent,
            timestamp: Date.now(),
            ...(attachments !== undefined && attachments.length > 0 && { attachments }),
            ...(usage !== undefined && { usage }),
            ...(finishReason !== undefined && { finishReason }),
            ...(metadata !== undefined && { metadata }),
            ...(todoSnapshot !== undefined && todoSnapshot.length > 0 && { todoSnapshot }),
          });
        }
      });
    },
    setCurrentSession: (sessionId) =>
      set((state) => {
        state.currentSessionId = sessionId;
      }),
    deleteSession: (sessionId) => {
      // Delete from database asynchronously
      getSessionRepository().then((repo) => {
        repo.deleteSession(sessionId).catch((error) => {
          console.error('Failed to delete session from database:', error);
        });
      });

      // Update state immediately (optimistic update)
      set((state) => {
        state.sessions = state.sessions.filter((s) => s.id !== sessionId);
        if (state.currentSessionId === sessionId) {
          state.currentSessionId = null;
        }
      });
    },

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
        // Only log in debug mode (controlled by DEBUG env var)
        // In production, this is a no-op to avoid performance overhead
        if (!process.env.DEBUG) {
          return;
        }

        const timestamp = new Date().toLocaleTimeString();
        state.debugLogs.push(`[${timestamp}] ${message}`);

        // Log rotation: keep max 1000 entries to prevent memory leak
        const MAX_LOGS = 1000;
        if (state.debugLogs.length > MAX_LOGS) {
          // Remove oldest half when limit reached
          state.debugLogs = state.debugLogs.slice(-MAX_LOGS / 2);
        }
      }),
    clearDebugLogs: () =>
      set((state) => {
        state.debugLogs = [];
      }),

    // Notification Settings
    notificationSettings: {
      osNotifications: true,
      terminalNotifications: true,
      sound: true,
    },
    updateNotificationSettings: (settings) =>
      set((state) => {
        state.notificationSettings = {
          ...state.notificationSettings,
          ...settings,
        };
      }),

    // Todo State (per-session)
    updateTodos: (sessionId, updates) =>
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (!session) return;

        for (const update of updates) {
          if (update.id === undefined || update.id === null) {
            // Add new todo
            const newId = session.nextTodoId;
            const maxOrdering = session.todos.length > 0
              ? Math.max(...session.todos.map((t) => t.ordering))
              : 0;

            session.todos.push({
              id: newId,
              content: update.content || '',
              activeForm: update.activeForm || '',
              status: update.status || 'pending',
              ordering: maxOrdering + 10,
            });
            session.nextTodoId = newId + 1;
          } else {
            // Update existing todo
            const todo = session.todos.find((t) => t.id === update.id);
            if (!todo) continue;

            // Update fields
            if (update.content !== undefined) todo.content = update.content;
            if (update.activeForm !== undefined) todo.activeForm = update.activeForm;
            if (update.status !== undefined) todo.status = update.status;

            // Handle reordering
            if (update.reorder) {
              const { type, id: targetId } = update.reorder;

              if (type === 'top') {
                const minOrdering = Math.min(...session.todos.map((t) => t.ordering));
                todo.ordering = minOrdering - 10;
              } else if (type === 'last') {
                const maxOrdering = Math.max(...session.todos.map((t) => t.ordering));
                todo.ordering = maxOrdering + 10;
              } else if (type === 'before' && targetId !== undefined) {
                const target = session.todos.find((t) => t.id === targetId);
                if (target) {
                  // Find the todo before target (lower ordering, shows earlier)
                  const sorted = [...session.todos].sort((a, b) => a.ordering - b.ordering || a.id - b.id);
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
                const target = session.todos.find((t) => t.id === targetId);
                if (target) {
                  // Find the todo after target (higher ordering, shows later)
                  const sorted = [...session.todos].sort((a, b) => a.ordering - b.ordering || a.id - b.id);
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

        // ⚠️ CRITICAL: Copy todos and nextTodoId BEFORE async database operation
        // Immer draft proxies are revoked after set() completes
        // Accessing session.todos after set() will throw "Proxy has been revoked"
        const todosCopy = JSON.parse(JSON.stringify(session.todos));
        const nextTodoIdCopy = session.nextTodoId;

        // Sync to database asynchronously after state update
        getSessionRepository().then((repo) => {
          repo.updateTodos(sessionId, todosCopy, nextTodoIdCopy).catch((error) => {
            console.error('Failed to update todos in database:', error);
          });
        });
      }),
    }))
  )
);

// Database persistence is now handled via optimistic updates in each action
// No need for separate subscription - each CRUD operation syncs to DB immediately
