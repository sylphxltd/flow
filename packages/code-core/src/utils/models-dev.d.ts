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
/**
 * Fetch model metadata from models.dev
 */
export declare function fetchModelsMetadata(): Promise<Map<string, ModelMetadata>>;
/**
 * Get metadata for a specific model
 */
export declare function getModelMetadata(modelId: string): Promise<ModelMetadata | null>;
/**
 * Clear cache (for testing or forcing refresh)
 */
export declare function clearModelsCache(): void;
//# sourceMappingURL=models-dev.d.ts.map