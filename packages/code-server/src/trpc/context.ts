/**
 * tRPC Context
 * Provides services via AppContext (functional provider pattern)
 * SECURITY: Includes authentication info for OWASP API2 compliance
 */

import { loadAIConfig } from '@sylphx/code-core';
import type { SessionRepository, AIConfig } from '@sylphx/code-core';
import type { AppContext } from '../context.js';
import type { Request, Response } from 'express';

export interface Context {
  sessionRepository: SessionRepository;
  aiConfig: AIConfig;
  appContext: AppContext;
  // SECURITY: Authentication context (API2: Broken Authentication)
  auth: {
    isAuthenticated: boolean;
    userId?: string;
    source: 'in-process' | 'http';
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

  // SECURITY: Determine authentication status
  let auth: Context['auth'];

  if (!req) {
    // In-process call: Trusted (from same process/CLI)
    auth = {
      isAuthenticated: true,
      userId: 'local',
      source: 'in-process',
    };
  } else {
    // HTTP call: Validate API key
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    const validApiKey = process.env.SYLPHX_API_KEY;

    if (validApiKey && apiKey === validApiKey) {
      auth = {
        isAuthenticated: true,
        userId: 'http-client',
        source: 'http',
      };
    } else {
      // Allow unauthenticated for now (public endpoints)
      // Protected endpoints will check via middleware
      auth = {
        isAuthenticated: false,
        source: 'http',
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
