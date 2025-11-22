import inquirer from 'inquirer';
import {
  getAllTargetIDs,
  getAllTargets,
  getDefaultTargetUnsafe,
  getImplementedTargetIDs,
  getImplementedTargets,
  getTarget,
  getTargetsWithMCPSupport,
  isTargetImplemented,
} from '../config/targets.js';
import { getOrElse, isSome } from '../core/functional/option.js';
import { projectSettings } from '../utils/config/settings.js';

/**
 * Target Manager interface
 */
export interface TargetManager {
  getAllTargets(): ReturnType<typeof getAllTargets>;
  getImplementedTargets(): ReturnType<typeof getImplementedTargets>;
  getTarget(id: string): ReturnType<typeof getTarget>;
  promptForTargetSelection(): Promise<string>;
  resolveTarget(options: { target?: string; allowSelection?: boolean }): Promise<string>;
  isTargetImplemented(targetId: string): boolean;
  getTargetsWithMCPSupport(): ReturnType<typeof getTargetsWithMCPSupport>;
  getImplementedTargetIDs(): ReturnType<typeof getImplementedTargetIDs>;
  getAllTargetIDs(): ReturnType<typeof getAllTargetIDs>;
}

/**
 * Create a target manager instance
 */
export function createTargetManager(): TargetManager {
  /**
   * Detect target from current environment
   */
  const detectTargetFromEnvironment = (): string | null => {
    try {
      const implementedTargets = getImplementedTargets();

      // Prioritize non-default targets for detection
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
  };

  /**
   * Prompt user to select a target platform
   */
  const promptForTargetSelection = async (): Promise<string> => {
    const availableTargets = getImplementedTargetIDs();

    // Try to get saved default target for default selection
    let defaultTarget = getDefaultTargetUnsafe().id;
    try {
      const savedDefaultTarget = await projectSettings.getDefaultTarget();
      if (savedDefaultTarget && isSome(getTarget(savedDefaultTarget))) {
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
          const targetOption = getTarget(id);
          const target = getOrElse({ id, name: id } as any)(targetOption);
          return {
            name: target.name || id,
            value: id,
          };
        }),
        default: defaultTarget,
      },
    ]);

    return answer.target;
  };

  /**
   * Resolve target with fallback to default and detection
   */
  const resolveTarget = async (options: {
    target?: string;
    allowSelection?: boolean;
  }): Promise<string> => {
    // If target is explicitly specified, use it
    if (options.target) {
      if (!isSome(getTarget(options.target))) {
        throw new Error(
          `Unknown target: ${options.target}. Available targets: ${getAllTargetIDs().join(', ')}`
        );
      }
      return options.target;
    }

    // Try to use saved project default target first
    try {
      const savedDefaultTarget = await projectSettings.getDefaultTarget();
      if (savedDefaultTarget && isSome(getTarget(savedDefaultTarget))) {
        return savedDefaultTarget;
      }
    } catch (_error) {
      // Silently ignore errors reading project settings
    }

    // Try to detect target from environment
    const detectedTarget = detectTargetFromEnvironment();
    if (detectedTarget) {
      return detectedTarget;
    }

    // If selection is allowed and no target found, prompt user
    if (options.allowSelection) {
      return await promptForTargetSelection();
    }

    // Fall back to system default target
    const defaultTarget = getDefaultTargetUnsafe();
    return defaultTarget.id;
  };

  return {
    getAllTargets: () => getAllTargets(),
    getImplementedTargets: () => getImplementedTargets(),
    getTarget: (id: string) => getTarget(id),
    promptForTargetSelection,
    resolveTarget,
    isTargetImplemented: (targetId: string) => isTargetImplemented(targetId),
    getTargetsWithMCPSupport: () => getTargetsWithMCPSupport(),
    getImplementedTargetIDs: () => getImplementedTargetIDs(),
    getAllTargetIDs: () => getAllTargetIDs(),
  };
}

// Singleton instance
export const targetManager = createTargetManager();
