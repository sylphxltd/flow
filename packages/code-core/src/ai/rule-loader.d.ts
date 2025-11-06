/**
 * Rule Loader
 * Loads rule definitions from markdown files with front matter
 */
import type { Rule } from '../types/rule.types.js';
/**
 * Load a single rule from a markdown file
 */
export declare function loadRuleFromFile(filePath: string, isBuiltin?: boolean, ruleId?: string): Promise<Rule | null>;
/**
 * Load all rules from a directory (recursively)
 */
export declare function loadRulesFromDirectory(dirPath: string, isBuiltin?: boolean): Promise<Rule[]>;
/**
 * Get system rules path (bundled with the app)
 */
export declare function getSystemRulesPath(): Promise<string>;
/**
 * Get all rule search paths
 */
export declare function getRuleSearchPaths(cwd: string): string[];
/**
 * Load all available rules from all sources
 */
export declare function loadAllRules(cwd: string): Promise<Rule[]>;
//# sourceMappingURL=rule-loader.d.ts.map