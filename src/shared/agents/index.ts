/**
 * Agent configuration and selection utilities
 */

import type { AgentConfig, AgentConfigs } from '../types/index.js';

/**
 * Get list of supported agents
 * @param configs - Agent configurations
 * @returns Array of supported agent keys
 */
export function getSupportedAgents(configs: AgentConfigs): string[] {
  return Object.keys(configs);
}

/**
 * Get configuration for a specific agent
 * @param configs - Agent configurations
 * @param agent - Agent key
 * @returns Agent configuration
 * @throws Error if agent not found
 */
export function getAgentConfig(configs: AgentConfigs, agent: string): AgentConfig {
  const config = configs[agent];
  if (!config) {
    throw new Error(`Agent configuration not found: ${agent}`);
  }
  return config;
}

/**
 * Prompt user to select an agent (currently defaults to first)
 * @param configs - Agent configurations
 * @param toolName - Name of the tool for display
 * @returns Selected agent key
 */
export async function promptForAgent(configs: AgentConfigs, toolName: string): Promise<string> {
  const supportedAgents = getSupportedAgents(configs);

  console.log(`\n📝 ${toolName}`);
  console.log('================');
  console.log('Available agents:');
  supportedAgents.forEach((agent, index) => {
    const config = getAgentConfig(configs, agent);
    console.log(`  ${index + 1}. ${config.name} - ${config.description}`);
  });

  // For now, default to first agent
  // In a real implementation, you might want to use readline or a CLI prompt library
  return supportedAgents[0];
}

/**
 * Detect which agent tool to use
 * @param configs - Agent configurations
 * @param defaultAgent - Default agent to use
 * @returns Agent key
 */
export function detectAgentTool(_configs: AgentConfigs, defaultAgent = 'opencode'): string {
  // Simple detection logic - could be enhanced
  // For now, return default
  return defaultAgent;
}