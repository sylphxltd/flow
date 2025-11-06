/**
 * useProviders Hook
 * Get all available AI providers from server
 */
interface Provider {
    id: string;
    name: string;
}
/**
 * Hook to fetch all available AI providers
 * Returns provider metadata (id, name) from server
 */
export declare function useProviders(): {
    providers: Record<string, Provider>;
    loading: boolean;
    error: string | null;
};
export {};
//# sourceMappingURL=useProviders.d.ts.map