/**
 * Anthropic Provider
 */
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig, ModelInfo } from './base-provider.js';
export declare class AnthropicProvider implements AIProvider {
    readonly id: "anthropic";
    readonly name = "Anthropic";
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    fetchModels(_config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    createClient(config: ProviderConfig, modelId: string): LanguageModelV1;
}
//# sourceMappingURL=anthropic-provider.d.ts.map