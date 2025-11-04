/**
 * Z.ai Provider
 * Uses OpenAI-compatible API
 */
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig, ModelInfo } from './base-provider.js';
export declare class ZaiProvider implements AIProvider {
    readonly id: "zai";
    readonly name = "Z.ai";
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    fetchModels(config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    createClient(config: ProviderConfig, modelId: string): LanguageModelV1;
}
//# sourceMappingURL=zai-provider.d.ts.map