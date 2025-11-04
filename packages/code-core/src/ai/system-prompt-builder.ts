/**
 * System Prompt Builder
 * Pure function to build complete system prompt from agent + rules
 * NO global state - explicit parameters only
 */

import { getAgentById } from './agent-manager.js';
import { getEnabledRules } from './rule-manager.js';
import { DEFAULT_AGENT_ID } from './builtin-agents.js';

/**
 * Build complete system prompt from agent definition and enabled rules
 * Pure function - takes agentId explicitly, no global state
 */
export function buildSystemPrompt(agentId: string): string {
  // Load agent (fallback to default if not found)
  const agent = getAgentById(agentId) || getAgentById(DEFAULT_AGENT_ID);
  if (!agent) {
    return 'You are a helpful coding assistant.';
  }

  // Load enabled rules
  const rules = getEnabledRules();
  const rulesContent = rules.map(r => r.content).join('\n\n---\n\n');

  // Combine agent prompt + rules
  if (rulesContent) {
    return `${agent.systemPrompt}\n\n---\n\n${rulesContent}`;
  }

  return agent.systemPrompt;
}
