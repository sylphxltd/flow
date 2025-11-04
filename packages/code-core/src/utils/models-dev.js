/**
 * Models.dev API Integration
 * Fetch model metadata as fallback source
 */
let cachedModels = null;
/**
 * Fetch model metadata from models.dev
 */
export async function fetchModelsMetadata() {
    if (cachedModels) {
        return cachedModels;
    }
    try {
        const response = await fetch('https://models.dev/api.json', {
            headers: {
                'User-Agent': 'sylphx-flow/1.0',
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch models.dev: ${response.status}`);
        }
        const data = (await response.json());
        const models = new Map();
        for (const model of data.models) {
            models.set(model.id, {
                id: model.id,
                name: model.name,
                contextLength: model.context_length,
                maxOutput: model.max_output,
                inputPrice: model.pricing?.input,
                outputPrice: model.pricing?.output,
                provider: model.provider,
                description: model.description,
            });
        }
        cachedModels = models;
        return models;
    }
    catch (error) {
        console.error('Failed to fetch models.dev:', error);
        return new Map();
    }
}
/**
 * Get metadata for a specific model
 */
export async function getModelMetadata(modelId) {
    const models = await fetchModelsMetadata();
    return models.get(modelId) || null;
}
/**
 * Clear cache (for testing or forcing refresh)
 */
export function clearModelsCache() {
    cachedModels = null;
}
//# sourceMappingURL=models-dev.js.map