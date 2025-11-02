/**
 * Tool Display Utilities
 * Helper functions for tool display
 */

import { pluralize } from './tool-formatters.js';

/**
 * Truncate lines to max count, showing first and last with count
 */
export const truncateLines = (lines: string[], maxLines: number = 5): string[] => {
  if (lines.length <= maxLines) return lines;

  const hiddenCount = lines.length - 2;
  return [
    lines[0],
    `... ${hiddenCount} more ${pluralize(hiddenCount, 'line')} ...`,
    lines[lines.length - 1],
  ];
};

/**
 * Display name registry
 */
const displayNames: Record<string, string> = {
  read: 'Read',
  write: 'Write',
  edit: 'Update',
  bash: 'Bash',
  'bash-output': 'BashOutput',
  'kill-bash': 'KillBash',
  grep: 'Search',
  glob: 'Search',
  ask: 'Ask',
  updateTodos: 'Tasks',
};

/**
 * Get display name for tool
 */
export const getDisplayName = (toolName: string): string =>
  displayNames[toolName] || toolName;

/**
 * Built-in tools set
 */
const builtInTools = new Set(['ask', 'read', 'write', 'edit', 'bash', 'bash-output', 'kill-bash', 'grep', 'glob', 'updateTodos']);

/**
 * Check if tool is built-in
 */
export const isBuiltInTool = (name: string): boolean =>
  builtInTools.has(name);

/**
 * Get color for diff line
 */
export const getDiffLineColor = (line: string): string | undefined => {
  const match = line.match(/^\s*\d+\s+([-+])/);
  if (!match) return undefined;

  return match[1] === '-' ? '#FF3366' : '#00FF88';
};
