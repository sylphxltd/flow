/**
 * tRPC Context
 * Provides services via AppContext (functional provider pattern)
 * SECURITY: Includes authentication info for OWASP API2 compliance
 */

import { loadAIConfig } from '@sylphx/code-core';
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
  // SECURITY: Authentication context (API2: Broken Authentication)
  auth: {
    isAuthenticated: boolean;
    userId?: string;
    source: 'in-process' | 'http';
    // SECURITY: User role for authorization (API5: Function Level Authorization)
    role: UserRole;
  };
  // HTTP request/response for HTTP mode (undefined for in-process)
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
export async function createContext(options: ContextOptions): Promise<Context> {
  const { appContext, req, res } = options;
  const sessionRepository = appContext.database.getRepository();

  // Load AI config
  let aiConfig: AIConfig = { providers: {} };
  try {
    const result = await loadAIConfig();
    if (result._tag === 'Success') {
      aiConfig = result.value;
    }
  } catch (error) {
    console.error('Failed to load AI config:', error);
  }

  // SECURITY: Determine authentication status and role
  let auth: Context['auth'];

  if (!req) {
    // In-process call: Trusted (from same process/CLI)
    // ROLE: admin (full access to all operations including system management)
    auth = {
      isAuthenticated: true,
      userId: 'local',
      source: 'in-process',
      role: 'admin',
    };
  } else {
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
    } else {
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
