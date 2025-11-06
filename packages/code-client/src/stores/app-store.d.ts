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
import type { AIConfig, ProviderId } from '@sylphx/code-core';
import type { Session, MessagePart, FileAttachment, TokenUsage, MessageMetadata } from '@sylphx/code-core';
import type { Todo, TodoUpdate } from '@sylphx/code-core';
export type Screen = 'main-menu' | 'provider-management' | 'model-selection' | 'chat' | 'command-palette' | 'logs' | 'dashboard';
export type { Session, MessagePart } from '@sylphx/code-core';
export interface AppState {
    currentScreen: Screen;
    navigateTo: (screen: Screen) => void;
    aiConfig: AIConfig | null;
    setAIConfig: (config: AIConfig) => void;
    updateProvider: (provider: ProviderId, data: {
        apiKey?: string;
        defaultModel?: string;
    }) => void;
    removeProvider: (provider: ProviderId) => void;
    selectedProvider: ProviderId | null;
    selectedModel: string | null;
    setSelectedProvider: (provider: ProviderId | null) => void;
    setSelectedModel: (model: string | null) => void;
    currentSessionId: string | null;
    currentSession: Session | null;
    setCurrentSession: (sessionId: string | null) => Promise<void>;
    refreshCurrentSession: () => Promise<void>;
    createSession: (provider: ProviderId, model: string) => Promise<string>;
    updateSessionModel: (sessionId: string, model: string) => Promise<void>;
    updateSessionProvider: (sessionId: string, provider: ProviderId, model: string) => Promise<void>;
    updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
    updateSessionRules: (sessionId: string, enabledRuleIds: string[]) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    addMessage: (sessionId: string | null, // null = create new session
    role: 'user' | 'assistant', content: string | MessagePart[], attachments?: FileAttachment[], usage?: TokenUsage, finishReason?: string, metadata?: MessageMetadata, todoSnapshot?: Todo[], provider?: ProviderId, // Required if sessionId is null
    model?: string) => Promise<string>;
    isLoading: boolean;
    error: string | null;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    selectedAgentId: string;
    setSelectedAgent: (agentId: string) => Promise<void>;
    enabledRuleIds: string[];
    setEnabledRuleIds: (ruleIds: string[]) => Promise<void>;
    debugLogs: string[];
    addDebugLog: (message: string) => void;
    clearDebugLogs: () => void;
    notificationSettings: {
        osNotifications: boolean;
        terminalNotifications: boolean;
        sound: boolean;
        autoGenerateTitle: boolean;
    };
    updateNotificationSettings: (settings: Partial<AppState['notificationSettings']>) => void;
    updateTodos: (sessionId: string, updates: TodoUpdate[]) => Promise<void>;
}
export declare const useAppStore: import("zustand").UseBoundStore<Omit<Omit<import("zustand").StoreApi<AppState>, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: AppState, previousSelectedState: AppState) => void): () => void;
        <U>(selector: (state: AppState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: ((a: U, b: U) => boolean) | undefined;
            fireImmediately?: boolean;
        } | undefined): () => void;
    };
}, "setState"> & {
    setState(nextStateOrUpdater: AppState | Partial<AppState> | ((state: import("immer").WritableDraft<AppState>) => void), shouldReplace?: false): void;
    setState(nextStateOrUpdater: AppState | ((state: import("immer").WritableDraft<AppState>) => void), shouldReplace: true): void;
}>;
//# sourceMappingURL=app-store.d.ts.map