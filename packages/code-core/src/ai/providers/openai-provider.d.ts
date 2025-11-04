/**
 * OpenAI Provider
 */
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig, ModelInfo } from './base-provider.js';
export declare class OpenAIProvider implements AIProvider {
    readonly id: "openai";
    readonly name = "OpenAI";
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    fetchModels(config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    createClient(config: ProviderConfig, modelId: string): LanguageModelV1;
}
//# sourceMappingURL=openai-provider.d.ts.map