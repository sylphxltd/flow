/**
 * @sylphx/code-client
 * Shared React code for Web and TUI clients
 *
 * This package provides:
 * - State management (Zustand stores)
 * - React hooks for common operations
 * - Utility functions
 * - Shared types
 */
export { TRPCProvider, useTRPCClient, type TRPCProviderProps, createInProcessClient, createHTTPClient, type TypedTRPCClient, getTRPCClient, } from './trpc-provider.js';
export { inProcessLink, type InProcessLinkOptions } from './trpc-links/index.js';
export { useAppStore, type AppState, type Screen } from './stores/app-store.js';
export type { Session, MessagePart } from '@sylphx/code-core';
export type { AppRouter } from '@sylphx/code-server';
export type { Command, CommandArg, CommandContext, SelectOption, Question, WaitForInputOptions, } from './types/command-types.js';
export { useAIConfig } from './hooks/useAIConfig.js';
export { useAskToolHandler } from './hooks/useAskToolHandler.js';
export { useChat } from './hooks/useChat.js';
export { useElapsedTime } from './hooks/useElapsedTime.js';
export { useFileAttachments } from './hooks/useFileAttachments.js';
export { useKeyboard } from './hooks/useKeyboard.js';
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
export { useModelDetails } from './hooks/useModelDetails.js';
export { useModels } from './hooks/useModels.js';
export { useMouse } from './hooks/useMouse.js';
export { useProjectFiles } from './hooks/useProjectFiles.js';
export { useProviders } from './hooks/useProviders.js';
export { useSessionInitialization } from './hooks/useSessionInitialization.js';
export { useSessionPersistence } from './hooks/useSessionPersistence.js';
export { useTokenCalculation } from './hooks/useTokenCalculation.js';
export { useSessionList } from './hooks/useSessionList.js';
export * from './utils/config.js';
export * from './api/sessions.js';
export * from './utils/cursor-utils.js';
export * from './utils/scroll-viewport.js';
export * from './utils/text-rendering-utils.js';
export * from './utils/todo-formatters.js';
export * from './utils/tool-configs.js';
export * from './utils/tool-formatters.js';
export declare const version = "0.1.0";
//# sourceMappingURL=index.d.ts.map