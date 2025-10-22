import { Context, type Effect, Layer } from 'effect';

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Memory service interface
 */
export interface MemoryService {
  readonly set: (
    key: string,
    value: string,
    namespace?: string
  ) => Effect.Effect<void, MemoryError, never>;
  readonly get: (
    key: string,
    namespace?: string
  ) => Effect.Effect<MemoryEntry | null, MemoryError, never>;
  readonly list: (
    namespace?: string,
    limit?: number
  ) => Effect.Effect<MemoryEntry[], MemoryError, never>;
  readonly delete: (key: string, namespace?: string) => Effect.Effect<boolean, MemoryError, never>;
  readonly clear: (namespace?: string) => Effect.Effect<void, MemoryError, never>;
  readonly search: (
    pattern: string,
    namespace?: string
  ) => Effect.Effect<MemoryEntry[], MemoryError, never>;
}

/**
 * Memory service tag
 */
export const MemoryService = Context.GenericTag<MemoryService>('MemoryService');

/**
 * Memory entry interface
 */
export interface MemoryEntry {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly namespace: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Memory service errors
 */
export class MemoryError extends Error {
  readonly _tag = 'MemoryError';

  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly operation?: string
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

/**
 * Config service interface
 */
export interface ConfigService {
  readonly load: (path?: string) => Effect.Effect<AppConfig, ConfigError, never>;
  readonly save: (config: AppConfig, path?: string) => Effect.Effect<void, ConfigError, never>;
  readonly get: <K extends keyof AppConfig>(
    key: K
  ) => Effect.Effect<AppConfig[K], ConfigError, never>;
  readonly set: <K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K]
  ) => Effect.Effect<void, ConfigError, never>;
  readonly validate: (config: unknown) => Effect.Effect<AppConfig, ConfigError, never>;
}

/**
 * Config service tag
 */
export const ConfigService = Context.GenericTag<ConfigService>('ConfigService');

/**
 * Application configuration interface
 */
export interface AppConfig {
  readonly version: string;
  readonly dataDir: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly targets: Record<string, TargetConfig>;
  readonly mcp: McpConfig;
  readonly memory: MemoryConfig;
}

/**
 * Target configuration
 */
export interface TargetConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly settings: Record<string, unknown>;
}

/**
 * MCP configuration
 */
export interface McpConfig {
  readonly enabled: boolean;
  readonly servers: Record<string, McpServerConfig>;
}

/**
 * MCP server configuration
 */
export interface McpServerConfig {
  readonly type: 'stdio' | 'http';
  readonly command?: string;
  readonly args?: string[];
  readonly env?: Record<string, string>;
  readonly url?: string;
  readonly headers?: Record<string, string>;
}

/**
 * Memory configuration
 */
export interface MemoryConfig {
  readonly defaultNamespace: string;
  readonly maxEntries: number;
  readonly retentionDays: number;
}

/**
 * Config service errors
 */
export class ConfigError extends Error {
  readonly _tag = 'ConfigError';

  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly path?: string
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * MCP service interface
 */
export interface McpService {
  readonly start: (serverId: string) => Effect.Effect<void, McpError, never>;
  readonly stop: (serverId: string) => Effect.Effect<void, McpError, never>;
  readonly list: () => Effect.Effect<McpServer[], McpError, never>;
  readonly status: (serverId: string) => Effect.Effect<McpServerStatus, McpError, never>;
  readonly restart: (serverId: string) => Effect.Effect<void, McpError, never>;
}

/**
 * MCP service tag
 */
export const McpService = Context.GenericTag<McpService>('McpService');

/**
 * MCP server information
 */
export interface McpServer {
  readonly id: string;
  readonly name: string;
  readonly config: McpServerConfig;
  readonly status: McpServerStatus;
  readonly pid?: number;
  readonly port?: number;
}

/**
 * MCP server status
 */
export type McpServerStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

/**
 * MCP service errors
 */
export class McpError extends Error {
  readonly _tag = 'McpError';

  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly serverId?: string
  ) {
    super(message);
    this.name = 'McpError';
  }
}

/**
 * Terminal service interface
 */
export interface TerminalService {
  readonly print: (message: string, style?: TerminalStyle) => Effect.Effect<void, never, never>;
  readonly success: (message: string) => Effect.Effect<void, never, never>;
  readonly error: (message: string) => Effect.Effect<void, never, never>;
  readonly warning: (message: string) => Effect.Effect<void, never, never>;
  readonly info: (message: string) => Effect.Effect<void, never, never>;
  readonly table: (data: unknown[], options?: TableOptions) => Effect.Effect<void, never, never>;
  readonly progress: (
    total: number,
    current: number,
    message?: string
  ) => Effect.Effect<void, never, never>;
}

/**
 * Terminal service tag
 */
export const TerminalService = Context.GenericTag<TerminalService>('TerminalService');

/**
 * Terminal styling options
 */
export interface TerminalStyle {
  readonly color?: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray';
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
}

/**
 * Table display options
 */
export interface TableOptions {
  readonly headers?: string[];
  readonly border?: boolean;
  readonly padding?: number;
}

// ============================================================================
// SERVICE LAYER COMPOSITION
// ============================================================================

/**
 * Main services layer combining all service layers
 */
export const ServicesLayer = Layer.empty;

// ============================================================================
// SERVICE COMBINATORS
// ============================================================================

/**
 * Create a service layer with dependencies
 */
export const makeServiceLayer = <S, R, E>(
  tag: Context.Tag<S, any>,
  implementation: Effect.Effect<S, E, R>
): Layer.Layer<S, E, R> => {
  return Layer.effect(tag, implementation);
};
