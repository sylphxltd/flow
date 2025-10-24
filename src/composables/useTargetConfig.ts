import { targetManager } from '../core/target-manager.js';
import { projectSettings } from '../utils/settings.js';
import type { MCPServerConfigFlags } from '../types.js';

/**
 * Get the current target's MCP server configuration
 * Follows the same resolution pattern as targetManager.resolveTarget()
 * Returns undefined if no target is set or target has no mcpServerConfig
 */
export async function useTargetConfig(): Promise<MCPServerConfigFlags | undefined> {
  // Follow the exact same resolution pattern as targetManager.resolveTarget()
  let currentTargetId: string | undefined;

  // 1. Check if target is set globally (would be set by command execution context)
  // TODO: Implement proper context system when command execution context is available

  // 2. Try saved project default target first
  try {
    const savedDefaultTarget = await projectSettings.getDefaultTarget();
    if (savedDefaultTarget && targetManager.getTarget(savedDefaultTarget)) {
      currentTargetId = savedDefaultTarget;
    }
  } catch {
    // Silently ignore errors reading project settings
  }

  // 3. Fall back to system default target
  if (!currentTargetId) {
    try {
      const { getDefaultTarget } = await import('../config/targets.js');
      currentTargetId = getDefaultTarget();
    } catch {
      return undefined;
    }
  }

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
