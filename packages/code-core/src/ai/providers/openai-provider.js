/**
 * OpenAI Provider
 */
import { openai } from '@ai-sdk/openai';
import { getModelMetadata } from '../../utils/models-dev.js';
const OPENAI_MODELS = [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
];
const MODEL_DETAILS = {
    'gpt-4o': {
        contextLength: 128000,
        maxOutput: 16384,
    },
    'gpt-4o-mini': {
        contextLength: 128000,
        maxOutput: 16384,
    },
    'gpt-4-turbo': {
        contextLength: 128000,
        maxOutput: 4096,
    },
    'gpt-4': {
        contextLength: 8192,
        maxOutput: 8192,
    },
    'gpt-3.5-turbo': {
        contextLength: 16384,
        maxOutput: 4096,
    },
};
export class OpenAIProvider {
    id = 'openai';
    name = 'OpenAI';
    getConfigSchema() {
        return [
            {
                key: 'api-key',
                label: 'API Key',
                type: 'string',
                required: true,
                secret: true,
                description: 'Get your API key from https://platform.openai.com',
                placeholder: 'sk-...',
            },
            {
                key: 'base-url',
                label: 'Base URL',
                type: 'string',
                required: false,
                description: 'Custom API endpoint (for Azure OpenAI, etc.)',
                placeholder: 'https://api.openai.com/v1',
            },
        ];
    }
    isConfigured(config) {
        return !!config['api-key'];
    }
    async fetchModels(config) {
        const apiKey = config['api-key'];
        if (!apiKey) {
            // No API key - return known models (can't fetch from API without auth)
            return OPENAI_MODELS;
        }
        const baseUrl = config['base-url'] || 'https://api.openai.com/v1';
        const response = await fetch(`${baseUrl}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            throw new Error(`OpenAI API returned ${response.status}: ${response.statusText}`);
        }
        const data = (await response.json());
        const models = data.data
            .filter((model) => model.id.startsWith('gpt-'))
            .map((model) => ({
            id: model.id,
            name: model.id,
        }));
        if (models.length === 0) {
            throw new Error('No GPT models found in OpenAI API response');
        }
        return models;
    }
    async getModelDetails(modelId, _config) {
        // Try provider knowledge first
        if (MODEL_DETAILS[modelId]) {
            return MODEL_DETAILS[modelId];
        }
        // Fall back to models.dev
        const metadata = await getModelMetadata(modelId);
        if (metadata) {
            return {
                contextLength: metadata.contextLength,
                maxOutput: metadata.maxOutput,
                inputPrice: metadata.inputPrice,
                outputPrice: metadata.outputPrice,
            };
        }
        return null;
    }
    createClient(config, modelId) {
        const apiKey = config['api-key'];
        const baseUrl = config['base-url'];
        return openai(modelId, { apiKey, baseURL: baseUrl });
    }
}
//# sourceMappingURL=openai-provider.js.map