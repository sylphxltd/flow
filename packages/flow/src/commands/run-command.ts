import fs from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import { targetManager } from '../core/target-manager.js';
import { CLIError } from '../utils/error-handler.js';
import { getAgentsDir } from '../utils/config/paths.js';

export async function loadAgentContent(agentName: string, agentFilePath?: string): Promise<string> {
  const { enhanceAgentContent } = await import('../utils/agent-enhancer.js');

  try {
    // If specific file path provided, load from there
    if (agentFilePath) {
      const content = await fs.readFile(path.resolve(agentFilePath), 'utf-8');
      return content;
    }

    // First try to load from .claude/agents/ directory (processed agents with rules and styles)
    const claudeAgentPath = path.join(process.cwd(), '.claude', 'agents', `${agentName}.md`);

    try {
      const content = await fs.readFile(claudeAgentPath, 'utf-8');
      return content;
    } catch (_error) {
      // Try to load from local agents/ directory (user-defined agents)
      const localAgentPath = path.join(process.cwd(), 'agents', `${agentName}.md`);

      try {
        const content = await fs.readFile(localAgentPath, 'utf-8');
        // Enhance user-defined agents with rules and styles
        return await enhanceAgentContent(content);
      } catch (_error2) {
        // Try to load from the package's agents directory
        const packageAgentsDir = getAgentsDir();
        const packageAgentPath = path.join(packageAgentsDir, `${agentName}.md`);

        const content = await fs.readFile(packageAgentPath, 'utf-8');
        // Enhance package agents with rules and styles
        return await enhanceAgentContent(content);
      }
    }
  } catch (_error) {
    throw new CLIError(
      `Agent '${agentName}' not found${agentFilePath ? ` at ${agentFilePath}` : ''}`,
      'AGENT_NOT_FOUND'
    );
  }
}

export function extractAgentInstructions(agentContent: string): string {
  // Extract content after YAML front matter
  const yamlFrontMatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
  const match = agentContent.match(yamlFrontMatterRegex);

  if (match) {
    return agentContent.substring(match[0].length).trim();
  }

  // If no front matter, return the full content
  return agentContent.trim();
}

function executeTargetCommand(
  targetId: string,
  systemPrompt: string,
  userPrompt: string,
  options: RunCommandOptions
): Promise<void> {
  // Get the target object
  const targetOption = targetManager.getTarget(targetId);

  if (targetOption._tag === 'None') {
    throw new CLIError(`Target not found: ${targetId}`, 'TARGET_NOT_FOUND');
  }

  const target = targetOption.value;

  // Check if the target is implemented
  if (!target.isImplemented) {
    throw new CLIError(
      `Target '${targetId}' is not implemented. Supported targets: ${getExecutableTargets().join(', ')}`,
      'TARGET_NOT_IMPLEMENTED'
    );
  }

  // Check if the target supports command execution
  if (!target.executeCommand) {
    throw new CLIError(
      `Target '${targetId}' does not support command execution. Supported targets: ${getExecutableTargets().join(', ')}`,
      'EXECUTION_NOT_SUPPORTED'
    );
  }

  // Use the target's executeCommand method
  return target.executeCommand(systemPrompt, userPrompt, options);
}

/**
 * Get list of targets that support command execution
 */
function getExecutableTargets(): string[] {
  return targetManager.getImplementedTargetIDs().filter((targetId) => {
    const targetOption = targetManager.getTarget(targetId);
    if (targetOption._tag === 'None') {
      return false;
    }
    return targetOption.value.executeCommand !== undefined;
  });
}

/**
 * LEGACY: run command has been integrated into the flow command.
 * Use `flow [prompt]` instead of standalone `run` command.
 *
 * This file now only exports utility functions:
 * - loadAgentContent()
 * - extractAgentInstructions()
 *
 * These are used internally by the flow command.
 */
