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
import { pathSecurity } from './security.js';

/**
 * Get the dist directory (where assets live)
 */
function getDistDir(): string {
  const __filename = fileURLToPath(import.meta.url);

  // Find dist directory - code is always bundled into dist/
  const distIndex = __filename.lastIndexOf('/dist/');
  if (distIndex === -1) {
    // In test/development environments, we might be running from src/
    // Try to find the project root and look for dist directory
    const projectRootIndex = __filename.lastIndexOf('/src/');
    if (projectRootIndex !== -1) {
      const projectRoot = __filename.substring(0, projectRootIndex);
      const distDir = path.join(projectRoot, 'dist');

      // Check if dist directory exists
      if (fs.existsSync(distDir)) {
        return distDir;
      }

      // If dist doesn't exist yet, assume project root as base for development
      return projectRoot;
    }

    throw new Error('Code must run from dist/ directory or be in a project with dist/ available');
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
 * Get path to knowledge directory
 */
export function getKnowledgeDir(): string {
  return path.join(ASSETS_ROOT, 'knowledge');
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
  };
}
