/**
 * Agent Enhancer - Append rules and output styles to agent content
 *
 * This module provides utilities to enhance agent files with:
 * - Rules (from assets/rules/core.md)
 * - Output Styles (from assets/output-styles/*.md)
 *
 * These are appended to agent content to ensure every agent has
 * access to the same rules and output styles without duplicating
 * them in CLAUDE.md or other system prompts.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { getRulesDir, getOutputStylesDir } from './paths.js';
import { yamlUtils } from './target-utils.js';

/**
 * Load and combine rules and output styles
 */
export async function loadRulesAndStyles(): Promise<string> {
  const sections: string[] = [];

  // Load rules
  const rulesContent = await loadRules();
  if (rulesContent) {
    sections.push(rulesContent);
  }

  // Load output styles
  const stylesContent = await loadOutputStyles();
  if (stylesContent) {
    sections.push(stylesContent);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Load rules from assets/rules/core.md
 */
async function loadRules(): Promise<string> {
  try {
    const rulesDir = getRulesDir();
    const coreRulesPath = path.join(rulesDir, 'core.md');

    const content = await fs.readFile(coreRulesPath, 'utf8');

    // Strip YAML front matter
    return await yamlUtils.stripFrontMatter(content);
  } catch (error) {
    // If rules file doesn't exist, return empty string
    return '';
  }
}

/**
 * Load output styles from assets/output-styles/
 */
async function loadOutputStyles(): Promise<string> {
  try {
    const outputStylesDir = getOutputStylesDir();
    const files = await fs.readdir(outputStylesDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    if (mdFiles.length === 0) {
      return '';
    }

    const sections: string[] = [];

    for (const file of mdFiles) {
      const filePath = path.join(outputStylesDir, file);
      const content = await fs.readFile(filePath, 'utf8');

      // Strip YAML front matter
      const stripped = await yamlUtils.stripFrontMatter(content);
      sections.push(stripped);
    }

    return sections.join('\n\n');
  } catch (error) {
    // If output styles directory doesn't exist, return empty string
    return '';
  }
}

/**
 * Enhance agent content by appending rules and output styles
 */
export async function enhanceAgentContent(agentContent: string): Promise<string> {
  const rulesAndStyles = await loadRulesAndStyles();

  if (!rulesAndStyles) {
    return agentContent;
  }

  return `${agentContent}\n\n---\n\n# Rules and Output Styles\n\n${rulesAndStyles}`;
}
