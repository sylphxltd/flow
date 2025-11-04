/**
 * tRPC Context
 * Provides database repositories and config to all tRPC procedures
 */
import type { SessionRepository } from '@sylphx/code-core';
import type { AIConfig } from '@sylphx/code-core';
export interface Context {
    sessionRepository: SessionRepository;
    aiConfig: AIConfig;
}
/**
 * Create context for each request
 * In-process calls reuse same database connection
 */
export declare function createContext(): Promise<Context>;
//# sourceMappingURL=context.d.ts.map