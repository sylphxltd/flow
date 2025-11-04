/**
 * OpenRouter Provider
 */
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig, ModelInfo } from './base-provider.js';
export declare class OpenRouterProvider implements AIProvider {
    readonly id: "openrouter";
    readonly name = "OpenRouter";
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    fetchModels(config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    createClient(config: ProviderConfig, modelId: string): LanguageModelV1;
}
//# sourceMappingURL=openrouter-provider.d.ts.map