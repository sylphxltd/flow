/**
 * Target registry - contains all available targets
 */

import type { Target } from '../types.js';
import { opencodeTarget } from '../targets/opencode.js';
import { claudeCodeTarget } from '../targets/claude-code.js';

/**
 * Target registry to avoid circular dependencies
 * Targets are registered at runtime
 */
export class TargetRegistry {
  private targets: Target[] = [];

  /**
   * Register a target
   */
  register(target: Target) {
    this.targets.push(target);
  }

  /**
   * Get all targets
   */
  getAllTargets(): Target[] {
    return [...this.targets];
  }

  /**
   * Get implemented targets only
   */
  getImplementedTargets(): Target[] {
    return this.targets.filter(target => target.isImplemented);
  }

  /**
   * Get all target IDs
   */
  getAllTargetIDs(): string[] {
    return this.targets.map(target => target.id);
  }

  /**
   * Get implemented target IDs
   */
  getImplementedTargetIDs(): string[] {
    return this.getImplementedTargets().map(target => target.id);
  }

  /**
   * Get target by ID
   */
  getTarget(id: string): Target | undefined {
    return this.targets.find(target => target.id === id);
  }

  /**
   * Get default target
   */
  getDefaultTarget(): Target {
    const defaultTarget = this.targets.find(target => target.isDefault);
    if (!defaultTarget) {
      throw new Error('No default target configured');
    }
    return defaultTarget;
  }

  /**
   * Get targets that support MCP servers
   */
  getTargetsWithMCPSupport(): Target[] {
    return this.getImplementedTargets()
      .filter(target => target.config.installation.supportedMcpServers);
  }

  /**
   * Check if target is implemented
   */
  isTargetImplemented(id: string): boolean {
    const target = this.getTarget(id);
    return target?.isImplemented ?? false;
  }

  /**
   * Initialize targets - register all available targets
   */
  initialize() {
    if (this.targets.length > 0) {
      return; // Already initialized
    }

    this.register(opencodeTarget);
    this.register(claudeCodeTarget);
  }
}

// Global registry instance
export const targetRegistry = new TargetRegistry();

// Initialize targets immediately
targetRegistry.initialize();

/**
 * Convenience functions that delegate to the registry
 */
export const ALL_TARGETS = () => targetRegistry.getAllTargets();
export const IMPLEMENTED_TARGETS = () => targetRegistry.getImplementedTargets();
export const getAllTargetIDs = () => targetRegistry.getAllTargetIDs();
export const getImplementedTargetIDs = () => targetRegistry.getImplementedTargetIDs();
export const getDefaultTarget = () => targetRegistry.getDefaultTarget().id;
export const getTarget = (id: string) => targetRegistry.getTarget(id);
export const isTargetImplemented = (id: string) => targetRegistry.isTargetImplemented(id);
export const getTargetsWithMCPSupport = () => targetRegistry.getTargetsWithMCPSupport().map(target => target.id);

export type TargetID = ReturnType<typeof getAllTargetIDs>[number];