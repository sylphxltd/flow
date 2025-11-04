/**
 * Agent Manager
 * Pure agent loading and retrieval - NO state management
 */

import type { Agent } from '../types/agent.types.js';
import { loadAllAgents } from './agent-loader.js';
import { DEFAULT_AGENT_ID } from './builtin-agents.js';

/**
 * Agent manager state
 */
interface AgentManagerState {
  agents: Map<string, Agent>;
  cwd: string;
}

let state: AgentManagerState | null = null;

/**
 * Fallback agent when state is not initialized
 */
const FALLBACK_AGENT: Agent = {
  id: DEFAULT_AGENT_ID,
  metadata: {
    name: 'Coder',
    description: 'Fallback agent (agent manager not initialized)',
  },
  systemPrompt: 'You are a helpful coding assistant.',
  isBuiltin: true,
};

/**
 * Initialize agent manager
 */
export async function initializeAgentManager(cwd: string): Promise<void> {
  const allAgents = await loadAllAgents(cwd);

  const agentMap = new Map<string, Agent>();
  for (const agent of allAgents) {
    agentMap.set(agent.id, agent);
  }

  state = {
    agents: agentMap,
    cwd,
  };
}

/**
 * Get all available agents
 */
export function getAllAgents(): Agent[] {
  if (!state) {
    return [FALLBACK_AGENT];
  }
  return Array.from(state.agents.values());
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): Agent | null {
  if (!state) {
    return id === DEFAULT_AGENT_ID ? FALLBACK_AGENT : null;
  }
  return state.agents.get(id) || null;
}

/**
 * Reload agents from disk
 */
export async function reloadAgents(): Promise<void> {
  if (!state) {
    return;
  }

  const cwd = state.cwd;
  await initializeAgentManager(cwd);
}
