/**
 * AI Configuration Management
 * Stores API keys, provider preferences, and model selections
 * No environment variables - all stored in local config file
 */

import fs from 'node:fs/promises';
import path from 'node:path';
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

const CONFIG_FILE = '.sylphx-flow/ai-config.json';

/**
 * Get AI config file path
 */
export const getAIConfigPath = (cwd: string = process.cwd()): string =>
  path.join(cwd, CONFIG_FILE);

/**
 * Check if AI config exists
 */
export const aiConfigExists = async (cwd: string = process.cwd()): Promise<boolean> => {
  try {
    await fs.access(getAIConfigPath(cwd));
    return true;
  } catch {
    return false;
  }
};

/**
 * Load AI configuration
 */
export const loadAIConfig = async (cwd: string = process.cwd()): Promise<Result<AIConfig, Error>> => {
  const configPath = getAIConfigPath(cwd);

  return tryCatchAsync(
    async () => {
      const content = await fs.readFile(configPath, 'utf8');
      const parsed = JSON.parse(content);
      return aiConfigSchema.parse(parsed);
    },
    (error: any) => {
      if (error.code === 'ENOENT') {
        return new Error('AI_CONFIG_NOT_FOUND');
      }
      return new Error(`Failed to load AI config: ${error.message}`);
    }
  ).then((result) => {
    // Convert NOT_FOUND to success with empty config
    if (result._tag === 'Failure' && result.error.message === 'AI_CONFIG_NOT_FOUND') {
      return success({});
    }
    return result;
  });
};

/**
 * Save AI configuration
 */
export const saveAIConfig = async (
  config: AIConfig,
  cwd: string = process.cwd()
): Promise<Result<void, Error>> => {
  const configPath = getAIConfigPath(cwd);

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
