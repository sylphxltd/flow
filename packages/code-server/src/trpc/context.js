/**
 * tRPC Context
 * Provides database repositories and config to all tRPC procedures
 */
import { getSessionRepository } from '@sylphx/code-core';
import { loadAIConfig } from '@sylphx/code-core';
/**
 * Create context for each request
 * In-process calls reuse same database connection
 */
export async function createContext() {
    const sessionRepository = await getSessionRepository();
    // Load AI config
    let aiConfig = { providers: {} };
    try {
        const result = await loadAIConfig();
        if (result._tag === 'Success') {
            aiConfig = result.value;
        }
    }
    catch (error) {
        console.error('Failed to load AI config:', error);
    }
    return {
        sessionRepository,
        aiConfig,
    };
}
//# sourceMappingURL=context.js.map