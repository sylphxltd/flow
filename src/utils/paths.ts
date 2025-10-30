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
 * Get the project root directory
 */
function getProjectRoot(): string {
  const __filename = fileURLToPath(import.meta.url);

  // From src/utils/paths.ts → find /src/ and go up
  const srcIndex = __filename.lastIndexOf('/src/');
  if (srcIndex !== -1) {
    return __filename.substring(0, srcIndex);
  }

  // From dist/xxx.js → find /dist/ and go up
  const distIndex = __filename.lastIndexOf('/dist/');
  if (distIndex !== -1) {
    return __filename.substring(0, distIndex);
  }

  throw new Error('Cannot determine project root - code must be in src/ or dist/');
}

const ASSETS_ROOT = path.join(getProjectRoot(), 'assets');

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
  };
}
