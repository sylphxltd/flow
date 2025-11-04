/**
 * Agent Loader
 * Loads agent definitions from markdown files with front matter
 */

import { readFile, readdir, access } from 'node:fs/promises';
import { join, parse, relative, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
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
 * Get system agents path (bundled with the app)
 */
export async function getSystemAgentsPath(): Promise<string> {
  // Get the directory of the current module (cross-platform)
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);

  // In production (dist), assets are at dist/assets/agents
  // In development (src), go up to project root: src/core -> project root
  const distPath = join(currentDir, '..', 'assets', 'agents');
  const devPath = join(currentDir, '..', '..', 'assets', 'agents');

  // Check which one exists (try dist first, then dev)
  try {
    await access(distPath);
    return distPath;
  } catch {
    return devPath;
  }
}

/**
 * Get all agent search paths
 */
export function getAgentSearchPaths(cwd: string): string[] {
  const globalPath = join(homedir(), '.sylphx-code', 'agents');
  const projectPath = join(cwd, '.sylphx-code', 'agents');

  return [globalPath, projectPath];
}

/**
 * Load all available agents from all sources
 */
export async function loadAllAgents(cwd: string): Promise<Agent[]> {
  const systemPath = await getSystemAgentsPath();
  const [globalPath, projectPath] = getAgentSearchPaths(cwd);

  const [systemAgents, globalAgents, projectAgents] = await Promise.all([
    loadAgentsFromDirectory(systemPath, true),  // System agents are marked as builtin
    loadAgentsFromDirectory(globalPath, false),
    loadAgentsFromDirectory(projectPath, false),
  ]);

  // Priority: system < global < project
  // Use Map to deduplicate by ID (later entries override earlier ones)
  const agentMap = new Map<string, Agent>();

  // Add system agents first (lowest priority)
  for (const agent of systemAgents) {
    agentMap.set(agent.id, agent);
  }

  // Add global agents (override system)
  for (const agent of globalAgents) {
    agentMap.set(agent.id, agent);
  }

  // Add project agents (override globals and system)
  for (const agent of projectAgents) {
    agentMap.set(agent.id, agent);
  }

  return Array.from(agentMap.values());
}
