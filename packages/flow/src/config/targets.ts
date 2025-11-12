/**
 * Target registry - functional implementation with composition
 * Pure functions operating on immutable data
 */

import type { Option } from '../core/functional/option.js';
import { none, some } from '../core/functional/option.js';
import { claudeCodeTarget } from '../targets/claude-code.js';
import { opencodeTarget } from '../targets/opencode.js';
import type { Target } from '../types.js';

/**
 * All available targets
 * Lazy-initialized to avoid circular dependencies
 */
let cachedTargets: readonly Target[] | null = null;

const initializeTargets = (): readonly Target[] => {
  if (cachedTargets) {
    return cachedTargets;
  }

  cachedTargets = Object.freeze([opencodeTarget, claudeCodeTarget]);

  return cachedTargets;
};

/**
 * Get all targets
 */
export const getAllTargets = (): readonly Target[] => initializeTargets();

/**
 * Get implemented targets only
 */
export const getImplementedTargets = (): readonly Target[] =>
  getAllTargets().filter((target) => target.isImplemented);

/**
 * Get all target IDs
 */
export const getAllTargetIDs = (): readonly string[] => getAllTargets().map((target) => target.id);

/**
 * Get implemented target IDs
 */
export const getImplementedTargetIDs = (): readonly string[] =>
  getImplementedTargets().map((target) => target.id);

/**
 * Get target by ID
 * Returns Option type for explicit null handling
 */
export const getTarget = (id: string): Option<Target> => {
  const target = getAllTargets().find((t) => t.id === id);
  return target ? some(target) : none;
};

/**
 * Get target by ID (unsafe - throws if not found)
 * Use getTarget() for safer alternative with Option type
 */
export const getTargetUnsafe = (id: string): Target => {
  const target = getAllTargets().find((t) => t.id === id);
  if (!target) {
    throw new Error(`Target not found: ${id}`);
  }
  return target;
};

/**
 * Get default target
 * Returns Option type for explicit null handling
 */
export const getDefaultTarget = (): Option<Target> => {
  const target = getAllTargets().find((t) => t.isDefault);
  return target ? some(target) : none;
};

/**
 * Get default target (unsafe - throws if not found)
 * Use getDefaultTarget() for safer alternative with Option type
 */
export const getDefaultTargetUnsafe = (): Target => {
  const target = getAllTargets().find((t) => t.isDefault);
  if (!target) {
    throw new Error('No default target configured');
  }
  return target;
};

/**
 * Get targets that support MCP servers
 */
export const getTargetsWithMCPSupport = (): readonly Target[] =>
  getImplementedTargets().filter((target) => !!target.setupMCP);

/**
 * Get targets that support command execution (agent running)
 */
export const getTargetsWithCommandSupport = (): readonly Target[] =>
  getImplementedTargets().filter((target) => !!target.executeCommand);

/**
 * Check if target is implemented
 */
export const isTargetImplemented = (id: string): boolean => {
  const target = getAllTargets().find((t) => t.id === id);
  return target?.isImplemented ?? false;
};

/**
 * Utility type for target IDs
 */
export type TargetID = ReturnType<typeof getAllTargetIDs>[number];

/**
 * Legacy aliases for backward compatibility
 * @deprecated Use getAllTargets() instead
 */
export const ALL_TARGETS = getAllTargets;

/**
 * @deprecated Use getImplementedTargets() instead
 */
export const IMPLEMENTED_TARGETS = getImplementedTargets;
