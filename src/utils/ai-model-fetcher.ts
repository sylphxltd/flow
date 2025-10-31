/**
 * AI Model Fetcher
 * Dynamically fetch available models from providers
 */

import type { ProviderId } from '../config/ai-config.js';

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

/**
 * Fetch models from OpenRouter API
 */
async function fetchOpenRouterModels(apiKey?: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = (await response.json()) as { data: Array<{ id: string; name: string }> };
    return data.data.map((model) => ({
      id: model.id,
      name: model.name || model.id,
    }));
  } catch (error) {
    console.error('Failed to fetch OpenRouter models:', error);
    // Return popular models as fallback
    return [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
      { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B' },
    ];
  }
}

/**
 * Fetch models from OpenAI API
 */
async function fetchOpenAIModels(apiKey?: string): Promise<ModelInfo[]> {
  if (!apiKey) {
    // Return static list
    return [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as { data: Array<{ id: string }> };
    // Filter to GPT models only
    return data.data
      .filter((model) => model.id.startsWith('gpt-'))
      .map((model) => ({
        id: model.id,
        name: model.id,
      }));
  } catch (error) {
    console.error('Failed to fetch OpenAI models:', error);
    // Return static list as fallback
    return [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ];
  }
}

/**
 * Get static Anthropic models
 */
function getAnthropicModels(): ModelInfo[] {
  return [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
  ];
}

/**
 * Get static Google models
 */
function getGoogleModels(): ModelInfo[] {
  return [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ];
}

/**
 * Fetch models for a provider
 */
export async function fetchModels(
  provider: ProviderId,
  apiKey?: string
): Promise<ModelInfo[]> {
  switch (provider) {
    case 'openrouter':
      return fetchOpenRouterModels(apiKey);
    case 'openai':
      return fetchOpenAIModels(apiKey);
    case 'anthropic':
      return getAnthropicModels();
    case 'google':
      return getGoogleModels();
    default:
      return [];
  }
}
