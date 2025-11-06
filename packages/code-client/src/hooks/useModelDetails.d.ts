/**
 * useModelDetails Hook
 * Get model details including context length and tokenizer info
 */
interface ModelDetails {
    contextLength: number | null;
    tokenizerInfo: {
        modelName: string;
        tokenizerName: string;
        loaded: boolean;
        failed: boolean;
    } | null;
}
/**
 * Hook to fetch model details from server
 * Returns context length and tokenizer information
 *
 * DESIGN: providerId is string (not hardcoded union) because:
 * - Server is source of truth for available providers
 * - Providers can be added dynamically
 * - Client shouldn't need updates when new providers are added
 */
export declare function useModelDetails(providerId: string | null, modelId: string | null): {
    details: ModelDetails;
    loading: boolean;
    error: string | null;
};
export {};
//# sourceMappingURL=useModelDetails.d.ts.map