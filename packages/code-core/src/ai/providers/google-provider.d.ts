/**
 * Google Provider
 * Supports both AI Studio (apiKey) and Vertex AI (projectId + location)
 */
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig, ModelInfo } from './base-provider.js';
export declare class GoogleProvider implements AIProvider {
    readonly id: "google";
    readonly name = "Google";
    readonly description = "Gemini models by Google";
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    fetchModels(_config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    createClient(config: ProviderConfig, modelId: string): LanguageModelV1;
}
//# sourceMappingURL=google-provider.d.ts.map