/**
 * Rule Manager
 * Manages rule state and operations
 */
import { loadAllRules } from './rule-loader.js';
let state = null;
/**
 * Get the app store (lazy import to avoid circular dependencies)
 */
let getAppStore = null;
/**
 * Set the app store getter (called during initialization)
 */
export function setRuleAppStoreGetter(getter) {
    getAppStore = getter;
}
/**
 * Initialize rule manager
 */
export async function initializeRuleManager(cwd) {
    const allRules = await loadAllRules(cwd);
    const ruleMap = new Map();
    for (const rule of allRules) {
        ruleMap.set(rule.id, rule);
    }
    state = {
        rules: ruleMap,
        cwd,
    };
    // Initialize store with default enabled rules
    if (getAppStore) {
        const store = getAppStore();
        if (store.getState) {
            const currentEnabledRules = store.getState().enabledRuleIds || [];
            // If no rules are enabled yet, enable all rules that have enabled: true in metadata
            if (currentEnabledRules.length === 0) {
                const defaultEnabledRules = allRules
                    .filter((rule) => rule.metadata.enabled !== false)
                    .map((rule) => rule.id);
                if (defaultEnabledRules.length > 0) {
                    store.getState().setEnabledRuleIds(defaultEnabledRules);
                }
            }
        }
    }
}
/**
 * Get all available rules
 */
export function getAllRules() {
    if (!state) {
        return [];
    }
    return Array.from(state.rules.values());
}
/**
 * Get rule by ID
 */
export function getRuleById(id) {
    if (!state) {
        return null;
    }
    return state.rules.get(id) || null;
}
/**
 * Get enabled rule IDs from store
 */
export function getEnabledRuleIds() {
    if (getAppStore) {
        const store = getAppStore();
        if (store.getState) {
            return store.getState().enabledRuleIds || [];
        }
    }
    return [];
}
/**
 * Get enabled rules
 */
export function getEnabledRules() {
    if (!state) {
        return [];
    }
    const enabledIds = getEnabledRuleIds();
    return enabledIds
        .map((id) => state.rules.get(id))
        .filter((rule) => rule !== null);
}
/**
 * Toggle a rule on/off
 */
export function toggleRule(ruleId) {
    if (!state || !state.rules.has(ruleId)) {
        return false;
    }
    if (getAppStore) {
        const store = getAppStore();
        if (store.getState) {
            const currentEnabled = store.getState().enabledRuleIds || [];
            if (currentEnabled.includes(ruleId)) {
                // Disable: remove from list
                store.getState().setEnabledRuleIds(currentEnabled.filter((id) => id !== ruleId));
            }
            else {
                // Enable: add to list
                store.getState().setEnabledRuleIds([...currentEnabled, ruleId]);
            }
            return true;
        }
    }
    return false;
}
/**
 * Enable a rule
 */
export function enableRule(ruleId) {
    if (!state || !state.rules.has(ruleId)) {
        return false;
    }
    if (getAppStore) {
        const store = getAppStore();
        if (store.getState) {
            const currentEnabled = store.getState().enabledRuleIds || [];
            if (!currentEnabled.includes(ruleId)) {
                store.getState().setEnabledRuleIds([...currentEnabled, ruleId]);
            }
            return true;
        }
    }
    return false;
}
/**
 * Disable a rule
 */
export function disableRule(ruleId) {
    if (!state || !state.rules.has(ruleId)) {
        return false;
    }
    if (getAppStore) {
        const store = getAppStore();
        if (store.getState) {
            const currentEnabled = store.getState().enabledRuleIds || [];
            store.getState().setEnabledRuleIds(currentEnabled.filter((id) => id !== ruleId));
            return true;
        }
    }
    return false;
}
/**
 * Reload rules from disk
 */
export async function reloadRules() {
    if (!state) {
        return;
    }
    const cwd = state.cwd;
    const currentEnabled = getEnabledRuleIds();
    await initializeRuleManager(cwd);
    // Keep only enabled rules that still exist
    if (state && getAppStore) {
        const store = getAppStore();
        if (store.getState) {
            const validEnabled = currentEnabled.filter((id) => state.rules.has(id));
            store.getState().setEnabledRuleIds(validEnabled);
        }
    }
}
/**
 * Set enabled rules (replaces current enabled rules)
 */
export function setEnabledRules(ruleIds) {
    if (!state) {
        return false;
    }
    // Validate all rule IDs exist
    const validRuleIds = ruleIds.filter((id) => state.rules.has(id));
    if (getAppStore) {
        const store = getAppStore();
        if (store.getState) {
            store.getState().setEnabledRuleIds(validRuleIds);
            return true;
        }
    }
    return false;
}
/**
 * Get combined content of all enabled rules
 */
export function getEnabledRulesContent() {
    const enabledRules = getEnabledRules();
    if (enabledRules.length === 0) {
        return '';
    }
    return enabledRules.map((rule) => rule.content).join('\n\n');
}
//# sourceMappingURL=rule-manager.js.map