/**
 * Agent Manager
 * Manages agent state and operations
 */
import type { Agent } from '../types/agent.types.js';
/**
 * Set the app store getter (called during initialization)
 */
export declare function setAppStoreGetter(getter: () => any): void;
/**
 * Initialize agent manager
 */
export declare function initializeAgentManager(cwd: string): Promise<void>;
/**
 * Get all available agents
 */
export declare function getAllAgents(): Agent[];
/**
 * Get agent by ID
 */
export declare function getAgentById(id: string): Agent | null;
/**
 * Get current agent
 */
export declare function getCurrentAgent(): Agent;
/**
 * Get current agent ID
 */
export declare function getCurrentAgentId(): string;
/**
 * Switch to a different agent
 */
export declare function switchAgent(agentId: string): boolean;
/**
 * Reload agents from disk
 */
export declare function reloadAgents(): Promise<void>;
/**
 * Get system prompt for current agent
 */
export declare function getCurrentSystemPrompt(): string;
//# sourceMappingURL=agent-manager.d.ts.map