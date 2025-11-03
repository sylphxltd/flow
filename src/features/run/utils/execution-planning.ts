/**
 * Execution Planning Utilities
 * Pure functions for building execution plans
 */

import type { Option } from '../../../core/functional/option.js';
import { none, some } from '../../../core/functional/option.js';
import type { Result } from '../../../core/functional/result.js';
import { success, failure } from '../../../core/functional/result.js';
import type { AppError } from '../../../core/functional/error-types.js';
import { validationError } from '../../../core/functional/error-types.js';
import { extractAgentInstructions } from './agent-loading.js';

// ===== Types =====

export interface RunCommandOptions {
  target?: string;
  verbose?: boolean;
  [key: string]: unknown;
}

export interface ExecutionPlan {
  targetId: string;
  systemPrompt: string;
  userPrompt: string;
  agentName: string;
  agentPath: string;
  options: RunCommandOptions;
}

// ===== Validation =====

/**
 * Validate run command options
 * Pure - validates option structure
 */
export function validateRunOptions(options: RunCommandOptions): Result<RunCommandOptions, AppError> {
  // Validate target if specified
  if (options.target && typeof options.target !== 'string') {
    return failure(validationError('Target must be a string', 'target', options.target));
  }

  return success(options);
}

// ===== Target Selection =====

/**
 * Determine which target to use
 * Pure - decision logic based on options and available targets
 */
export function selectTarget(
  optionTarget: string | undefined,
  implementedTargets: string[]
): Option<string> {
  // If target specified in options, use it
  if (optionTarget) {
    return some(optionTarget);
  }

  // If no target specified, try to auto-detect
  // This is pure because we're not actually detecting, just returning None
  // The actual detection happens in the target-manager
  return none;
}

/**
 * Filter executable targets from list
 * Pure - filters array based on predicate
 */
export function filterExecutableTargets(targets: Array<{
  id: string;
  isImplemented: boolean;
  executeCommand?: unknown;
}>): string[] {
  return targets
    .filter((t) => t.isImplemented && t.executeCommand !== undefined)
    .map((t) => t.id);
}

// ===== Prompt Building =====

/**
 * Build system prompt from agent content
 * Pure - string composition
 */
export function buildSystemPrompt(agentInstructions: string, additionalContext?: string): string {
  if (additionalContext) {
    return `${agentInstructions}\n\n${additionalContext}`;
  }
  return agentInstructions;
}

/**
 * Build user prompt with optional context
 * Pure - string composition
 */
export function buildUserPrompt(prompt: string, context?: string): string {
  if (context) {
    return `Context: ${context}\n\n${prompt}`;
  }
  return prompt;
}

// ===== Execution Planning =====

/**
 * Build execution plan for agent run
 * Pure - combines all inputs into execution plan
 */
export function buildExecutionPlan(
  targetId: string,
  agentName: string,
  agentPath: string,
  agentContent: string,
  userPrompt: string,
  options: RunCommandOptions
): ExecutionPlan {
  const agentInstructions = extractAgentInstructions(agentContent);
  const systemPrompt = buildSystemPrompt(agentInstructions);

  return {
    targetId,
    systemPrompt,
    userPrompt,
    agentName,
    agentPath,
    options,
  };
}
