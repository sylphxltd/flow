/**
 * Google Provider
 * Supports both AI Studio (apiKey) and Vertex AI (projectId + location)
 */
import { google } from '@ai-sdk/google';
import { getModelMetadata } from '../../utils/models-dev.js';
const GOOGLE_MODELS = [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
];
const MODEL_DETAILS = {
    'gemini-2.0-flash-exp': {
        contextLength: 1000000,
        maxOutput: 8192,
    },
    'gemini-1.5-pro': {
        contextLength: 2000000,
        maxOutput: 8192,
    },
    'gemini-1.5-flash': {
        contextLength: 1000000,
        maxOutput: 8192,
    },
};
export class GoogleProvider {
    id = 'google';
    name = 'Google';
    getConfigSchema() {
        return [
            {
                key: 'api-key',
                label: 'API Key (AI Studio)',
                type: 'string',
                required: false,
                secret: true,
                description: 'Get your API key from https://aistudio.google.com',
                placeholder: 'AIza...',
            },
            {
                key: 'project-id',
                label: 'Project ID (Vertex AI)',
                type: 'string',
                required: false,
                description: 'Google Cloud project ID for Vertex AI',
                placeholder: 'my-project-123',
            },
            {
                key: 'location',
                label: 'Location (Vertex AI)',
                type: 'string',
                required: false,
                description: 'Vertex AI location (default: us-central1)',
                placeholder: 'us-central1',
            },
        ];
    }
    isConfigured(config) {
        // Either AI Studio (api-key) OR Vertex AI (project-id + location)
        const hasAIStudio = !!config['api-key'];
        const hasVertexAI = !!config['project-id'] && !!config.location;
        return hasAIStudio || hasVertexAI;
    }
    async fetchModels(_config) {
        return GOOGLE_MODELS;
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
        const projectId = config['project-id'];
        const location = config.location || 'us-central1';
        if (apiKey) {
            // AI Studio mode
            return google(modelId, { apiKey });
        }
        else if (projectId) {
            // Vertex AI mode
            return google(modelId, {
                vertexai: { projectId, location }
            });
        }
        else {
            throw new Error('Google provider requires either api-key or project-id');
        }
    }
}
//# sourceMappingURL=google-provider.js.map