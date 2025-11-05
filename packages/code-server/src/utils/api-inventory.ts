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
export const API_INVENTORY: APIInventory = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  endpoints: [
    // Session endpoints
    {
      path: 'session.getRecent',
      type: 'query',
      authentication: 'public',
      description: 'Get recent sessions with pagination (metadata only)',
    },
    {
      path: 'session.getById',
      type: 'query',
      authentication: 'public',
      description: 'Get session by ID with full data',
    },
    {
      path: 'session.getCount',
      type: 'query',
      authentication: 'public',
      description: 'Get total session count',
    },
    {
      path: 'session.getLast',
      type: 'query',
      authentication: 'public',
      description: 'Get last session (for headless mode)',
    },
    {
      path: 'session.search',
      type: 'query',
      authentication: 'public',
      description: 'Search sessions by title with pagination',
    },
    {
      path: 'session.create',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'strict',
      description: 'Create new session',
    },
    {
      path: 'session.updateTitle',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Update session title',
    },
    {
      path: 'session.updateModel',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Update session model',
    },
    {
      path: 'session.updateProvider',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Update session provider and model',
    },
    {
      path: 'session.delete',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'strict',
      description: 'Delete session (cascade deletes messages, todos, attachments)',
    },
    {
      path: 'session.onChange',
      type: 'subscription',
      authentication: 'public',
      description: 'Subscribe to session changes (real-time)',
    },

    // Message endpoints
    {
      path: 'message.getBySession',
      type: 'query',
      authentication: 'public',
      description: 'Get messages for session with pagination',
    },
    {
      path: 'message.getCount',
      type: 'query',
      authentication: 'public',
      description: 'Get message count for session',
    },
    {
      path: 'message.getRecentUserMessages',
      type: 'query',
      authentication: 'public',
      description: 'Get recent user messages for command history',
    },
    {
      path: 'message.add',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Add message to session',
    },
    {
      path: 'message.updateParts',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Update message parts (during streaming)',
    },
    {
      path: 'message.updateStatus',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Update message status',
    },
    {
      path: 'message.updateUsage',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Update message token usage',
    },
    {
      path: 'message.streamResponse',
      type: 'subscription',
      authentication: 'protected',
      rateLimit: 'streaming',
      description: 'Stream AI response (unified interface for TUI and Web)',
    },
    {
      path: 'message.onChange',
      type: 'subscription',
      authentication: 'public',
      description: 'Subscribe to message changes (real-time)',
    },

    // Todo endpoints
    {
      path: 'todo.update',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Update todos for session (atomic replacement)',
    },
    {
      path: 'todo.onChange',
      type: 'subscription',
      authentication: 'public',
      description: 'Subscribe to todo changes (real-time)',
    },

    // Config endpoints
    {
      path: 'config.load',
      type: 'query',
      authentication: 'public',
      description: 'Load AI config from file system (sanitized)',
    },
    {
      path: 'config.getPaths',
      type: 'query',
      authentication: 'public',
      description: 'Get config file paths',
    },
    {
      path: 'config.updateDefaultProvider',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Update default provider',
    },
    {
      path: 'config.updateDefaultModel',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Update default model',
    },
    {
      path: 'config.updateProviderConfig',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Update provider configuration',
    },
    {
      path: 'config.removeProvider',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Remove provider configuration',
    },
    {
      path: 'config.save',
      type: 'mutation',
      authentication: 'protected',
      rateLimit: 'moderate',
      description: 'Save AI config to file system',
    },
    {
      path: 'config.onChange',
      type: 'subscription',
      authentication: 'public',
      description: 'Subscribe to config changes (real-time)',
    },

    // Admin endpoints
    {
      path: 'admin.getHealth',
      type: 'query',
      authentication: 'public',
      description: 'Get server health (for monitoring)',
    },
    {
      path: 'admin.getSystemStats',
      type: 'query',
      authentication: 'admin',
      rateLimit: 'moderate',
      description: 'Get system statistics (admin-only)',
    },
    {
      path: 'admin.deleteAllSessions',
      type: 'mutation',
      authentication: 'admin',
      rateLimit: 'strict',
      description: 'Delete all sessions (dangerous, admin-only)',
    },
    {
      path: 'admin.forceGC',
      type: 'mutation',
      authentication: 'admin',
      rateLimit: 'moderate',
      description: 'Force garbage collection (admin-only)',
    },
  ],
};

/**
 * Get API inventory
 */
export function getAPIInventory(): APIInventory {
  return API_INVENTORY;
}

/**
 * Get endpoints by authentication level
 */
export function getEndpointsByAuth(auth: APIEndpoint['authentication']): APIEndpoint[] {
  return API_INVENTORY.endpoints.filter((e) => e.authentication === auth);
}

/**
 * Get endpoints by type
 */
export function getEndpointsByType(type: APIEndpoint['type']): APIEndpoint[] {
  return API_INVENTORY.endpoints.filter((e) => e.type === type);
}

/**
 * Search endpoints by path
 */
export function searchEndpoints(query: string): APIEndpoint[] {
  const lowerQuery = query.toLowerCase();
  return API_INVENTORY.endpoints.filter((e) =>
    e.path.toLowerCase().includes(lowerQuery) ||
    e.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Generate Markdown documentation
 */
export function generateMarkdownDocs(): string {
  let md = `# API Reference\n\n`;
  md += `**Version:** ${API_INVENTORY.version}\n`;
  md += `**Generated:** ${API_INVENTORY.generatedAt}\n\n`;

  // Group by domain
  const domains = new Map<string, APIEndpoint[]>();
  for (const endpoint of API_INVENTORY.endpoints) {
    const domain = endpoint.path.split('.')[0];
    if (!domains.has(domain)) {
      domains.set(domain, []);
    }
    domains.get(domain)!.push(endpoint);
  }

  // Generate docs for each domain
  for (const [domain, endpoints] of domains.entries()) {
    md += `## ${domain.charAt(0).toUpperCase() + domain.slice(1)}\n\n`;

    for (const endpoint of endpoints) {
      md += `### \`${endpoint.path}\`\n\n`;
      md += `**Type:** ${endpoint.type}\n\n`;
      md += `**Authentication:** ${endpoint.authentication}\n\n`;
      if (endpoint.rateLimit) {
        md += `**Rate Limit:** ${endpoint.rateLimit}\n\n`;
      }
      md += `**Description:** ${endpoint.description}\n\n`;
      if (endpoint.deprecated) {
        md += `⚠️ **DEPRECATED**\n\n`;
      }
      md += `---\n\n`;
    }
  }

  return md;
}
