/**
 * App Context - Services Provider Pattern
 * Functional composition for dependency injection
 *
 * Architecture:
 * - Services live in Context (database, managers)
 * - UI state lives in Zustand (navigation, loading)
 * - No global mutable state
 * - Type-safe composition
 */

import type { Agent } from './types/agent.types.js';
import type { Rule } from './types/rule.types.js';
import { SessionRepository } from './database/session-repository.js';
import { initializeDatabase } from './database/auto-migrate.js';
import { loadAllAgents } from './ai/agent-loader.js';
import { loadAllRules } from './ai/rule-loader.js';
import { DEFAULT_AGENT_ID } from './ai/builtin-agents.js';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// ============================================================================
// Types
// ============================================================================

export interface DatabaseConfig {
  url?: string;
  authToken?: string;
}

export interface AppConfig {
  database?: DatabaseConfig;
  cwd: string;
}

// ============================================================================
// Database Service API
// ============================================================================

export interface DatabaseService {
  getRepository(): SessionRepository;
  getDB(): DrizzleD1Database<any>;
}

function createDatabaseService(config: DatabaseConfig): DatabaseService {
  let db: any = null;
  let repository: SessionRepository | null = null;
  let initialized = false;

  const initialize = async (): Promise<void> => {
    if (initialized) return;

    db = await initializeDatabase(() => {});
    repository = new SessionRepository(db);
    initialized = true;
  };

  const getRepository = (): SessionRepository => {
    if (!repository) {
      throw new Error('Database not initialized. Call context.initialize() first.');
    }
    return repository;
  };

  const getDB = (): DrizzleD1Database<any> => {
    if (!db) {
      throw new Error('Database not initialized. Call context.initialize() first.');
    }
    return db;
  };

  return {
    initialize,
    getRepository,
    getDB,
  } as any;
}

// ============================================================================
// Agent Manager Service API
// ============================================================================

const FALLBACK_AGENT: Agent = {
  id: DEFAULT_AGENT_ID,
  metadata: {
    name: 'Coder',
    description: 'Default coding assistant',
  },
  systemPrompt: 'You are a helpful coding assistant.',
  isBuiltin: true,
};

export interface AgentManagerService {
  getAll(): Agent[];
  getById(id: string): Agent | null;
  reload(): Promise<void>;
}

function createAgentManagerService(cwd: string): AgentManagerService {
  let agents: Map<string, Agent> = new Map();
  let initialized = false;

  const initialize = async (): Promise<void> => {
    if (initialized) return;

    const allAgents = await loadAllAgents(cwd);
    agents = new Map(allAgents.map(a => [a.id, a]));
    initialized = true;
  };

  const getAll = (): Agent[] => {
    if (!initialized) return [FALLBACK_AGENT];
    return Array.from(agents.values());
  };

  const getById = (id: string): Agent | null => {
    if (!initialized) {
      return id === DEFAULT_AGENT_ID ? FALLBACK_AGENT : null;
    }
    return agents.get(id) || null;
  };

  const reload = async (): Promise<void> => {
    await initialize();
  };

  return {
    initialize,
    getAll,
    getById,
    reload,
  } as any;
}

// ============================================================================
// Rule Manager Service API
// ============================================================================

export interface RuleManagerService {
  getAll(): Rule[];
  getById(id: string): Rule | null;
  getEnabled(enabledIds: string[]): Rule[];
  reload(): Promise<void>;
}

function createRuleManagerService(cwd: string): RuleManagerService {
  let rules: Map<string, Rule> = new Map();
  let initialized = false;

  const initialize = async (): Promise<void> => {
    if (initialized) return;

    const allRules = await loadAllRules(cwd);
    rules = new Map(allRules.map(r => [r.id, r]));
    initialized = true;
  };

  const getAll = (): Rule[] => {
    if (!initialized) return [];
    return Array.from(rules.values());
  };

  const getById = (id: string): Rule | null => {
    if (!initialized) return null;
    return rules.get(id) || null;
  };

  const getEnabled = (enabledIds: string[]): Rule[] => {
    if (!initialized) return [];
    return enabledIds
      .map(id => rules.get(id))
      .filter((r): r is Rule => r !== undefined);
  };

  const reload = async (): Promise<void> => {
    await initialize();
  };

  return {
    initialize,
    getAll,
    getById,
    getEnabled,
    reload,
  } as any;
}

// ============================================================================
// App Context - Composition Root
// ============================================================================

export interface AppContext {
  database: DatabaseService;
  agentManager: AgentManagerService;
  ruleManager: RuleManagerService;
  config: AppConfig;
}

/**
 * Create app context with all services
 * Services are lazy-initialized via closures
 */
export function createAppContext(config: AppConfig): AppContext {
  const database = createDatabaseService(config.database || {});
  const agentManager = createAgentManagerService(config.cwd);
  const ruleManager = createRuleManagerService(config.cwd);

  return {
    database,
    agentManager,
    ruleManager,
    config,
  } as any;
}

/**
 * Initialize all services in context
 * Call this once at app startup
 */
export async function initializeAppContext(ctx: AppContext): Promise<void> {
  await (ctx.database as any).initialize();
  await (ctx.agentManager as any).initialize();
  await (ctx.ruleManager as any).initialize();
}

/**
 * Close all services and cleanup
 */
export async function closeAppContext(ctx: AppContext): Promise<void> {
  // Future: Add cleanup logic for database connections, etc.
}
