/**
 * System Prompt Builder
 * Pure function to build complete system prompt from agent + rules
 * NO global state - explicit parameters only
 */
import type { Agent, Rule } from '../types/index.js';
/**
 * Build complete system prompt from agent definition and enabled rules
 * Pure function - accepts all dependencies explicitly
 *
 * @param agentId - ID of the agent to use
 * @param agents - All available agents
 * @param enabledRules - List of enabled rules
 * @returns Combined system prompt (agent + rules)
 */
export declare function buildSystemPrompt(agentId: string, agents: Agent[], enabledRules: Rule[]): string;
//# sourceMappingURL=system-prompt-builder.d.ts.map