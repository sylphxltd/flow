/**
 * Agent Manager
 * Manages agent state and operations
 */
import { loadAllAgents } from './agent-loader.js';
import { DEFAULT_AGENT_ID } from './builtin-agents.js';
let state = null;
/**
 * Get the app store (lazy import to avoid circular dependencies)
 */
let getAppStore = null;
/**
 * Fallback agent when state is not initialized
 */
const FALLBACK_AGENT = {
    id: DEFAULT_AGENT_ID,
    metadata: {
        name: 'Coder',
        description: 'Fallback agent (agent manager not initialized)',
    },
    systemPrompt: 'You are a helpful coding assistant.',
    isBuiltin: true,
};
/**
 * Set the app store getter (called during initialization)
 */
export function setAppStoreGetter(getter) {
    getAppStore = getter;
}
/**
 * Initialize agent manager
 */
export async function initializeAgentManager(cwd) {
    const allAgents = await loadAllAgents(cwd);
    const agentMap = new Map();
    for (const agent of allAgents) {
        agentMap.set(agent.id, agent);
    }
    state = {
        agents: agentMap,
        cwd,
    };
    // Initialize store with default agent if store is available
    if (getAppStore) {
        const store = getAppStore();
        if (store.getState) {
            const currentAgentId = store.getState().currentAgentId || DEFAULT_AGENT_ID;
            // Ensure the current agent exists, fallback to default if not
            if (!agentMap.has(currentAgentId)) {
                store.getState().setCurrentAgentId(DEFAULT_AGENT_ID);
            }
        }
    }
}
/**
 * Get all available agents
 */
export function getAllAgents() {
    if (!state) {
        return [FALLBACK_AGENT];
    }
    return Array.from(state.agents.values());
}
/**
 * Get agent by ID
 */
export function getAgentById(id) {
    if (!state) {
        return id === DEFAULT_AGENT_ID ? FALLBACK_AGENT : null;
    }
    return state.agents.get(id) || null;
}
/**
 * Get current agent
 */
export function getCurrentAgent() {
    const currentAgentId = getCurrentAgentId();
    if (!state) {
        return FALLBACK_AGENT;
    }
    return state.agents.get(currentAgentId) || FALLBACK_AGENT;
}
/**
 * Get current agent ID
 */
export function getCurrentAgentId() {
    // Try to get from store first
    if (getAppStore) {
        const store = getAppStore();
        if (store.getState) {
            return store.getState().currentAgentId || DEFAULT_AGENT_ID;
        }
    }
    // Fallback to default
    return DEFAULT_AGENT_ID;
}
/**
 * Switch to a different agent
 */
export function switchAgent(agentId) {
    if (!state) {
        return false;
    }
    const agent = state.agents.get(agentId);
    if (!agent) {
        return false;
    }
    // Update store if available (this triggers reactive updates)
    if (getAppStore) {
        const store = getAppStore();
        if (store.getState) {
            store.getState().setCurrentAgentId(agentId);
        }
    }
    return true;
}
/**
 * Reload agents from disk
 */
export async function reloadAgents() {
    if (!state) {
        return;
    }
    const cwd = state.cwd;
    const currentAgentId = getCurrentAgentId();
    await initializeAgentManager(cwd);
    // Restore current agent if it still exists, otherwise reset to default
    if (state && !state.agents.has(currentAgentId)) {
        if (getAppStore) {
            const store = getAppStore();
            if (store.getState) {
                store.getState().setCurrentAgentId(DEFAULT_AGENT_ID);
            }
        }
    }
}
/**
 * Get system prompt for current agent
 */
export function getCurrentSystemPrompt() {
    return getCurrentAgent().systemPrompt;
}
//# sourceMappingURL=agent-manager.js.map