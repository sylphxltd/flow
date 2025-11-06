/**
 * API Inventory Generator
 * SECURITY: OWASP API9 (Improper Inventory Management)
 *
 * Generates comprehensive inventory of all API endpoints
 */
export interface APIEndpoint {
    path: string;
    type: 'query' | 'mutation' | 'subscription';
    authentication: 'public' | 'protected' | 'admin' | 'user';
    rateLimit?: 'strict' | 'moderate' | 'lenient' | 'streaming';
    description: string;
    deprecated?: boolean;
}
export interface APIInventory {
    version: string;
    generatedAt: string;
    endpoints: APIEndpoint[];
}
/**
 * Current API inventory
 * Updated manually when endpoints change
 *
 * TODO: Auto-generate from tRPC router introspection
 */
export declare const API_INVENTORY: APIInventory;
/**
 * Get API inventory
 */
export declare function getAPIInventory(): APIInventory;
/**
 * Get endpoints by authentication level
 */
export declare function getEndpointsByAuth(auth: APIEndpoint['authentication']): APIEndpoint[];
/**
 * Get endpoints by type
 */
export declare function getEndpointsByType(type: APIEndpoint['type']): APIEndpoint[];
/**
 * Search endpoints by path
 */
export declare function searchEndpoints(query: string): APIEndpoint[];
/**
 * Generate Markdown documentation
 */
export declare function generateMarkdownDocs(): string;
//# sourceMappingURL=api-inventory.d.ts.map