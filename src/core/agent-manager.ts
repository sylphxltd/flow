/**
 * Agent Manager
 * Manages agent state and operations
 */

import type { Agent } from '../types/agent.types.js';
import { loadAllAgents } from './agent-loader.js';
import { getBuiltinAgents, DEFAULT_AGENT_ID } from './builtin-agents.js';

/**
 * Agent manager state
 */
interface AgentManagerState {
  agents: Map<string, Agent>;
  cwd: string;
}

let state: AgentManagerState | null = null;

/**
 * Get the app store (lazy import to avoid circular dependencies)
 */
let getAppStore: (() => any) | null = null;

/**
 * Set the app store getter (called during initialization)
 */
export function setAppStoreGetter(getter: () => any): void {
  getAppStore = getter;
}

/**
 * Initialize agent manager
 */
export async function initializeAgentManager(cwd: string): Promise<void> {
  const builtinAgents = getBuiltinAgents();
  const allAgents = await loadAllAgents(cwd, builtinAgents);

  const agentMap = new Map<string, Agent>();
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
export function getAllAgents(): Agent[] {
  if (!state) {
    return getBuiltinAgents();
  }
  return Array.from(state.agents.values());
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): Agent | null {
  if (!state) {
    const builtins = getBuiltinAgents();
    return builtins.find((a) => a.id === id) || null;
  }
  return state.agents.get(id) || null;
}

/**
 * Get current agent
 */
export function getCurrentAgent(): Agent {
  const currentAgentId = getCurrentAgentId();

  if (!state) {
    return getBuiltinAgents()[0]; // Return default coder agent
  }
  return state.agents.get(currentAgentId) || getBuiltinAgents()[0];
}

/**
 * Get current agent ID
 */
export function getCurrentAgentId(): string {
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
export function switchAgent(agentId: string): boolean {
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
export async function reloadAgents(): Promise<void> {
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
export function getCurrentSystemPrompt(): string {
  return getCurrentAgent().systemPrompt;
}
