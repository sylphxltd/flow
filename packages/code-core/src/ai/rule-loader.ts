/**
 * Rule Loader
 * Loads rule definitions from markdown files with front matter
 */

import { readFile, readdir, access } from 'node:fs/promises';
import { join, parse, relative, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import type { Rule, RuleMetadata } from '../types/rule.types.js';

/**
 * Load a single rule from a markdown file
 */
export async function loadRuleFromFile(
  filePath: string,
  isBuiltin: boolean = false,
  ruleId?: string
): Promise<Rule | null> {
  try {
    const fileContent = await readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Validate front matter
    if (!data.name || typeof data.name !== 'string') {
      console.error(`Rule file ${filePath} missing required 'name' field`);
      return null;
    }

    const metadata: RuleMetadata = {
      name: data.name,
      description: data.description || '',
      enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
    };

    // Get rule ID from parameter or filename
    const id = ruleId || parse(filePath).name;

    return {
      id,
      metadata,
      content: content.trim(),
      isBuiltin,
      filePath,
    };
  } catch (error) {
    console.error(`Failed to load rule from ${filePath}:`, error);
    return null;
  }
}

/**
 * Load all rules from a directory (recursively)
 */
export async function loadRulesFromDirectory(dirPath: string, isBuiltin: boolean = false): Promise<Rule[]> {
  try {
    // Read directory recursively to support subdirectories
    const files = await readdir(dirPath, { recursive: true, withFileTypes: true });

    // Filter for .md files and calculate rule IDs from relative paths
    const ruleFiles = files
      .filter((f) => f.isFile() && f.name.endsWith('.md'))
      .map((f) => {
        const fullPath = join(f.parentPath || f.path, f.name);
        // Calculate relative path from dirPath and remove .md extension
        const relativePath = relative(dirPath, fullPath).replace(/\.md$/, '');
        return { fullPath, ruleId: relativePath };
      });

    const rules = await Promise.all(
      ruleFiles.map(({ fullPath, ruleId }) => loadRuleFromFile(fullPath, isBuiltin, ruleId))
    );

    return rules.filter((rule): rule is Rule => rule !== null);
  } catch (error) {
    // Directory doesn't exist or can't be read
    return [];
  }
}

/**
 * Get system rules path (bundled with the app)
 */
export async function getSystemRulesPath(): Promise<string> {
  // Get the directory of the current module (cross-platform)
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);

  // In production (dist), assets are at dist/assets/rules
  // In development (src), go up to project root: src/core -> project root
  const distPath = join(currentDir, '..', 'assets', 'rules');
  const devPath = join(currentDir, '..', '..', 'assets', 'rules');

  // Check which one exists (try dist first, then dev)
  try {
    await access(distPath);
    return distPath;
  } catch {
    return devPath;
  }
}

/**
 * Get all rule search paths
 */
export function getRuleSearchPaths(cwd: string): string[] {
  const globalPath = join(homedir(), '.sylphx-code', 'rules');
  const projectPath = join(cwd, '.sylphx-code', 'rules');

  return [globalPath, projectPath];
}

/**
 * Load all available rules from all sources
 */
export async function loadAllRules(cwd: string): Promise<Rule[]> {
  const systemPath = await getSystemRulesPath();
  const [globalPath, projectPath] = getRuleSearchPaths(cwd);

  const [systemRules, globalRules, projectRules] = await Promise.all([
    loadRulesFromDirectory(systemPath, true),  // System rules are marked as builtin
    loadRulesFromDirectory(globalPath, false),
    loadRulesFromDirectory(projectPath, false),
  ]);

  // Priority: system < global < project
  // Use Map to deduplicate by ID (later entries override earlier ones)
  const ruleMap = new Map<string, Rule>();

  // Add system rules first (lowest priority)
  for (const rule of systemRules) {
    ruleMap.set(rule.id, rule);
  }

  // Add global rules (override system)
  for (const rule of globalRules) {
    ruleMap.set(rule.id, rule);
  }

  // Add project rules (override globals and system)
  for (const rule of projectRules) {
    ruleMap.set(rule.id, rule);
  }

  return Array.from(ruleMap.values());
}
