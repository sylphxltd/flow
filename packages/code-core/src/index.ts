/**
 * @sylphx/code-core
 * Complete headless SDK with all business logic
 *
 * This package contains all core functionality:
 * - AI streaming and providers
 * - Session management
 * - Message handling
 * - Database layer (pure functions)
 * - Tools execution
 * - Configuration
 *
 * NOTE: This is SDK/Library layer - NO application context management
 * Application composition happens in code-server package
 */

// ============================================================================
// AI & Streaming
// ============================================================================
export { createAIStream, getSystemStatus, buildSystemStatusFromMetadata, injectSystemStatusToOutput, getSystemPrompt } from './ai/ai-sdk.js'
export { processStream, type StreamCallbacks } from './ai/stream-handler.js'

// ============================================================================
// Agent Manager (Pure Functions Only)
// ============================================================================
export { DEFAULT_AGENT_ID } from './ai/builtin-agents.js'
export { loadAllAgents } from './ai/agent-loader.js'

// NOTE: Global state functions removed (moved to code-server AppContext):
// - initializeAgentManager, getAllAgents, getAgentById, reloadAgents
// Use AgentManagerService from code-server/src/context.ts instead

// ============================================================================
// System Prompt Builder
// ============================================================================
export { buildSystemPrompt } from './ai/system-prompt-builder.js'

// ============================================================================
// Rule Manager (Pure Functions Only)
// ============================================================================
export { loadAllRules } from './ai/rule-loader.js'

// NOTE: Global state functions removed (moved to code-server AppContext):
// - initializeRuleManager, getAllRules, getRuleById, getEnabledRuleIds,
//   getEnabledRules, toggleRule, enableRule, disableRule, setEnabledRules
// - setRuleAppStoreGetter (horror anti-pattern removed)
// Use RuleManagerService from code-server/src/context.ts instead

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
// Database & Repositories (Pure Functions)
// ============================================================================
export { SessionRepository } from './database/session-repository.js'
export { initializeDatabase } from './database/auto-migrate.js'

// NOTE: Global state functions removed (moved to code-server AppContext):
// - getDatabase, getSessionRepository
// Use DatabaseService from code-server/src/context.ts instead

// ============================================================================
// Configuration
// ============================================================================
export { loadAIConfig, saveAIConfig, getAIConfigPaths, AI_PROVIDERS, getConfiguredProviders } from './config/ai-config.js'
export type { AIConfig, ProviderConfig, ProviderId } from './config/ai-config.js'

// ============================================================================
// Types
// ============================================================================
export type * from './types/session.types.js'
export type * from './types/common.types.js'
export type * from './types/interaction.types.js'

// ============================================================================
// Session Management
// ============================================================================
export { getOrCreateSession, showModelToolSupportError } from './ai/session-service.js'
export { createHeadlessDisplay } from './ai/headless-display.js'
export { addMessage } from './utils/session-manager.js'

// ============================================================================
// Utils
// ============================================================================
export { buildTodoContext } from './utils/todo-context.js'
export { generateSessionTitleWithStreaming } from './utils/session-title.js'
export { generateSessionTitle } from './session/utils/title.js'
export { formatTodoChange, formatTodoCount } from './utils/todo-formatters.js'
export { formatTokenCount, getTokenizerInfo } from './utils/token-counter.js'
export { filterFiles, type FileInfo } from './utils/file-scanner.js'
export { fetchModels, type ModelInfo } from './utils/ai-model-fetcher.js'

// ============================================================================
// Tools
// ============================================================================
export * from './tools/index.js'
export { getAISDKTools, getToolCategories, getAllToolNames, type GetToolsOptions } from './tools/registry.js'
export { createTodoTool, type TodoToolContext } from './tools/todo.js'
export { setUserInputHandler, clearUserInputHandler, setQueueUpdateCallback } from './tools/interaction.js'
export { bashManager } from './tools/bash-manager.js'
export { scanProjectFiles } from './utils/file-scanner.js'
export { sendNotification } from './utils/notifications.js'

// ============================================================================
// Version
// ============================================================================
export const version = '0.1.0'
