/**
 * App Context - Services Provider Pattern
 * Functional composition for dependency injection
 *
 * Architecture:
 * - code-server: Application layer (this file)
 * - Services live in Context (database, managers)
 * - UI state lives in Zustand (navigation, loading)
 * - No global mutable state
 * - Type-safe composition
 */
import type { Agent, Rule } from '@sylphx/code-core';
import { SessionRepository } from '@sylphx/code-core';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
export interface DatabaseConfig {
    url?: string;
    authToken?: string;
}
export interface AppConfig {
    database?: DatabaseConfig;
    cwd: string;
}
export interface DatabaseService {
    getRepository(): SessionRepository;
    getDB(): DrizzleD1Database<any>;
}
export interface AgentManagerService {
    getAll(): Agent[];
    getById(id: string): Agent | null;
    reload(): Promise<void>;
}
export interface RuleManagerService {
    getAll(): Rule[];
    getById(id: string): Rule | null;
    getEnabled(enabledIds: string[]): Rule[];
    reload(): Promise<void>;
}
export interface AppContext {
    database: DatabaseService;
    agentManager: AgentManagerService;
    ruleManager: RuleManagerService;
    config: AppConfig;
}
/**
 * Create app context with all services
 * Services are lazy-initialized via closures
 */
export declare function createAppContext(config: AppConfig): AppContext;
/**
 * Initialize all services in context
 * Call this once at app startup
 */
export declare function initializeAppContext(ctx: AppContext): Promise<void>;
/**
 * Close all services and cleanup
 */
export declare function closeAppContext(ctx: AppContext): Promise<void>;
//# sourceMappingURL=context.d.ts.map