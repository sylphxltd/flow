/**
 * Rule Manager
 * Manages rule state and operations
 */
import type { Rule } from '../types/rule.types.js';
/**
 * Set the app store getter (called during initialization)
 */
export declare function setRuleAppStoreGetter(getter: () => any): void;
/**
 * Initialize rule manager
 */
export declare function initializeRuleManager(cwd: string): Promise<void>;
/**
 * Get all available rules
 */
export declare function getAllRules(): Rule[];
/**
 * Get rule by ID
 */
export declare function getRuleById(id: string): Rule | null;
/**
 * Get enabled rule IDs from store
 */
export declare function getEnabledRuleIds(): string[];
/**
 * Get enabled rules
 */
export declare function getEnabledRules(): Rule[];
/**
 * Toggle a rule on/off
 */
export declare function toggleRule(ruleId: string): boolean;
/**
 * Enable a rule
 */
export declare function enableRule(ruleId: string): boolean;
/**
 * Disable a rule
 */
export declare function disableRule(ruleId: string): boolean;
/**
 * Reload rules from disk
 */
export declare function reloadRules(): Promise<void>;
/**
 * Set enabled rules (replaces current enabled rules)
 */
export declare function setEnabledRules(ruleIds: string[]): boolean;
/**
 * Get combined content of all enabled rules
 */
export declare function getEnabledRulesContent(): string;
//# sourceMappingURL=rule-manager.d.ts.map