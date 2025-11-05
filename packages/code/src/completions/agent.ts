/**
 * Agent Completions
 * Static agent list from embedded context
 */

import { getAllAgents } from '../embedded-context.js';

export interface CompletionOption {
  id: string;
  label: string;
  value: string;
}

/**
 * Get agent completion options
 * Static list of available agents
 */
export async function getAgentCompletions(): Promise<CompletionOption[]> {
  const agents = getAllAgents();

  return agents.map((agent) => ({
    id: agent.id,
    label: `${agent.metadata.name} - ${agent.metadata.description}`,
    value: agent.id,
  }));
}
