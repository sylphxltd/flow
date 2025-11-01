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
  currentAgentId: string;
  cwd: string;
}

let state: AgentManagerState | null = null;

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
    currentAgentId: DEFAULT_AGENT_ID,
    cwd,
  };
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
  if (!state) {
    return getBuiltinAgents()[0]; // Return default coder agent
  }
  return state.agents.get(state.currentAgentId) || getBuiltinAgents()[0];
}

/**
 * Get current agent ID
 */
export function getCurrentAgentId(): string {
  return state?.currentAgentId || DEFAULT_AGENT_ID;
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

  state.currentAgentId = agentId;
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
  const currentAgentId = state.currentAgentId;

  await initializeAgentManager(cwd);

  // Restore current agent if it still exists
  if (state && state.agents.has(currentAgentId)) {
    state.currentAgentId = currentAgentId;
  }
}

/**
 * Get system prompt for current agent
 */
export function getCurrentSystemPrompt(): string {
  return getCurrentAgent().systemPrompt;
}
