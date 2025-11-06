/**
 * Session Initialization Hook
 * Creates a new session on mount if none exists
 *
 * DESIGN: Falls back to provider-specific default-model when top-level defaultModel is missing
 * This handles configs where only defaultProvider is set (common after initial setup)
 */
import type { AIConfig } from '@sylphx/code-core';
interface UseSessionInitializationProps {
    currentSessionId: string | null;
    aiConfig: AIConfig | null;
    createSession: (provider: string, model: string) => Promise<string>;
}
export declare function useSessionInitialization({ currentSessionId, aiConfig, createSession, }: UseSessionInitializationProps): void;
export {};
//# sourceMappingURL=useSessionInitialization.d.ts.map