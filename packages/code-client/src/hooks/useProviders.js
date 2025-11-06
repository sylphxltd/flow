/**
 * useProviders Hook
 * Get all available AI providers from server
 */
import { useEffect, useState } from 'react';
import { useTRPCClient } from '../trpc-provider.js';
/**
 * Hook to fetch all available AI providers
 * Returns provider metadata (id, name) from server
 */
export function useProviders() {
    const trpc = useTRPCClient();
    const [providers, setProviders] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let mounted = true;
        async function fetchProviders() {
            try {
                setLoading(true);
                setError(null);
                const data = await trpc.config.getProviders.query();
                if (mounted) {
                    setProviders(data);
                }
            }
            catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load providers');
                }
            }
            finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }
        fetchProviders();
        return () => {
            mounted = false;
        };
    }, [trpc]);
    return { providers, loading, error };
}
//# sourceMappingURL=useProviders.js.map