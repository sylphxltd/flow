/**
 * Z.ai Provider
 * Uses OpenAI-compatible API
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { hasRequiredFields } from './base-provider.js';
export class ZaiProvider {
    id = 'zai';
    name = 'Z.ai';
    description = 'ZAI AI platform';
    getConfigSchema() {
        return [
            {
                key: 'apiKey',
                label: 'API Key',
                type: 'string',
                required: true,
                secret: true,
                description: 'Get your API key from Z.ai',
                placeholder: 'zai-...',
            },
            {
                key: 'codingPlan',
                label: 'Coding Plan',
                type: 'boolean',
                required: false,
                description: 'Enable Coding Plan mode (uses different API endpoint)',
            },
        ];
    }
    isConfigured(config) {
        return hasRequiredFields(this.getConfigSchema(), config);
    }
    async fetchModels(config) {
        const apiKey = config.apiKey;
        const codingPlan = config.codingPlan;
        if (!apiKey) {
            throw new Error('API key is required to fetch Z.ai models');
        }
        // Use different base URL for coding plan
        const baseUrl = codingPlan
            ? 'https://api.z.ai/api/coding/paas/v4'
            : 'https://api.z.ai/api/paas/v4';
        const response = await fetch(`${baseUrl}/models`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            throw new Error(`Z.ai API returned ${response.status}: ${response.statusText}`);
        }
        const data = (await response.json());
        if (!data.data || data.data.length === 0) {
            throw new Error('No models returned from Z.ai API');
        }
        return data.data.map((model) => ({
            id: model.id,
            name: model.name || model.id,
        }));
    }
    async getModelDetails(modelId, _config) {
        // Known specs for Z.ai models
        const specs = {
            'glm-4.6': {
                contextLength: 128000,
                maxOutput: 4096,
                inputPrice: 0,
                outputPrice: 0,
            },
            'glm-4-flash': {
                contextLength: 128000,
                maxOutput: 4096,
                inputPrice: 0,
                outputPrice: 0,
            },
            'glm-4-plus': {
                contextLength: 128000,
                maxOutput: 4096,
                inputPrice: 0,
                outputPrice: 0,
            },
            'glm-4-air': {
                contextLength: 128000,
                maxOutput: 4096,
                inputPrice: 0,
                outputPrice: 0,
            },
        };
        return specs[modelId] || null;
    }
    createClient(config, modelId) {
        const apiKey = config.apiKey;
        const codingPlan = config.codingPlan;
        // Use different base URL for coding plan
        const baseURL = codingPlan
            ? 'https://api.z.ai/api/coding/paas/v4/'
            : 'https://api.z.ai/api/paas/v4/';
        const zai = createOpenAICompatible({
            baseURL,
            apiKey,
            name: 'zai',
        });
        return zai(modelId);
    }
}
//# sourceMappingURL=zai-provider.js.map