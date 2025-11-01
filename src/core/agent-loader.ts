/**
 * Agent Loader
 * Loads agent definitions from markdown files with front matter
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, parse, relative } from 'node:path';
import { homedir } from 'node:os';
import matter from 'gray-matter';
import type { Agent, AgentMetadata } from '../types/agent.types.js';

/**
 * Load a single agent from a markdown file
 */
export async function loadAgentFromFile(
  filePath: string,
  isBuiltin: boolean = false,
  agentId?: string
): Promise<Agent | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const { data, content: systemPrompt } = matter(content);

    // Validate front matter
    if (!data.name || typeof data.name !== 'string') {
      console.error(`Agent file ${filePath} missing required 'name' field`);
      return null;
    }

    const metadata: AgentMetadata = {
      name: data.name,
      description: data.description || '',
    };

    // Get agent ID from parameter or filename
    const id = agentId || parse(filePath).name;

    return {
      id,
      metadata,
      systemPrompt: systemPrompt.trim(),
      isBuiltin,
      filePath,
    };
  } catch (error) {
    console.error(`Failed to load agent from ${filePath}:`, error);
    return null;
  }
}

/**
 * Load all agents from a directory (recursively)
 */
export async function loadAgentsFromDirectory(dirPath: string, isBuiltin: boolean = false): Promise<Agent[]> {
  try {
    // Read directory recursively to support subdirectories
    const files = await readdir(dirPath, { recursive: true, withFileTypes: true });

    // Filter for .md files and calculate agent IDs from relative paths
    const agentFiles = files
      .filter((f) => f.isFile() && f.name.endsWith('.md'))
      .map((f) => {
        const fullPath = join(f.parentPath || f.path, f.name);
        // Calculate relative path from dirPath and remove .md extension
        const relativePath = relative(dirPath, fullPath).replace(/\.md$/, '');
        return { fullPath, agentId: relativePath };
      });

    const agents = await Promise.all(
      agentFiles.map(({ fullPath, agentId }) => loadAgentFromFile(fullPath, isBuiltin, agentId))
    );

    return agents.filter((agent): agent is Agent => agent !== null);
  } catch (error) {
    // Directory doesn't exist or can't be read
    return [];
  }
}

/**
 * Get all agent search paths
 */
export function getAgentSearchPaths(cwd: string): string[] {
  const globalPath = join(homedir(), '.sylphx-flow', 'agents');
  const projectPath = join(cwd, '.sylphx-flow', 'agents');

  return [globalPath, projectPath];
}

/**
 * Load all available agents from all sources
 */
export async function loadAllAgents(cwd: string, builtinAgents: Agent[]): Promise<Agent[]> {
  const [globalPath, projectPath] = getAgentSearchPaths(cwd);

  const [globalAgents, projectAgents] = await Promise.all([
    loadAgentsFromDirectory(globalPath, false),
    loadAgentsFromDirectory(projectPath, false),
  ]);

  // Priority: builtin < global < project
  // Use Map to deduplicate by ID (later entries override earlier ones)
  const agentMap = new Map<string, Agent>();

  // Add builtin agents first
  for (const agent of builtinAgents) {
    agentMap.set(agent.id, agent);
  }

  // Add global agents (override builtins)
  for (const agent of globalAgents) {
    agentMap.set(agent.id, agent);
  }

  // Add project agents (override globals and builtins)
  for (const agent of projectAgents) {
    agentMap.set(agent.id, agent);
  }

  return Array.from(agentMap.values());
}
