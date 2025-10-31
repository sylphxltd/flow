import { targetManager } from '../core/target-manager.js';
import type { MCPServerConfigFlags } from '../types.js';

/**
 * Get the current target's MCP server configuration
 * Follows the same resolution pattern as targetManager.resolveTarget()
 * Returns undefined if no target is set or target has no mcpServerConfig
 */
export async function useTargetConfig(): Promise<MCPServerConfigFlags | undefined> {
  // Use the same resolution logic as targetManager.resolveTarget()
  // but without allowing user selection (since this is a non-interactive context)
  const currentTargetId = await targetManager.resolveTarget({
    allowSelection: false,
  });

  try {
    const targetOption = targetManager.getTarget(currentTargetId);
    if (targetOption._tag === 'None') {
      return undefined;
    }
    return targetOption.value.mcpServerConfig;
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
    const targetOption = targetManager.getTarget(targetId);
    if (targetOption._tag === 'None') {
      return undefined;
    }
    return targetOption.value.mcpServerConfig;
  } catch {
    return undefined;
  }
}
