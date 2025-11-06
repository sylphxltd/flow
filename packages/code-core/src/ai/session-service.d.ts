/**
 * Session Service
 * Centralized session management for headless mode
 *
 * NOTE: This should be moved to code-server (application layer)
 * Kept here temporarily for backwards compatibility
 */
import type { ProviderId, ProviderConfig } from '../config/ai-config.js';
import type { Session } from '../types/session.types.js';
import type { SessionRepository } from '../database/session-repository.js';
/**
 * Get default model for a provider
 * Priority: config defaultModel > first available model
 */
export declare function getDefaultModel(providerId: ProviderId, providerConfig: ProviderConfig): Promise<string | null>;
/**
 * Get or create session for headless mode
 *
 * @param repository - Session repository instance (from AppContext)
 * @param continueSession - Whether to continue last session or create new one
 */
export declare function getOrCreateSession(repository: SessionRepository, continueSession: boolean): Promise<Session | null>;
/**
 * Show error message for models without tool support
 */
export declare function showModelToolSupportError(): void;
//# sourceMappingURL=session-service.d.ts.map