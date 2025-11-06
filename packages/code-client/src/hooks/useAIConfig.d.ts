/**
 * AI Config Hook
 * Load and save AI configuration via tRPC (backend handles file system)
 */
import type { AIConfig } from '@sylphx/code-core';
export declare function useAIConfig(): {
    loadConfig: (cwd?: string) => Promise<void>;
    saveConfig: (config: AIConfig, cwd?: string) => Promise<boolean>;
};
//# sourceMappingURL=useAIConfig.d.ts.map