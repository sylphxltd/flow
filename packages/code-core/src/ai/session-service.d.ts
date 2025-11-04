/**
 * Session Service
 * Centralized session management for headless mode
 * Uses database for persistence
 */
import type { ProviderId, ProviderConfig } from '../config/ai-config.js';
import type { Session } from '../types/session.types.js';
/**
 * Get default model for a provider
 * Priority: config default-model > first available model
 */
export declare function getDefaultModel(providerId: ProviderId, providerConfig: ProviderConfig): Promise<string | null>;
/**
 * Get or create session for headless mode
 */
export declare function getOrCreateSession(continueSession: boolean): Promise<Session | null>;
/**
 * Show error message for models without tool support
 */
export declare function showModelToolSupportError(): void;
//# sourceMappingURL=session-service.d.ts.map