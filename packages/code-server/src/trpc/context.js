/**
 * tRPC Context
 * Provides services via AppContext (functional provider pattern)
 * SECURITY: Includes authentication info for OWASP API2 compliance
 */
import { loadAIConfig } from '@sylphx/code-core';
/**
 * Create context for each request
 * Receives AppContext from CodeServer (dependency injection)
 *
 * SECURITY: Implements authentication for OWASP API2
 * - In-process calls: Auto-authenticated (trusted local process)
 * - HTTP calls: Validate API key from Authorization header
 */
export async function createContext(options) {
    const { appContext, req, res } = options;
    const sessionRepository = appContext.database.getRepository();
    // Load AI config
    let aiConfig = { providers: {} };
    try {
        const result = await loadAIConfig();
        if (result._tag === 'Success') {
            aiConfig = result.value;
        }
    }
    catch (error) {
        console.error('Failed to load AI config:', error);
    }
    // SECURITY: Determine authentication status and role
    let auth;
    if (!req) {
        // In-process call: Trusted (from same process/CLI)
        // ROLE: admin (full access to all operations including system management)
        auth = {
            isAuthenticated: true,
            userId: 'local',
            source: 'in-process',
            role: 'admin',
        };
    }
    else {
        // HTTP call: Validate API key
        const apiKey = req.headers.authorization?.replace('Bearer ', '');
        const validApiKey = process.env.SYLPHX_API_KEY;
        if (validApiKey && apiKey === validApiKey) {
            // Authenticated HTTP client
            // ROLE: user (standard access, can read/write own data)
            auth = {
                isAuthenticated: true,
                userId: 'http-client',
                source: 'http',
                role: 'user',
            };
        }
        else {
            // Unauthenticated HTTP client
            // ROLE: guest (read-only public endpoints)
            auth = {
                isAuthenticated: false,
                source: 'http',
                role: 'guest',
            };
        }
    }
    return {
        sessionRepository,
        aiConfig,
        appContext,
        auth,
        req,
        res,
    };
}
//# sourceMappingURL=context.js.map