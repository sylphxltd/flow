/**
 * Models.dev API Integration
 * Fetch model metadata as fallback source
 */

export interface ModelMetadata {
  id: string;
  name?: string;
  contextLength?: number;
  maxOutput?: number;
  inputPrice?: number;
  outputPrice?: number;
  provider?: string;
  description?: string;
}

interface ModelsDevResponse {
  models: Array<{
    id: string;
    name?: string;
    context_length?: number;
    max_output?: number;
    pricing?: {
      input?: number;
      output?: number;
    };
    provider?: string;
    description?: string;
  }>;
}

let cachedModels: Map<string, ModelMetadata> | null = null;

/**
 * Fetch model metadata from models.dev
 */
export async function fetchModelsMetadata(): Promise<Map<string, ModelMetadata>> {
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

    const data = (await response.json()) as ModelsDevResponse;

    if (!data || !data.models || !Array.isArray(data.models)) {
      console.error('Invalid models.dev response: missing or invalid models array');
      cachedModels = new Map();
      return cachedModels;
    }

    const models = new Map<string, ModelMetadata>();

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
  } catch (error) {
    console.error('Failed to fetch models.dev:', error);
    return new Map();
  }
}

/**
 * Get metadata for a specific model
 */
export async function getModelMetadata(modelId: string): Promise<ModelMetadata | null> {
  const models = await fetchModelsMetadata();
  return models.get(modelId) || null;
}

/**
 * Clear cache (for testing or forcing refresh)
 */
export function clearModelsCache(): void {
  cachedModels = null;
}
