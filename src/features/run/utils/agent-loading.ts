/**
 * Agent Loading Utilities
 * Pure functions for agent file path resolution and content extraction
 */

import type { Result } from '../../../core/functional/result.js';
import { success, failure } from '../../../core/functional/result.js';
import type { AppError } from '../../../core/functional/error-types.js';
import { validationError } from '../../../core/functional/error-types.js';

// ===== Types =====

export interface AgentSearchPaths {
  claudeAgentPath: string;
  localAgentPath: string;
  packageAgentPath: string;
}

export interface AgentLoadConfig {
  agentName: string;
  agentFilePath?: string;
  searchPaths: AgentSearchPaths;
}

// ===== Pure Path Construction =====

/**
 * Build all possible agent file paths to search
 * Pure - no I/O, just path construction
 */
export function buildAgentSearchPaths(
  agentName: string,
  cwd: string,
  packageAgentsDir: string
): AgentSearchPaths {
  return {
    claudeAgentPath: `${cwd}/.claude/agents/${agentName}.md`,
    localAgentPath: `${cwd}/agents/${agentName}.md`,
    packageAgentPath: `${packageAgentsDir}/${agentName}.md`,
  };
}

/**
 * Build agent load configuration
 * Pure - combines inputs into config object
 */
export function buildAgentLoadConfig(
  agentName: string,
  agentFilePath: string | undefined,
  cwd: string,
  packageAgentsDir: string
): AgentLoadConfig {
  return {
    agentName,
    agentFilePath,
    searchPaths: buildAgentSearchPaths(agentName, cwd, packageAgentsDir),
  };
}

/**
 * Determine agent file load priority
 * Returns ordered list of paths to try
 * Pure - path prioritization logic
 */
export function getAgentFileLoadPriority(config: AgentLoadConfig): string[] {
  const paths: string[] = [];

  // 1. Explicit file path takes highest priority
  if (config.agentFilePath) {
    paths.push(config.agentFilePath);
  }

  // 2. .claude/agents/ (processed agents with rules and styles)
  paths.push(config.searchPaths.claudeAgentPath);

  // 3. agents/ (user-defined agents)
  paths.push(config.searchPaths.localAgentPath);

  // 4. package agents (built-in agents)
  paths.push(config.searchPaths.packageAgentPath);

  return paths;
}

// ===== Content Extraction =====

/**
 * Extract agent instructions from markdown content
 * Removes YAML front matter if present
 * Pure - string transformation only
 */
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

/**
 * Parse YAML front matter from markdown
 * Pure - string parsing
 */
export function parseYamlFrontMatter(content: string): Record<string, string> {
  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  const metadata: Record<string, string> = {};

  if (!yamlMatch) {
    return metadata;
  }

  const yamlContent = yamlMatch[1];
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      metadata[key] = value;
    }
  }

  return metadata;
}

/**
 * Parse agent content to extract metadata and instructions
 * Pure - parses markdown structure
 */
export function parseAgentContent(content: string): {
  metadata: Record<string, string>;
  instructions: string;
} {
  return {
    metadata: parseYamlFrontMatter(content),
    instructions: extractAgentInstructions(content),
  };
}

// ===== Validation =====

/**
 * Validate agent name format
 * Pure - checks string pattern
 */
export function validateAgentName(agentName: string): Result<string, AppError> {
  if (!agentName || agentName.trim().length === 0) {
    return failure(validationError('Agent name cannot be empty', 'agentName', agentName));
  }

  // Check for invalid characters
  if (!/^[a-zA-Z0-9_-]+$/.test(agentName)) {
    return failure(
      validationError(
        'Agent name can only contain letters, numbers, hyphens, and underscores',
        'agentName',
        agentName
      )
    );
  }

  return success(agentName);
}
