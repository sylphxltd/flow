import { targetManager } from '../core/target-manager.js';
import type { MCPServerConfigFlags } from '../types.js';

/**
 * Get the current target's MCP server configuration
 * Returns undefined if no target is set or target has no mcpServerConfig
 */
export function useTargetConfig(): MCPServerConfigFlags | undefined {
  // For now, we need to get the current target somehow
  // This could be enhanced later to have a proper context system

  // Option 1: Try to get from environment or default target
  const currentTargetId = process.env.SYPH_TARGET || 'claude-code'; // fallback

  try {
    const target = targetManager.getTarget(currentTargetId);
    return target?.mcpServerConfig;
  } catch {
    // If target doesn't exist, return undefined
    return undefined;
  }
}

/**
 * Get a specific target's MCP server configuration by ID
 */
export function useTargetConfigById(targetId: string): MCPServerConfigFlags | undefined {
  try {
    const target = targetManager.getTarget(targetId);
    return target?.mcpServerConfig;
  } catch {
    return undefined;
  }
}
