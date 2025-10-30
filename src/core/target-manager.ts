import inquirer from 'inquirer';
import {
  getAllTargetIDs,
  getDefaultTarget,
  getImplementedTargetIDs,
  getTarget,
  getTargetsWithMCPSupport,
  targetRegistry,
} from '../config/targets.js';
import { projectSettings } from '../utils/settings.js';

/**
 * Simplified target manager that works with the new Target-based architecture
 */
export class TargetManager {
  /**
   * Get all available targets
   */
  getAllTargets() {
    return targetRegistry.getAllTargets();
  }

  /**
   * Get implemented targets only
   */
  getImplementedTargets() {
    return targetRegistry.getImplementedTargets();
  }

  /**
   * Get target by ID
   */
  getTarget(id: string) {
    return getTarget(id);  // Use lazy-initialized export instead of direct registry access
  }

  /**
   * Prompt user to select a target platform
   */
  async promptForTargetSelection(): Promise<string> {
    const availableTargets = this.getImplementedTargetIDs();

    // Try to get saved default target for default selection
    let defaultTarget = getDefaultTarget();
    try {
      const savedDefaultTarget = await projectSettings.getDefaultTarget();
      if (savedDefaultTarget && this.getTarget(savedDefaultTarget)) {
        defaultTarget = savedDefaultTarget;
      }
    } catch {
      // Silently ignore errors reading project settings
    }

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'target',
        message: 'Select target platform:',
        choices: availableTargets.map((id) => {
          const target = this.getTarget(id);
          return {
            name: target?.name || id,
            value: id,
          };
        }),
        default: defaultTarget,
      },
    ]);

    return answer.target;
  }

  /**
   * Resolve target with fallback to default and detection
   */
  async resolveTarget(options: { target?: string; allowSelection?: boolean }): Promise<string> {
    // If target is explicitly specified, use it
    if (options.target) {
      if (!getTarget(options.target)) {
        throw new Error(
          `Unknown target: ${options.target}. Available targets: ${getAllTargetIDs().join(', ')}`
        );
      }
      return options.target;
    }

    // Try to use saved project default target first (user's choice should override environment detection)
    try {
      const savedDefaultTarget = await projectSettings.getDefaultTarget();
      if (savedDefaultTarget && getTarget(savedDefaultTarget)) {
        return savedDefaultTarget;
      }
    } catch (_error) {
      // Silently ignore errors reading project settings
    }

    // Try to detect target from environment
    const detectedTarget = this.detectTargetFromEnvironment();
    if (detectedTarget) {
      return detectedTarget;
    }

    // If selection is allowed and no target found, prompt user
    if (options.allowSelection) {
      return await this.promptForTargetSelection();
    }

    // Fall back to system default target
    const defaultTarget = getDefaultTarget();
    return defaultTarget;
  }

  /**
   * Detect target from current environment
   */
  private detectTargetFromEnvironment(): string | null {
    try {
      const implementedTargets = this.getImplementedTargets();

      // Prioritize non-default targets for detection
      // Default target should only be used if nothing else is detected
      const nonDefaultTargets = implementedTargets.filter((target) => !target.isDefault);
      const defaultTargets = implementedTargets.filter((target) => target.isDefault);

      // Check non-default targets first
      for (const target of nonDefaultTargets) {
        const detected = target.detectFromEnvironment?.();
        if (detected) {
          return target.id;
        }
      }

      // Then check default targets
      for (const target of defaultTargets) {
        const detected = target.detectFromEnvironment?.();
        if (detected) {
          return target.id;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if target is implemented
   */
  isTargetImplemented(targetId: string): boolean {
    return getTarget(targetId)?.isImplemented ?? false;
  }

  /**
   * Get targets that support MCP servers
   */
  getTargetsWithMCPSupport(): string[] {
    return getTargetsWithMCPSupport();
  }

  /**
   * Get implemented target IDs
   */
  getImplementedTargetIDs(): string[] {
    return getImplementedTargetIDs();
  }

  /**
   * Get all target IDs
   */
  getAllTargetIDs(): string[] {
    return getAllTargetIDs();
  }
}

// Singleton instance
export const targetManager = new TargetManager();
