/**
 * Agent Loader
 * Loads agent definitions from markdown files with front matter
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { homedir } from 'node:os';
import matter from 'gray-matter';
import type { Agent, AgentMetadata } from '../types/agent.types.js';

/**
 * Load a single agent from a markdown file
 */
export async function loadAgentFromFile(filePath: string, isBuiltin: boolean = false): Promise<Agent | null> {
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

    // Get agent ID from filename
    const { name: fileName } = parse(filePath);

    return {
      id: fileName,
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
 * Load all agents from a directory
 */
export async function loadAgentsFromDirectory(dirPath: string, isBuiltin: boolean = false): Promise<Agent[]> {
  try {
    const files = await readdir(dirPath);
    const agentFiles = files.filter((f) => f.endsWith('.md'));

    const agents = await Promise.all(
      agentFiles.map((file) => loadAgentFromFile(join(dirPath, file), isBuiltin))
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
