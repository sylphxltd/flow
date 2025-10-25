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
  execute(sql: string, params?: unknown[]): Promise<unknown>;
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
  searchCodebase(query: string, options?: unknown): Promise<unknown>;
  searchKnowledge(query: string, options?: unknown): Promise<unknown>;
  getStatus(): Promise<unknown>;
}

// Target manager interface
export interface ITargetManager {
  getTarget(id: string): any;
  getAllTargets(): any[];
  registerTarget(target: any): void;
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
  installServers(serverIds: string[], options?: any): Promise<void>;
  getAvailableServers(): string[];
  getInstalledServers(): string[];
}
