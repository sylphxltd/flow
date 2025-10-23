/**
 * Centralized path resolution for all static assets
 *
 * Structure:
 *   assets/agents/     -> copied to dist/assets/agents/
 *   assets/templates/  -> copied to dist/assets/templates/
 *   assets/rules/      -> copied to dist/assets/rules/
 *
 * Assets are always in dist/assets/ when published.
 * During development, we reference from project root.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get the dist directory (where assets live)
 */
function getDistDir(): string {
  const __filename = fileURLToPath(import.meta.url);

  // Find dist directory - code is always bundled into dist/
  const distIndex = __filename.lastIndexOf('/dist/');
  if (distIndex === -1) {
    throw new Error('Code must run from dist/ directory');
  }

  return __filename.substring(0, distIndex + 5); // +5 to include '/dist'
}

const ASSETS_ROOT = path.join(getDistDir(), 'assets');

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
 * Get path to a specific rule file
 */
export function getRuleFile(filename: string): string {
  const filePath = path.join(getRulesDir(), filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Rule file not found: ${filename} (looked in ${getRulesDir()})`);
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
  };
}
