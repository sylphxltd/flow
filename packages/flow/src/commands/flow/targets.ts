/**
 * Target Management for Flow Commands
 */

import { targetManager } from '../../core/target-manager.js';

/**
 * Get executable targets
 */
export function getExecutableTargets(): string[] {
  return targetManager.getImplementedTargetIDs().filter((targetId) => {
    const targetOption = targetManager.getTarget(targetId);
    if (targetOption._tag === 'None') {
      return false;
    }
    return targetOption.value.executeCommand !== undefined;
  });
}
