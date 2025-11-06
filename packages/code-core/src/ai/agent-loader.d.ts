/**
 * Agent Loader
 * Loads agent definitions from markdown files with front matter
 */
import type { Agent } from '../types/agent.types.js';
/**
 * Load a single agent from a markdown file
 */
export declare function loadAgentFromFile(filePath: string, isBuiltin?: boolean, agentId?: string): Promise<Agent | null>;
/**
 * Load all agents from a directory (recursively)
 */
export declare function loadAgentsFromDirectory(dirPath: string, isBuiltin?: boolean): Promise<Agent[]>;
/**
 * Get system agents path (bundled with the app)
 */
export declare function getSystemAgentsPath(): Promise<string>;
/**
 * Get all agent search paths
 */
export declare function getAgentSearchPaths(cwd: string): string[];
/**
 * Load all available agents from all sources
 */
export declare function loadAllAgents(cwd: string): Promise<Agent[]>;
//# sourceMappingURL=agent-loader.d.ts.map