/**
 * Rules configuration
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Available core rules files
 */
export const CORE_RULES = {
  reasoning: 'reasoning.md',
  communication: 'communication.md',
  security: 'security.md',
  quality: 'quality.md',
};

/**
 * Get the path to a specific core rules file
 */
export function getRulesPath(ruleType = 'reasoning') {
  // Since this runs from the project root, use relative path directly
  return path.join(process.cwd(), 'config', 'rules', CORE_RULES[ruleType]);
}

/**
 * Get all available rule types
 */
export function getAllRuleTypes() {
  return Object.keys(CORE_RULES);
}

/**
 * Check if a rule file exists
 */
export function ruleFileExists(ruleType) {
  const rulePath = getRulesPath(ruleType);
  return fs.existsSync(rulePath);
}

/**
 * Rules filename mapping by target
 */
export const RULES_FILES = {
  'claude-code': 'CLAUDE.md',
  opencode: 'AGENTS.md',
};
