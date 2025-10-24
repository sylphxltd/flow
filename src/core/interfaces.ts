/**
 * Core service interfaces for dependency injection
 */

// Logger interface
export interface ILogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error | unknown, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
}

// Configuration interface
export interface IConfiguration {
  get<T = any>(key: string, defaultValue?: T): T;
  getRequired<T = any>(key: string): T;
  has(key: string): boolean;
  set(key: string, value: any): void;
  reload(): Promise<void>;
}

// Database connection interface
export interface IDatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;
  execute(sql: string, params?: any[]): Promise<any>;
}

// Storage interface for memory and cache
export interface IStorage {
  initialize(): Promise<void>;
  get(key: string, namespace?: string): Promise<any>;
  set(key: string, value: any, namespace?: string): Promise<void>;
  delete(key: string, namespace?: string): Promise<void>;
  clear(namespace?: string): Promise<void>;
  list(namespace?: string): Promise<string[]>;
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;
}

// Search service interface
export interface ISearchService {
  initialize(): Promise<void>;
  searchCodebase(query: string, options?: any): Promise<any>;
  searchKnowledge(query: string, options?: any): Promise<any>;
  getStatus(): Promise<any>;
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