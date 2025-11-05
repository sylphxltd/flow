/**
 * Base Provider Interface
 * Defines contract for all AI providers
 */

import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { ProviderId } from '../types/provider.types.js';

/**
 * Model information from provider
 */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

export interface ProviderModelDetails {
  contextLength?: number;
  maxOutput?: number;
  inputPrice?: number;
  outputPrice?: number;
  supportedFeatures?: string[];
}

/**
 * Configuration field definition
 */
export interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  secret?: boolean; // Whether to hide value in UI (for API keys)
  description?: string;
  placeholder?: string;
}

/**
 * Provider configuration (values)
 */
export type ProviderConfig = Record<string, string | number | boolean | undefined>;

export interface AIProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly description: string;

  /**
   * Get configuration schema for this provider
   * Defines what config fields are needed (API keys, project IDs, regions, etc)
   */
  getConfigSchema(): ConfigField[];

  /**
   * Check if provider is configured properly
   */
  isConfigured(config: ProviderConfig): boolean;

  /**
   * Fetch available models from provider
   * Uses provider config instead of just apiKey
   */
  fetchModels(config: ProviderConfig): Promise<ModelInfo[]>;

  /**
   * Get detailed information about a model
   * Should try provider API first, then fall back to models.dev
   */
  getModelDetails(modelId: string, config?: ProviderConfig): Promise<ProviderModelDetails | null>;

  /**
   * Create AI SDK client for this provider
   * Uses provider config instead of just apiKey
   */
  createClient(config: ProviderConfig, modelId: string): LanguageModelV2;
}

/**
 * Helper: Check if all required fields from schema are present in config
 * Handles both kebab-case (api-key) and camelCase (apiKey) formats
 */
export function hasRequiredFields(schema: ConfigField[], config: ProviderConfig): boolean {
  const requiredFields = schema.filter(f => f.required);

  for (const field of requiredFields) {
    const kebabKey = field.key; // e.g., 'api-key'
    const camelKey = kebabKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()); // e.g., 'apiKey'

    // Check both formats
    const hasKebab = config[kebabKey] !== undefined && config[kebabKey] !== '';
    const hasCamel = config[camelKey] !== undefined && config[camelKey] !== '';

    if (!hasKebab && !hasCamel) {
      return false;
    }
  }

  return true;
}
