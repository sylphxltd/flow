/**
 * useModels Hook
 * Fetch available models for a provider
 */
interface ModelInfo {
    id: string;
    name: string;
    contextLength?: number;
}
/**
 * Hook to fetch models for a specific provider
 * Returns models list from server
 *
 * DESIGN: providerId is string (not hardcoded union) because:
 * - Server is source of truth for available providers
 * - Providers can be added dynamically
 * - Client shouldn't need updates when new providers are added
 */
export declare function useModels(providerId: string | null): {
    models: ModelInfo[];
    loading: boolean;
    error: string | null;
};
export {};
//# sourceMappingURL=useModels.d.ts.map