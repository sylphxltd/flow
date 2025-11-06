/**
 * Anthropic Provider
 */
import { anthropic } from '@ai-sdk/anthropic';
import { hasRequiredFields } from './base-provider.js';
import { getModelMetadata } from '../../utils/models-dev.js';
const ANTHROPIC_MODELS = [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
];
const MODEL_DETAILS = {
    'claude-3-5-sonnet-20241022': {
        contextLength: 200000,
        maxOutput: 8192,
    },
    'claude-3-5-haiku-20241022': {
        contextLength: 200000,
        maxOutput: 8192,
    },
    'claude-3-opus-20240229': {
        contextLength: 200000,
        maxOutput: 4096,
    },
    'claude-3-sonnet-20240229': {
        contextLength: 200000,
        maxOutput: 4096,
    },
    'claude-3-haiku-20240307': {
        contextLength: 200000,
        maxOutput: 4096,
    },
};
export class AnthropicProvider {
    id = 'anthropic';
    name = 'Anthropic';
    description = 'Claude models by Anthropic';
    getConfigSchema() {
        return [
            {
                key: 'apiKey',
                label: 'API Key',
                type: 'string',
                required: true,
                secret: true,
                description: 'Get your API key from https://console.anthropic.com',
                placeholder: 'sk-ant-...',
            },
        ];
    }
    isConfigured(config) {
        return hasRequiredFields(this.getConfigSchema(), config);
    }
    async fetchModels(_config) {
        return ANTHROPIC_MODELS;
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
        return anthropic(modelId, { apiKey: config.apiKey });
    }
}
//# sourceMappingURL=anthropic-provider.js.map