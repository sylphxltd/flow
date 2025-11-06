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
import { SessionRepository, initializeDatabase, loadAllAgents, loadAllRules, DEFAULT_AGENT_ID } from '@sylphx/code-core';
function createDatabaseService(config) {
    let db = null;
    let repository = null;
    let initialized = false;
    const initialize = async () => {
        if (initialized)
            return;
        db = await initializeDatabase(() => { });
        repository = new SessionRepository(db);
        initialized = true;
    };
    const getRepository = () => {
        if (!repository) {
            throw new Error('Database not initialized. Call context.initialize() first.');
        }
        return repository;
    };
    const getDB = () => {
        if (!db) {
            throw new Error('Database not initialized. Call context.initialize() first.');
        }
        return db;
    };
    return {
        initialize,
        getRepository,
        getDB,
    };
}
// ============================================================================
// Agent Manager Service API
// ============================================================================
const FALLBACK_AGENT = {
    id: DEFAULT_AGENT_ID,
    metadata: {
        name: 'Coder',
        description: 'Default coding assistant',
    },
    systemPrompt: 'You are a helpful coding assistant.',
    isBuiltin: true,
};
function createAgentManagerService(cwd) {
    let agents = new Map();
    let initialized = false;
    const initialize = async () => {
        if (initialized)
            return;
        const allAgents = await loadAllAgents(cwd);
        agents = new Map(allAgents.map(a => [a.id, a]));
        initialized = true;
    };
    const getAll = () => {
        if (!initialized)
            return [FALLBACK_AGENT];
        return Array.from(agents.values());
    };
    const getById = (id) => {
        if (!initialized) {
            return id === DEFAULT_AGENT_ID ? FALLBACK_AGENT : null;
        }
        return agents.get(id) || null;
    };
    const reload = async () => {
        await initialize();
    };
    return {
        initialize,
        getAll,
        getById,
        reload,
    };
}
function createRuleManagerService(cwd) {
    let rules = new Map();
    let initialized = false;
    const initialize = async () => {
        if (initialized)
            return;
        const allRules = await loadAllRules(cwd);
        rules = new Map(allRules.map(r => [r.id, r]));
        initialized = true;
    };
    const getAll = () => {
        if (!initialized)
            return [];
        return Array.from(rules.values());
    };
    const getById = (id) => {
        if (!initialized)
            return null;
        return rules.get(id) || null;
    };
    const getEnabled = (enabledIds) => {
        if (!initialized)
            return [];
        return enabledIds
            .map(id => rules.get(id))
            .filter((r) => r !== undefined);
    };
    const reload = async () => {
        await initialize();
    };
    return {
        initialize,
        getAll,
        getById,
        getEnabled,
        reload,
    };
}
/**
 * Create app context with all services
 * Services are lazy-initialized via closures
 */
export function createAppContext(config) {
    const database = createDatabaseService(config.database || {});
    const agentManager = createAgentManagerService(config.cwd);
    const ruleManager = createRuleManagerService(config.cwd);
    return {
        database,
        agentManager,
        ruleManager,
        config,
    };
}
/**
 * Initialize all services in context
 * Call this once at app startup
 */
export async function initializeAppContext(ctx) {
    await ctx.database.initialize();
    await ctx.agentManager.initialize();
    await ctx.ruleManager.initialize();
}
/**
 * Close all services and cleanup
 */
export async function closeAppContext(ctx) {
    // Future: Add cleanup logic for database connections, etc.
}
//# sourceMappingURL=context.js.map