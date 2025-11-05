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

// ============================================================================
// tRPC Provider (React Context API)
// ============================================================================
export {
  // React Context API
  TRPCProvider,
  useTRPCClient,
  type TRPCProviderProps,

  // Client factories
  createInProcessClient,
  createHTTPClient,
  type TypedTRPCClient,

  // Internal API for Zustand stores (DO NOT USE in React components)
  getTRPCClient,
} from './trpc-provider.js'

// ============================================================================
// tRPC Links (Low-level, use createInProcessClient instead)
// ============================================================================
export { inProcessLink, type InProcessLinkOptions } from './trpc-links/index.js'

// ============================================================================
// State Management
// ============================================================================
export { useAppStore, type AppState, type Screen } from './stores/app-store.js'

// ============================================================================
// Types (re-exported from dependencies)
// ============================================================================
export type { Session, MessagePart } from '@sylphx/code-core'
export type { AppRouter } from '@sylphx/code-server'

// ============================================================================
// Command Types
// ============================================================================
export type {
  Command,
  CommandArg,
  CommandContext,
  SelectOption,
  Question,
  WaitForInputOptions,
} from './types/command-types.js'

// ============================================================================
// React Hooks
// ============================================================================
export { useAIConfig } from './hooks/useAIConfig.js'
export { useAskToolHandler } from './hooks/useAskToolHandler.js'
export { useChat } from './hooks/useChat.js'
export { useElapsedTime } from './hooks/useElapsedTime.js'
export { useFileAttachments } from './hooks/useFileAttachments.js'
export { useKeyboard } from './hooks/useKeyboard.js'
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js'
export { useMouse } from './hooks/useMouse.js'
export { useProjectFiles } from './hooks/useProjectFiles.js'
export { useSessionInitialization } from './hooks/useSessionInitialization.js'
export { useSessionPersistence } from './hooks/useSessionPersistence.js'
export { useTokenCalculation } from './hooks/useTokenCalculation.js'

// ============================================================================
// Utilities
// ============================================================================
export * from './utils/cursor-utils.js'
export * from './utils/scroll-viewport.js'
export * from './utils/text-rendering-utils.js'
export * from './utils/todo-formatters.js'
export * from './utils/tool-configs.js'
export * from './utils/tool-formatters.js'

// ============================================================================
// Version
// ============================================================================
export const version = '0.1.0'
