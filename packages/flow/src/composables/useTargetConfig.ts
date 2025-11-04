import { getTarget, getDefaultTargetUnsafe } from '../config/targets.js';
import { projectSettings } from '../utils/settings.js';
import type { MCPServerConfigFlags } from '../types.js';

/**
 * Get the current target's MCP server configuration
 * Follows the same resolution pattern as targetManager.resolveTarget()
 * Returns undefined if no target is set or target has no mcpServerConfig
 */
export async function useTargetConfig(): Promise<MCPServerConfigFlags | undefined> {
  try {
    // Try to get target from project settings first
    const settings = await projectSettings.load();
    const targetId = settings?.target;

    if (targetId) {
      const targetOption = getTarget(targetId);
      if (targetOption._tag === 'Some') {
        return targetOption.value.mcpServerConfig;
      }
    }

    // Fall back to default target
    const defaultTarget = getDefaultTargetUnsafe();
    return defaultTarget.mcpServerConfig;
  } catch {
    // If no target can be resolved, return undefined
    return undefined;
  }
}

/**
 * Get a specific target's MCP server configuration by ID
 */
export function useTargetConfigById(targetId: string): MCPServerConfigFlags | undefined {
  try {
    const targetOption = getTarget(targetId);
    if (targetOption._tag === 'None') {
      return undefined;
    }
    return targetOption.value.mcpServerConfig;
  } catch {
    return undefined;
  }
}
