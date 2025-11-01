/**
 * AI Configuration Management
 *
 * Three-tier configuration system:
 * 1. Global: ~/.sylphx-flow/settings.json (user defaults, contains API keys)
 * 2. Project: ./.sylphx-flow/settings.json (project preferences, no secrets)
 * 3. Local: ./.sylphx-flow/settings.local.json (local overrides, gitignored)
 *
 * Priority: local > project > global
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { z } from 'zod';
import { type Result, success, tryCatchAsync } from '../core/functional/result.js';

/**
 * Available AI providers
 */
export const AI_PROVIDERS = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    requiresKey: true,
    keyName: 'ANTHROPIC_API_KEY',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ],
    requiresKey: true,
    keyName: 'OPENAI_API_KEY',
  },
  google: {
    id: 'google',
    name: 'Google',
    models: [
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
    requiresKey: true,
    keyName: 'GOOGLE_API_KEY',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      // Popular models via OpenRouter
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'openai/gpt-4o',
      'openai/gpt-4-turbo',
      'google/gemini-2.0-flash-exp',
      'meta-llama/llama-3.3-70b-instruct',
      'meta-llama/llama-3.1-405b-instruct',
      'google/gemini-pro-1.5',
      'anthropic/claude-3-haiku',
      'mistralai/mistral-large',
      'deepseek/deepseek-chat',
      'qwen/qwen-2.5-72b-instruct',
    ],
    requiresKey: true,
    keyName: 'OPENROUTER_API_KEY',
  },
} as const;

export type ProviderId = keyof typeof AI_PROVIDERS;

/**
 * AI configuration schema
 */
const aiConfigSchema = z.object({
  defaultProvider: z.enum(['anthropic', 'openai', 'google', 'openrouter']).optional(),
  defaultModel: z.string().optional(),
  providers: z.object({
    anthropic: z.object({
      apiKey: z.string().optional(),
      defaultModel: z.string().optional(),
    }).optional(),
    openai: z.object({
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      defaultModel: z.string().optional(),
    }).optional(),
    google: z.object({
      apiKey: z.string().optional(),
      defaultModel: z.string().optional(),
    }).optional(),
    openrouter: z.object({
      apiKey: z.string().optional(),
      defaultModel: z.string().optional(),
    }).optional(),
  }).optional(),
});

export type AIConfig = z.infer<typeof aiConfigSchema>;

/**
 * Configuration file paths
 */
const GLOBAL_CONFIG_FILE = path.join(os.homedir(), '.sylphx-flow', 'settings.json');
const PROJECT_CONFIG_FILE = '.sylphx-flow/settings.json';
const LOCAL_CONFIG_FILE = '.sylphx-flow/settings.local.json';

/**
 * Deprecated config file (for migration)
 */
const LEGACY_CONFIG_FILE = '.sylphx-flow/ai-config.json';

/**
 * Get AI config file paths in priority order
 */
export const getAIConfigPaths = (cwd: string = process.cwd()): {
  global: string;
  project: string;
  local: string;
  legacy: string;
} => ({
  global: GLOBAL_CONFIG_FILE,
  project: path.join(cwd, PROJECT_CONFIG_FILE),
  local: path.join(cwd, LOCAL_CONFIG_FILE),
  legacy: path.join(cwd, LEGACY_CONFIG_FILE),
});

/**
 * Load config from a single file
 */
const loadConfigFile = async (filePath: string): Promise<AIConfig | null> => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return aiConfigSchema.parse(parsed);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw error; // Re-throw other errors
  }
};

/**
 * Deep merge two configs (b overwrites a)
 */
const mergeConfigs = (a: AIConfig, b: AIConfig): AIConfig => {
  return {
    defaultProvider: b.defaultProvider ?? a.defaultProvider,
    defaultModel: b.defaultModel ?? a.defaultModel,
    providers: {
      anthropic: {
        ...a.providers?.anthropic,
        ...b.providers?.anthropic,
      },
      openai: {
        ...a.providers?.openai,
        ...b.providers?.openai,
      },
      google: {
        ...a.providers?.google,
        ...b.providers?.google,
      },
      openrouter: {
        ...a.providers?.openrouter,
        ...b.providers?.openrouter,
      },
    },
  };
};

/**
 * Check if any AI config exists
 */
export const aiConfigExists = async (cwd: string = process.cwd()): Promise<boolean> => {
  const paths = getAIConfigPaths(cwd);
  try {
    // Check any of the config files
    await fs.access(paths.global).catch(() => {});
    return true;
  } catch {}

  try {
    await fs.access(paths.project);
    return true;
  } catch {}

  try {
    await fs.access(paths.local);
    return true;
  } catch {}

  try {
    await fs.access(paths.legacy);
    return true;
  } catch {}

  return false;
};

/**
 * Load AI configuration
 * Merges global, project, and local configs with priority: local > project > global
 * Automatically migrates legacy config on first load
 */
export const loadAIConfig = async (cwd: string = process.cwd()): Promise<Result<AIConfig, Error>> => {
  return tryCatchAsync(
    async () => {
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
          let merged: AIConfig = {};

          // Merge in priority order: global < project < local
          merged = mergeConfigs(merged, migratedGlobal);
          if (projectConfig) merged = mergeConfigs(merged, projectConfig);
          if (localConfig) merged = mergeConfigs(merged, localConfig);

          return merged;
        }
      }

      // Start with empty config
      let merged: AIConfig = {};

      // Merge in priority order: global < project < local < legacy (for backwards compat)
      if (globalConfig) merged = mergeConfigs(merged, globalConfig);
      if (projectConfig) merged = mergeConfigs(merged, projectConfig);
      if (localConfig) merged = mergeConfigs(merged, localConfig);
      if (legacyConfig) merged = mergeConfigs(merged, legacyConfig);

      return merged;
    },
    (error: any) => new Error(`Failed to load AI config: ${error.message}`)
  );
};

/**
 * Save AI configuration to global settings
 * By default, all configuration (including API keys) goes to ~/.sylphx-flow/settings.json
 */
export const saveAIConfig = async (
  config: AIConfig,
  cwd: string = process.cwd()
): Promise<Result<void, Error>> => {
  const paths = getAIConfigPaths(cwd);
  const configPath = paths.global; // Save to global by default

  return tryCatchAsync(
    async () => {
      // Ensure directory exists
      await fs.mkdir(path.dirname(configPath), { recursive: true });

      // Validate config
      const validated = aiConfigSchema.parse(config);

      // Write config
      await fs.writeFile(configPath, JSON.stringify(validated, null, 2) + '\n', 'utf8');
    },
    (error: any) => new Error(`Failed to save AI config: ${error.message}`)
  );
};

/**
 * Save AI configuration to a specific location
 */
export const saveAIConfigTo = async (
  config: AIConfig,
  location: 'global' | 'project' | 'local',
  cwd: string = process.cwd()
): Promise<Result<void, Error>> => {
  const paths = getAIConfigPaths(cwd);
  const configPath = paths[location];

  return tryCatchAsync(
    async () => {
      // Ensure directory exists
      await fs.mkdir(path.dirname(configPath), { recursive: true });

      // Validate config
      const validated = aiConfigSchema.parse(config);

      // Write config
      await fs.writeFile(configPath, JSON.stringify(validated, null, 2) + '\n', 'utf8');
    },
    (error: any) => new Error(`Failed to save AI config to ${location}: ${error.message}`)
  );
};

/**
 * Update AI configuration (merge with existing)
 */
export const updateAIConfig = async (
  updates: Partial<AIConfig>,
  cwd: string = process.cwd()
): Promise<Result<void, Error>> => {
  const currentResult = await loadAIConfig(cwd);

  if (currentResult._tag === 'Failure') {
    return currentResult;
  }

  const merged: AIConfig = {
    ...currentResult.value,
    ...updates,
    providers: {
      ...currentResult.value.providers,
      ...updates.providers,
    },
  };

  return saveAIConfig(merged, cwd);
};

/**
 * Get API key for a provider
 */
export const getProviderKey = async (
  providerId: ProviderId,
  cwd: string = process.cwd()
): Promise<string | undefined> => {
  const result = await loadAIConfig(cwd);
  if (result._tag === 'Success') {
    return result.value.providers?.[providerId]?.apiKey;
  }
  return undefined;
};

/**
 * Set API key for a provider
 */
export const setProviderKey = async (
  providerId: ProviderId,
  apiKey: string,
  cwd: string = process.cwd()
): Promise<Result<void, Error>> => {
  const currentResult = await loadAIConfig(cwd);

  const current = currentResult._tag === 'Success' ? currentResult.value : {};

  const updated: AIConfig = {
    ...current,
    providers: {
      ...current.providers,
      [providerId]: {
        ...current.providers?.[providerId],
        apiKey,
      },
    },
  };

  return saveAIConfig(updated, cwd);
};

/**
 * Get configured providers (those with API keys)
 */
export const getConfiguredProviders = async (
  cwd: string = process.cwd()
): Promise<ProviderId[]> => {
  const result = await loadAIConfig(cwd);

  if (result._tag === 'Failure') {
    return [];
  }

  const providers: ProviderId[] = [];
  const config = result.value;

  if (config.providers?.anthropic?.apiKey) {
    providers.push('anthropic');
  }
  if (config.providers?.openai?.apiKey) {
    providers.push('openai');
  }
  if (config.providers?.google?.apiKey) {
    providers.push('google');
  }
  if (config.providers?.openrouter?.apiKey) {
    providers.push('openrouter');
  }

  return providers;
};

/**
 * Migrate legacy ai-config.json to new settings system
 * Automatically called on first load if legacy config exists
 */
export const migrateLegacyConfig = async (cwd: string = process.cwd()): Promise<Result<void, Error>> => {
  return tryCatchAsync(
    async () => {
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
    },
    (error: any) => new Error(`Failed to migrate legacy config: ${error.message}`)
  );
};
