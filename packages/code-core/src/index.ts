/**
 * @sylphx/code-core
 * Complete headless SDK with all business logic
 *
 * This package contains all core functionality:
 * - AI streaming and providers
 * - Session management
 * - Message handling
 * - Database layer
 * - Tools execution
 * - Configuration
 */

// ============================================================================
// AI & Streaming
// ============================================================================
export { createAIStream, getSystemStatus, buildSystemStatusFromMetadata, injectSystemStatusToOutput } from './ai/ai-sdk.js'
export { default as streamHandler, processStream, type StreamCallbacks } from './ai/stream-handler.js'

// ============================================================================
// Providers
// ============================================================================
export { getProvider } from './ai/providers/index.js'
export { AnthropicProvider } from './ai/providers/anthropic-provider.js'
export { OpenAIProvider } from './ai/providers/openai-provider.js'
export { GoogleProvider } from './ai/providers/google-provider.js'
export { OpenRouterProvider } from './ai/providers/openrouter-provider.js'
export { ClaudeCodeProvider } from './ai/providers/claude-code-provider.js'
export { ZaiProvider } from './ai/providers/zai-provider.js'

// ============================================================================
// Database & Repositories
// ============================================================================
export { SessionRepository } from './database/session-repository.js'
export { createDatabase, getDatabase, getSessionRepository } from './database/database.js'

// ============================================================================
// Configuration
// ============================================================================
export { loadAIConfig, saveAIConfig, getDefaultProviderModel, getAIConfigPaths } from './config/ai-config.js'
export type { AIConfig, ProviderConfig } from './config/ai-config.js'

// ============================================================================
// Types
// ============================================================================
export type * from './types/session.types.js'
export type * from './types/common.types.js'

// ============================================================================
// Utils
// ============================================================================
export { buildTodoContext } from './utils/todo-context.js'
export { generateSessionTitleWithStreaming } from './utils/session-title.js'
export { formatTodoChange, formatTodoCount } from './utils/todo-formatters.js'

// ============================================================================
// Tools
// ============================================================================
export { default as tools } from './tools/index.js'
export { getAISDKTools, getToolCategories, getAllToolNames, type GetToolsOptions } from './tools/registry.js'
export { createTodoTool, type TodoToolContext } from './tools/todo.js'

// ============================================================================
// Version
// ============================================================================
export const version = '0.1.0'
