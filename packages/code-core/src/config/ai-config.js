/**
 * AI Configuration Management
 *
 * Three-tier configuration system:
 * 1. Global: ~/.sylphx-code/settings.json (user defaults, contains API keys)
 * 2. Project: ./.sylphx-code/settings.json (project preferences, no secrets)
 * 3. Local: ./.sylphx-code/settings.local.json (local overrides, gitignored)
 *
 * Priority: local > project > global
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { z } from 'zod';
import { tryCatchAsync } from '../ai/functional/result.js';
import { getAllProviders } from '../ai/providers/index.js';
/**
 * AI_PROVIDERS - Provider metadata from registry
 * Contains basic info (id, name) for UI components
 * Config schemas are defined in each provider's getConfigSchema()
 */
export const AI_PROVIDERS = getAllProviders();
/**
 * AI configuration schema
 * Uses generic Record for provider configs - validation happens at provider level
 *
 * DESIGN: No top-level defaultModel
 * - Each provider has its own defaultModel in its config
 * - Default model = last used or first in list
 * - Use camelCase for consistency
 *
 * DESIGN: Global defaults (remember last used)
 * - defaultEnabledRuleIds: Rules enabled by default for new sessions
 * - defaultAgentId: Last selected agent (e.g., 'coder')
 * - Each session can override these independently
 * - Stored in global config, applied when creating new sessions
 */
const aiConfigSchema = z.object({
    defaultProvider: z.enum(['anthropic', 'openai', 'google', 'openrouter', 'claude-code', 'zai']).optional(),
    // ❌ Removed: defaultModel - use provider's defaultModel instead
    defaultEnabledRuleIds: z.array(z.string()).optional(), // Global default rules for new sessions
    defaultAgentId: z.string().optional(), // Remember last selected agent
    providers: z.record(z.string(), z.object({
        defaultModel: z.string().optional(), // ✅ camelCase
    }).passthrough() // Allow additional fields defined by provider
    ).optional(),
});
/**
 * Configuration file paths
 */
const GLOBAL_CONFIG_FILE = path.join(os.homedir(), '.sylphx-code', 'settings.json');
const PROJECT_CONFIG_FILE = '.sylphx-code/settings.json';
const LOCAL_CONFIG_FILE = '.sylphx-code/settings.local.json';
/**
 * Deprecated config file (for migration)
 */
const LEGACY_CONFIG_FILE = '.sylphx-code/ai-config.json';
/**
 * Get AI config file paths in priority order
 */
export const getAIConfigPaths = (cwd = process.cwd()) => ({
    global: GLOBAL_CONFIG_FILE,
    project: path.join(cwd, PROJECT_CONFIG_FILE),
    local: path.join(cwd, LOCAL_CONFIG_FILE),
    legacy: path.join(cwd, LEGACY_CONFIG_FILE),
});
/**
 * Load config from a single file
 */
const loadConfigFile = async (filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(content);
        return aiConfigSchema.parse(parsed);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return null; // File doesn't exist
        }
        throw error; // Re-throw other errors
    }
};
/**
 * Deep merge two configs (b overwrites a)
 */
const mergeConfigs = (a, b) => {
    // Merge provider configs dynamically
    const allProviderIds = new Set([
        ...Object.keys(a.providers || {}),
        ...Object.keys(b.providers || {}),
    ]);
    const mergedProviders = {};
    for (const providerId of allProviderIds) {
        mergedProviders[providerId] = {
            ...a.providers?.[providerId],
            ...b.providers?.[providerId],
        };
    }
    return {
        defaultProvider: b.defaultProvider ?? a.defaultProvider,
        defaultEnabledRuleIds: b.defaultEnabledRuleIds ?? a.defaultEnabledRuleIds,
        defaultAgentId: b.defaultAgentId ?? a.defaultAgentId,
        // ❌ Removed: defaultModel merging
        providers: mergedProviders,
    };
};
/**
 * Get default model for a provider
 * Returns provider's defaultModel, or undefined if not set
 *
 * DESIGN: Default model = last used (stored in provider config)
 */
export const getDefaultModel = (config, providerId) => {
    const providerConfig = config.providers?.[providerId];
    return providerConfig?.defaultModel;
};
/**
 * Check if any AI config exists
 */
export const aiConfigExists = async (cwd = process.cwd()) => {
    const paths = getAIConfigPaths(cwd);
    try {
        // Check any of the config files
        await fs.access(paths.global).catch(() => { });
        return true;
    }
    catch { }
    try {
        await fs.access(paths.project);
        return true;
    }
    catch { }
    try {
        await fs.access(paths.local);
        return true;
    }
    catch { }
    try {
        await fs.access(paths.legacy);
        return true;
    }
    catch { }
    return false;
};
/**
 * Load AI configuration
 * Merges global, project, and local configs with priority: local > project > global
 * Automatically migrates legacy config on first load
 */
export const loadAIConfig = async (cwd = process.cwd()) => {
    return tryCatchAsync(async () => {
        const paths = getAIConfigPaths(cwd);
        // Load all config files
        const [globalConfig, projectConfig, localConfig, legacyConfig] = await Promise.all([
            loadConfigFile(paths.global),
            loadConfigFile(paths.project),
            loadConfigFile(paths.local),
            loadConfigFile(paths.legacy),
        ]);
        // Auto-migrate legacy config if it exists and global doesn't
        if (legacyConfig && !globalConfig) {
            await migrateLegacyConfig(cwd);
            // Reload global config after migration
            const migratedGlobal = await loadConfigFile(paths.global);
            if (migratedGlobal) {
                // Start with empty config
                let merged = {};
                // Merge in priority order: global < project < local
                merged = mergeConfigs(merged, migratedGlobal);
                if (projectConfig)
                    merged = mergeConfigs(merged, projectConfig);
                if (localConfig)
                    merged = mergeConfigs(merged, localConfig);
                return merged;
            }
        }
        // Start with empty config
        let merged = {};
        // Merge in priority order: global < project < local < legacy (for backwards compat)
        if (globalConfig)
            merged = mergeConfigs(merged, globalConfig);
        if (projectConfig)
            merged = mergeConfigs(merged, projectConfig);
        if (localConfig)
            merged = mergeConfigs(merged, localConfig);
        if (legacyConfig)
            merged = mergeConfigs(merged, legacyConfig);
        return merged;
    }, (error) => new Error(`Failed to load AI config: ${error.message}`));
};
/**
 * Save AI configuration to global settings
 * By default, all configuration (including API keys) goes to ~/.sylphx-code/settings.json
 * Automatically sets default provider if not set
 */
export const saveAIConfig = async (config, cwd = process.cwd()) => {
    const paths = getAIConfigPaths(cwd);
    const configPath = paths.global; // Save to global by default
    return tryCatchAsync(async () => {
        // Ensure directory exists
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        // Auto-set default provider if not set
        const configToSave = { ...config };
        if (!configToSave.defaultProvider && configToSave.providers) {
            // Get configured providers (those that pass isConfigured check)
            const { getProvider } = await import('../ai/providers/index.js');
            const configuredProviders = [];
            for (const [providerId, providerConfig] of Object.entries(configToSave.providers)) {
                try {
                    const provider = getProvider(providerId);
                    if (provider.isConfigured(providerConfig)) {
                        configuredProviders.push(providerId);
                    }
                }
                catch {
                    // Skip unknown providers
                }
            }
            // Use last configured provider as default
            if (configuredProviders.length > 0) {
                configToSave.defaultProvider = configuredProviders[configuredProviders.length - 1];
            }
        }
        // Validate config
        const validated = aiConfigSchema.parse(configToSave);
        // Write config
        await fs.writeFile(configPath, JSON.stringify(validated, null, 2) + '\n', 'utf8');
    }, (error) => new Error(`Failed to save AI config: ${error.message}`));
};
/**
 * Save AI configuration to a specific location
 */
export const saveAIConfigTo = async (config, location, cwd = process.cwd()) => {
    const paths = getAIConfigPaths(cwd);
    const configPath = paths[location];
    return tryCatchAsync(async () => {
        // Ensure directory exists
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        // Validate config
        const validated = aiConfigSchema.parse(config);
        // Write config
        await fs.writeFile(configPath, JSON.stringify(validated, null, 2) + '\n', 'utf8');
    }, (error) => new Error(`Failed to save AI config to ${location}: ${error.message}`));
};
/**
 * Update AI configuration (merge with existing)
 * Default provider is auto-set by saveAIConfig to last configured provider
 */
export const updateAIConfig = async (updates, cwd = process.cwd()) => {
    const currentResult = await loadAIConfig(cwd);
    if (currentResult._tag === 'Failure') {
        return currentResult;
    }
    const merged = {
        ...currentResult.value,
        ...updates,
        providers: {
            ...currentResult.value.providers,
            ...updates.providers,
        },
    };
    // saveAIConfig will auto-set default provider if not set
    return saveAIConfig(merged, cwd);
};
/**
 * Get configured providers
 * Uses provider's isConfigured() method to check
 */
export const getConfiguredProviders = async (cwd = process.cwd()) => {
    const result = await loadAIConfig(cwd);
    if (result._tag === 'Failure') {
        return [];
    }
    const providers = [];
    const config = result.value;
    if (!config.providers) {
        return [];
    }
    // Dynamically import provider registry to avoid circular dependency
    const { getProvider } = await import('../ai/providers/index.js');
    for (const [providerId, providerConfig] of Object.entries(config.providers)) {
        try {
            const provider = getProvider(providerId);
            if (provider.isConfigured(providerConfig)) {
                providers.push(providerId);
            }
        }
        catch {
            // Skip unknown providers
        }
    }
    return providers;
};
/**
 * Migrate legacy ai-config.json to new settings system
 * Automatically called on first load if legacy config exists
 */
export const migrateLegacyConfig = async (cwd = process.cwd()) => {
    return tryCatchAsync(async () => {
        const paths = getAIConfigPaths(cwd);
        // Check if legacy config exists
        const legacyConfig = await loadConfigFile(paths.legacy);
        if (!legacyConfig) {
            return; // No legacy config to migrate
        }
        // Check if global config already exists
        const globalConfig = await loadConfigFile(paths.global);
        if (globalConfig) {
            // Global config exists, don't overwrite it
            console.log('Legacy config found but global config already exists. Skipping migration.');
            console.log(`You can manually delete ${paths.legacy} if migration is complete.`);
            return;
        }
        // Migrate to global config
        await fs.mkdir(path.dirname(paths.global), { recursive: true });
        await fs.writeFile(paths.global, JSON.stringify(legacyConfig, null, 2) + '\n', 'utf8');
        console.log(`✓ Migrated configuration from ${paths.legacy} to ${paths.global}`);
        console.log(`  You can now safely delete the legacy file: ${paths.legacy}`);
    }, (error) => new Error(`Failed to migrate legacy config: ${error.message}`));
};
//# sourceMappingURL=ai-config.js.map