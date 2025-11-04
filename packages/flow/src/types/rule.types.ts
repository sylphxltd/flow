/**
 * Rule Types
 * Defines shared system prompt rules that apply to all agents
 */

/**
 * Rule metadata from front matter
 */
export interface RuleMetadata {
  name: string;
  description: string;
  enabled?: boolean; // Default enabled state
}

/**
 * Rule definition
 */
export interface Rule {
  id: string; // File path relative to rules directory (e.g., 'coding/typescript')
  metadata: RuleMetadata;
  content: string; // Rule content to add to system prompt
  isBuiltin: boolean; // Whether this is a system-provided rule
  filePath?: string; // Path to the rule file
}
