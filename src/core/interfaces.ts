/**
 * Core service interfaces for dependency injection
 */

// Logger interface
export interface ILogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
}

// Configuration interface
export interface IConfiguration {
  get<T = unknown>(key: string, defaultValue?: T): T;
  getRequired<T = unknown>(key: string): T;
  has(key: string): boolean;
  set(key: string, value: unknown): void;
  reload(): Promise<void>;
}

// Database connection interface
export interface IDatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;
  execute(sql: string, params?: unknown[]): Promise<DatabaseQueryResult>;
}

// Database query result
export interface DatabaseQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  command: string;
}

// Storage interface for memory and cache
export interface IStorage<T = unknown> {
  initialize(): Promise<void>;
  get(key: string, namespace?: string): Promise<T | null>;
  set(key: string, value: T, namespace?: string): Promise<void>;
  delete(key: string, namespace?: string): Promise<void>;
  clear(namespace?: string): Promise<void>;
  list(namespace?: string): Promise<string[]>;
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;
}

// Search service interface
export interface ISearchService {
  initialize(): Promise<void>;
  searchCodebase(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  searchKnowledge(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  getStatus(): Promise<SearchServiceStatus>;
}

// Search options
export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Search result
export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

// Search service status
export interface SearchServiceStatus {
  indexed: number;
  total: number;
  lastIndexed: string;
  healthy: boolean;
}

// Target manager interface
export interface ITargetManager {
  getTarget(id: string): Target | null;
  getAllTargets(): Target[];
  registerTarget(target: Target): void;
}

// Target definition
export interface Target {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

// Embedding provider interface
export interface IEmbeddingProvider {
  name: string;
  embed(text: string): Promise<number[]>;
  isAvailable(): Promise<boolean>;
}

// MCP service interface
export interface IMCPService {
  initialize(): Promise<void>;
  installServers(serverIds: string[], options?: MCPServerInstallOptions): Promise<void>;
  getAvailableServers(): MCPServerInfo[];
  getInstalledServers(): MCPServerInfo[];
}

// MCP server installation options
export interface MCPServerInstallOptions {
  force?: boolean;
  autoStart?: boolean;
  config?: Record<string, unknown>;
}

// MCP server information
export interface MCPServerInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  installed: boolean;
  enabled: boolean;
  config?: Record<string, unknown>;
}
