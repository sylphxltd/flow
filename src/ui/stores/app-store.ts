/**
 * Global App Store V2
 * Enterprise-grade state management with tRPC backend
 *
 * Architecture: On-Demand Loading + Optimistic Updates
 * =====================================================
 *
 * Key Changes from V1:
 * - NO sessions array in memory (huge memory savings!)
 * - Only currentSession cached in store
 * - All other sessions fetched on-demand via tRPC
 * - Optimistic updates to currentSession, immediate tRPC sync
 *
 * Performance Benefits:
 * - Memory: O(n) sessions → O(1) current session
 * - Startup: No loading all sessions, instant boot
 * - Scalability: Works with 10 or 10,000 sessions
 * - Network: Zero HTTP overhead (in-process tRPC)
 *
 * Example:
 * ```typescript
 * // V1 (inefficient): Load all sessions into memory
 * const sessions = useAppStore(state => state.sessions); // O(n) memory!
 *
 * // V2 (efficient): Fetch on-demand
 * const sessions = await trpc.session.getRecent({ limit: 20 });
 * const currentSession = useAppStore(state => state.currentSession); // O(1) memory!
 * ```
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AIConfig, ProviderId } from '../../config/ai-config.js';
import type { Session, MessagePart, FileAttachment, TokenUsage, MessageMetadata } from '../../types/session.types.js';
import type { Todo, TodoUpdate } from '../../types/todo.types.js';
import { getTRPCClient } from '../../server/trpc/client.js';

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

  // Chat Sessions (NEW: on-demand architecture)
  currentSessionId: string | null;
  currentSession: Session | null; // Only cache current session
  setCurrentSession: (sessionId: string | null) => Promise<void>;
  refreshCurrentSession: () => Promise<void>;

  // Session mutations (optimistic updates to currentSession + tRPC sync)
  createSession: (provider: ProviderId, model: string) => Promise<string>;
  updateSessionModel: (sessionId: string, model: string) => Promise<void>;
  updateSessionProvider: (sessionId: string, provider: ProviderId, model: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;

  // Message mutations
  addMessage: (
    sessionId: string,
    role: 'user' | 'assistant',
    content: string | MessagePart[],
    attachments?: FileAttachment[],
    usage?: TokenUsage,
    finishReason?: string,
    metadata?: MessageMetadata,
    todoSnapshot?: Todo[]
  ) => Promise<void>;

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
    autoGenerateTitle: boolean;
  };
  updateNotificationSettings: (settings: Partial<AppState['notificationSettings']>) => void;

  // Todo State
  updateTodos: (sessionId: string, updates: TodoUpdate[]) => Promise<void>;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector(
    immer((set, get) => ({
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

      // Chat Sessions (NEW: tRPC-backed)
      currentSessionId: null,
      currentSession: null,

      /**
       * Set current session and load it from database
       */
      setCurrentSession: async (sessionId) => {
        set((state) => {
          state.currentSessionId = sessionId;
          state.currentSession = null; // Clear immediately
        });

        if (!sessionId) {
          return;
        }

        // Fetch session from tRPC
        const client = await getTRPCClient();
        const session = await client.session.getById({ sessionId });

        set((state) => {
          state.currentSession = session;
        });
      },

      /**
       * Refresh current session from database
       */
      refreshCurrentSession: async () => {
        const { currentSessionId } = get();
        if (!currentSessionId) {
          return;
        }

        const client = await getTRPCClient();
        const session = await client.session.getById({ sessionId: currentSessionId });

        set((state) => {
          state.currentSession = session;
        });
      },

      /**
       * Create new session
       */
      createSession: async (provider, model) => {
        const client = await getTRPCClient();
        const session = await client.session.create({ provider, model });

        // Set as current session
        set((state) => {
          state.currentSessionId = session.id;
          state.currentSession = session;
        });

        return session.id;
      },

      /**
       * Update session model
       */
      updateSessionModel: async (sessionId, model) => {
        // Optimistic update if it's the current session
        if (get().currentSessionId === sessionId && get().currentSession) {
          set((state) => {
            if (state.currentSession) {
              state.currentSession.model = model;
            }
          });
        }

        // Sync to database via tRPC
        const client = await getTRPCClient();
        await client.session.updateModel({ sessionId, model });
      },

      /**
       * Update session provider
       */
      updateSessionProvider: async (sessionId, provider, model) => {
        // Optimistic update if it's the current session
        if (get().currentSessionId === sessionId && get().currentSession) {
          set((state) => {
            if (state.currentSession) {
              state.currentSession.provider = provider;
              state.currentSession.model = model;
            }
          });
        }

        // Sync to database via tRPC
        const client = await getTRPCClient();
        await client.session.updateProvider({ sessionId, provider, model });
      },

      /**
       * Update session title
       */
      updateSessionTitle: async (sessionId, title) => {
        // Optimistic update if it's the current session
        if (get().currentSessionId === sessionId && get().currentSession) {
          set((state) => {
            if (state.currentSession) {
              state.currentSession.title = title;
            }
          });
        }

        // Sync to database via tRPC
        const client = await getTRPCClient();
        await client.session.updateTitle({ sessionId, title });
      },

      /**
       * Delete session
       */
      deleteSession: async (sessionId) => {
        // Clear if it's the current session
        if (get().currentSessionId === sessionId) {
          set((state) => {
            state.currentSessionId = null;
            state.currentSession = null;
          });
        }

        // Delete from database via tRPC
        const client = await getTRPCClient();
        await client.session.delete({ sessionId });
      },

      /**
       * Add message to session
       */
      addMessage: async (sessionId, role, content, attachments, usage, finishReason, metadata, todoSnapshot) => {
        // Normalize content
        const normalizedContent: MessagePart[] =
          typeof content === 'string' ? [{ type: 'text', content }] : content;

        // Optimistic update if it's the current session
        if (get().currentSessionId === sessionId && get().currentSession) {
          set((state) => {
            if (state.currentSession) {
              state.currentSession.messages.push({
                role,
                content: normalizedContent,
                timestamp: Date.now(),
                status: 'completed',
                ...(attachments !== undefined && attachments.length > 0 && { attachments }),
                ...(usage !== undefined && { usage }),
                ...(finishReason !== undefined && { finishReason }),
                ...(metadata !== undefined && { metadata }),
                ...(todoSnapshot !== undefined && todoSnapshot.length > 0 && { todoSnapshot }),
              });
            }
          });
        }

        // Persist via tRPC
        const client = await getTRPCClient();
        await client.message.add({
          sessionId,
          role,
          content: normalizedContent,
          attachments,
          usage,
          finishReason,
          metadata,
          todoSnapshot,
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
          if (!process.env.DEBUG) {
            return;
          }

          const timestamp = new Date().toLocaleTimeString();
          state.debugLogs.push(`[${timestamp}] ${message}`);

          const MAX_LOGS = 1000;
          if (state.debugLogs.length > MAX_LOGS) {
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
        autoGenerateTitle: true,
      },
      updateNotificationSettings: (settings) =>
        set((state) => {
          state.notificationSettings = {
            ...state.notificationSettings,
            ...settings,
          };
        }),

      // Todo State
      updateTodos: async (sessionId, updates) => {
        const { currentSession } = get();

        // Optimistic update if it's the current session
        if (get().currentSessionId === sessionId && currentSession) {
          set((state) => {
            if (!state.currentSession) return;

            const session = state.currentSession;

            for (const update of updates) {
              if (update.id === undefined || update.id === null) {
                // Add new todo
                const newId = session.nextTodoId;
                const maxOrdering =
                  session.todos.length > 0 ? Math.max(...session.todos.map((t) => t.ordering)) : 0;

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
                      const sorted = [...session.todos].sort(
                        (a, b) => a.ordering - b.ordering || a.id - b.id
                      );
                      const targetIdx = sorted.findIndex((t) => t.id === targetId);
                      const before = targetIdx > 0 ? sorted[targetIdx - 1] : null;

                      if (before) {
                        todo.ordering = Math.floor((before.ordering + target.ordering) / 2);
                      } else {
                        todo.ordering = target.ordering - 10;
                      }
                    }
                  } else if (type === 'after' && targetId !== undefined) {
                    const target = session.todos.find((t) => t.id === targetId);
                    if (target) {
                      const sorted = [...session.todos].sort(
                        (a, b) => a.ordering - b.ordering || a.id - b.id
                      );
                      const targetIdx = sorted.findIndex((t) => t.id === targetId);
                      const after = targetIdx < sorted.length - 1 ? sorted[targetIdx + 1] : null;

                      if (after) {
                        todo.ordering = Math.floor((target.ordering + after.ordering) / 2);
                      } else {
                        todo.ordering = target.ordering + 10;
                      }
                    }
                  }
                }
              }
            }
          });
        }

        // Sync to database via tRPC
        // Need to get fresh copy after optimistic update
        const updatedSession = get().currentSession;
        if (updatedSession && updatedSession.id === sessionId) {
          const client = await getTRPCClient();
          await client.todo.update({
            sessionId,
            todos: updatedSession.todos,
            nextTodoId: updatedSession.nextTodoId,
          });
        }
      },
    }))
  )
);
