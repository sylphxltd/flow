/**
 * System Prompt Builder
 * Pure function to build complete system prompt from agent + rules
 * NO global state - explicit parameters only
 */

import type { Agent, Rule } from '../types/index.js';
import { DEFAULT_AGENT_ID } from './builtin-agents.js';

/**
 * Build complete system prompt from agent definition and enabled rules
 * Pure function - accepts all dependencies explicitly
 *
 * @param agentId - ID of the agent to use
 * @param agents - All available agents
 * @param enabledRules - List of enabled rules
 * @returns Combined system prompt (agent + rules)
 */
export function buildSystemPrompt(
  agentId: string,
  agents: Agent[],
  enabledRules: Rule[]
): string {
  // Find agent by ID (fallback to default if not found)
  const agent = agents.find(a => a.id === agentId) ||
                agents.find(a => a.id === DEFAULT_AGENT_ID);

  if (!agent) {
    return 'You are a helpful coding assistant.';
  }

  // Combine enabled rules content
  const rulesContent = enabledRules.map(r => r.content).join('\n\n---\n\n');

  // Combine agent prompt + rules
  if (rulesContent) {
    return `${agent.systemPrompt}\n\n---\n\n${rulesContent}`;
  }

  return agent.systemPrompt;
}
