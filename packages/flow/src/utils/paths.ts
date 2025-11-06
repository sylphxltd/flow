/**
 * Centralized path resolution for all static assets
 *
 * Structure:
 *   assets/ (at project root) - single source of truth
 *
 * Path resolution:
 * - Development: src/utils/paths.ts reads ../assets
 * - Production: dist/xxx.js reads ../assets
 * - No copying needed, both read same location
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathSecurity } from './security.js';

/**
 * Find package root by walking up directory tree
 * Pure function - finds package.json location
 *
 * @param context - Optional context for error message (e.g., 'assets', 'migrations')
 * @returns Absolute path to package root directory
 * @throws Error if package.json cannot be found within 10 levels
 *
 * @example
 * const root = findPackageRoot(); // 'Cannot find package.json'
 * const root = findPackageRoot('drizzle migrations'); // 'Cannot find package.json - drizzle migrations location unknown'
 */
export function findPackageRoot(context?: string): string {
  const __filename = fileURLToPath(import.meta.url);
  let currentDir = path.dirname(__filename);

  // Walk up max 10 levels to find package.json
  for (let i = 0; i < 10; i++) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // reached filesystem root
    currentDir = parentDir;
  }

  const errorMsg = context
    ? `Cannot find package.json - ${context} location unknown`
    : 'Cannot find package.json';
  throw new Error(errorMsg);
}

// Find monorepo root (parent of packages/flow) for assets
const PACKAGE_ROOT = findPackageRoot();
const MONOREPO_ROOT = path.join(PACKAGE_ROOT, '..', '..');
const ASSETS_ROOT = fs.existsSync(path.join(MONOREPO_ROOT, 'assets'))
  ? path.join(MONOREPO_ROOT, 'assets')
  : path.join(PACKAGE_ROOT, 'assets');

/**
 * Get path to agents directory
 */
export function getAgentsDir(): string {
  return path.join(ASSETS_ROOT, 'agents');
}

/**
 * Get path to templates directory
 */
export function getTemplatesDir(): string {
  return path.join(ASSETS_ROOT, 'templates');
}

/**
 * Get path to rules directory
 */
export function getRulesDir(): string {
  return path.join(ASSETS_ROOT, 'rules');
}

/**
 * Get path to knowledge directory
 */
export function getKnowledgeDir(): string {
  return path.join(ASSETS_ROOT, 'knowledge');
}

/**
 * Get path to output styles directory
 */
export function getOutputStylesDir(): string {
  return path.join(ASSETS_ROOT, 'output-styles');
}

/**
 * Get path to slash commands directory
 */
export function getSlashCommandsDir(): string {
  return path.join(ASSETS_ROOT, 'slash-commands');
}

/**
 * Get path to a specific rule file with path traversal protection
 */
export function getRuleFile(filename: string): string {
  // Validate filename to prevent path traversal
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error(`Invalid filename: ${filename}. Path traversal not allowed.`);
  }

  // Validate filename contains only safe characters
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    throw new Error(`Filename contains invalid characters: ${filename}`);
  }

  // Safely join paths
  const rulesDir = getRulesDir();
  const filePath = pathSecurity.safeJoin(rulesDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Rule file not found: ${filename} (looked in ${rulesDir})`);
  }

  return filePath;
}

/**
 * Debug info - shows where assets are resolved from
 */
export function getPathsInfo() {
  return {
    assetsRoot: ASSETS_ROOT,
    agents: getAgentsDir(),
    templates: getTemplatesDir(),
    rules: getRulesDir(),
    outputStyles: getOutputStylesDir(),
    slashCommands: getSlashCommandsDir(),
  };
}
