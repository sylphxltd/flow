/**
 * tRPC Context
 * Provides services via AppContext (functional provider pattern)
 * SECURITY: Includes authentication info for OWASP API2 compliance
 */
import type { SessionRepository, AIConfig } from '@sylphx/code-core';
import type { AppContext } from '../context.js';
import type { Request, Response } from 'express';
/**
 * User roles for authorization (OWASP API5)
 * - admin: Full access (in-process CLI, local user)
 * - user: Standard access (HTTP with API key)
 * - guest: Read-only access (HTTP without API key, public endpoints)
 */
export type UserRole = 'admin' | 'user' | 'guest';
export interface Context {
    sessionRepository: SessionRepository;
    aiConfig: AIConfig;
    appContext: AppContext;
    auth: {
        isAuthenticated: boolean;
        userId?: string;
        source: 'in-process' | 'http';
        role: UserRole;
    };
    req?: Request;
    res?: Response;
}
export interface ContextOptions {
    appContext: AppContext;
    req?: Request;
    res?: Response;
}
/**
 * Create context for each request
 * Receives AppContext from CodeServer (dependency injection)
 *
 * SECURITY: Implements authentication for OWASP API2
 * - In-process calls: Auto-authenticated (trusted local process)
 * - HTTP calls: Validate API key from Authorization header
 */
export declare function createContext(options: ContextOptions): Promise<Context>;
//# sourceMappingURL=context.d.ts.map