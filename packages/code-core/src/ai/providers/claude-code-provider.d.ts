/**
 * Claude Code Provider
 * Uses Claude Code CLI with OAuth authentication
 * Supports Vercel AI SDK tools (executed by framework, not CLI)
 */
import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig, ModelInfo } from './base-provider.js';
export declare class ClaudeCodeProvider implements AIProvider {
    readonly id: "claude-code";
    readonly name = "Claude Code";
    readonly description = "Claude Code local models";
    getConfigSchema(): ConfigField[];
    isConfigured(_config: ProviderConfig): boolean;
    fetchModels(_config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    createClient(_config: ProviderConfig, modelId: string): LanguageModelV2;
}
//# sourceMappingURL=claude-code-provider.d.ts.map