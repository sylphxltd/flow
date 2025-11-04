/**
 * Configuration System - 統一配置系統
 * Feature-first, composable, functional configuration management
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { z } from 'zod';
import { Result, err, ok } from './result.js';
import { ConfigurationError, ValidationError } from './error-handling.js';
import { logger } from '../utils/logger.js';

/**
 * Configuration source
 */
export type ConfigSource =
  | { type: 'file'; path: string }
  | { type: 'env'; prefix?: string }
  | { type: 'object'; data: Record<string, unknown> }
  | { type: 'memory'; data: Record<string, unknown> };

/**
 * Configuration schema
 */
export type ConfigSchema = z.ZodSchema;

/**
 * Configuration options
 */
export interface ConfigOptions {
  schema?: ConfigSchema;
  sources?: ConfigSource[];
  defaults?: Record<string, unknown>;
  transformers?: ConfigTransformer[];
  validators?: ConfigValidator[];
}

/**
 * Configuration transformer
 */
export interface ConfigTransformer {
  name: string;
  transform(config: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Configuration validator
 */
export interface ConfigValidator {
  name: string;
  validate(config: Record<string, unknown>): Result<void, ValidationError>;
}

/**
 * Configuration manager
 */
export class ConfigManager {
  private config: Record<string, unknown> = {};
  private schema?: ConfigSchema;
  private sources: ConfigSource[] = [];
  private transformers: ConfigTransformer[] = [];
  private validators: ConfigValidator[] = [];
  private watchCallbacks = new Set<() => void>();

  constructor(options: ConfigOptions = {}) {
    this.schema = options.schema;
    this.sources = options.sources || [];
    this.transformers = options.transformers || [];
    this.validators = options.validators || [];

    // Set defaults
    if (options.defaults) {
      this.config = { ...options.defaults };
    }

    logger.debug('ConfigManager initialized', {
      sources: this.sources.length,
      transformers: this.transformers.length,
      validators: this.validators.length,
    });
  }

  /**
   * Add configuration source
   */
  addSource(source: ConfigSource): void {
    this.sources.push(source);
    logger.debug('Config source added', { type: source.type });
  }

  /**
   * Add transformer
   */
  addTransformer(transformer: ConfigTransformer): void {
    this.transformers.push(transformer);
    logger.debug('Config transformer added', { name: transformer.name });
  }

  /**
   * Add validator
   */
  addValidator(validator: ConfigValidator): void {
    this.validators.push(validator);
    logger.debug('Config validator added', { name: validator.name });
  }

  /**
   * Load configuration from all sources
   */
  async load(): Promise<Result<void, Error>> {
    logger.info('Loading configuration');

    try {
      // Load from sources in order
      for (const source of this.sources) {
        const result = await this.loadFromSource(source);
        if (!result.success) {
          return err(result.error);
        }

        // Merge configuration (later sources override earlier ones)
        this.config = { ...this.config, ...result.data };
      }

      // Apply transformers
      for (const transformer of this.transformers) {
        this.config = transformer.transform(this.config);
        logger.debug('Config transformer applied', { name: transformer.name });
      }

      // Apply schema validation
      if (this.schema) {
        const result = this.validateWithSchema(this.config);
        if (!result.success) {
          return err(result.error);
        }
        this.config = result.data;
      }

      // Apply custom validators
      for (const validator of this.validators) {
        const result = validator.validate(this.config);
        if (!result.success) {
          return err(result.error);
        }
      }

      logger.info('Configuration loaded successfully', {
        keys: Object.keys(this.config),
        sources: this.sources.length,
      });

      return ok(undefined);

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to load configuration', { error: errorObj.message });
      return err(errorObj);
    }
  }

  /**
   * Get configuration value
   */
  get<T = unknown>(key: string, defaultValue?: T): T {
    const value = this.getNestedValue(this.config, key);
    return value !== undefined ? (value as T) : defaultValue!;
  }

  /**
   * Set configuration value
   */
  set<T>(key: string, value: T): void {
    this.setNestedValue(this.config, key, value);
    this.notifyWatchers();
  }

  /**
   * Get all configuration
   */
  getAll(): Record<string, unknown> {
    // Return deep copy to ensure immutability
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.getNestedValue(this.config, key) !== undefined;
  }

  /**
   * Get configuration as typed object
   */
  as<T>(): T {
    return this.config as T;
  }

  /**
   * Watch for configuration changes
   */
  watch(callback: () => void): () => void {
    this.watchCallbacks.add(callback);
    return () => this.watchCallbacks.delete(callback);
  }

  /**
   * Reload configuration
   */
  async reload(): Promise<Result<void, Error>> {
    this.config = {};
    return this.load();
  }

  /**
   * Load from specific source
   */
  private async loadFromSource(source: ConfigSource): Promise<Result<Record<string, unknown>, Error>> {
    switch (source.type) {
      case 'file':
        return this.loadFromFile(source.path);
      case 'env':
        return this.loadFromEnv(source.prefix);
      case 'object':
        return ok(source.data);
      case 'memory':
        return ok(source.data);
      default:
        return err(new ConfigurationError(`Unknown source type: ${(source as any).type}`));
    }
  }

  /**
   * Load from file
   */
  private loadFromFile(path: string): Result<Record<string, unknown>, Error> {
    if (!existsSync(path)) {
      logger.warn('Config file not found', { path });
      return ok({});
    }

    try {
      const content = readFileSync(path, 'utf-8');
      const config = this.parseFileContent(content, path);
      logger.debug('Config loaded from file', { path, keys: Object.keys(config) });
      return ok(config);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return err(new ConfigurationError(`Failed to load config from ${path}: ${errorObj.message}`));
    }
  }

  /**
   * Load from environment variables
   */
  private loadFromEnv(prefix = ''): Result<Record<string, unknown>, Error> {
    const config: Record<string, unknown> = {};
    const envPrefix = prefix ? `${prefix}_` : '';

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(envPrefix)) {
        const configKey = key.slice(envPrefix.length).toLowerCase();
        config[configKey] = this.parseEnvValue(value);
      }
    }

    logger.debug('Config loaded from environment', {
      prefix,
      keys: Object.keys(config),
    });

    return ok(config);
  }

  /**
   * Parse file content based on extension
   */
  private parseFileContent(content: string, path: string): Record<string, unknown> {
    const ext = path.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'json':
        return JSON.parse(content);
      case 'js':
      case 'ts':
        // For JS/TS files, we'd need to use dynamic imports
        // This is a simplified version
        throw new Error(`JS/TS config files not yet supported: ${path}`);
      default:
        throw new Error(`Unsupported config file format: ${ext}`);
    }
  }

  /**
   * Parse environment variable value
   */
  private parseEnvValue(value: string | undefined): unknown {
    if (value === undefined) return undefined;

    // Try JSON
    try {
      return JSON.parse(value);
    } catch {
      // Try common types
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (/^\d+$/.test(value)) return parseInt(value, 10);
      if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

      return value;
    }
  }

  /**
   * Validate with schema
   */
  private validateWithSchema(config: Record<string, unknown>): Result<Record<string, unknown>, ValidationError> {
    try {
      const result = this.schema!.parse(config);
      return ok(result);
    } catch (error) {
      if (error instanceof z.ZodError && error.errors && Array.isArray(error.errors)) {
        const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return err(new ValidationError(`Configuration validation failed: ${message}`));
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      return err(new ValidationError(`Configuration validation failed: ${errorMessage}`));
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? (current as any)[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    let current = obj;
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[lastKey] = value;
  }

  /**
   * Notify watchers of changes
   */
  private notifyWatchers(): void {
    for (const callback of this.watchCallbacks) {
      callback();
    }
  }
}

/**
 * Configuration factory
 */
export const ConfigFactory = {
  /**
   * Create a new config manager
   */
  create(options?: ConfigOptions): ConfigManager {
    return new ConfigManager(options);
  },

  /**
   * Create config manager with file source
   */
  fromFile(path: string, options?: Omit<ConfigOptions, 'sources'>): ConfigManager {
    return new ConfigManager({
      ...options,
      sources: [{ type: 'file', path }],
    });
  },

  /**
   * Create config manager with environment source
   */
  fromEnv(prefix?: string, options?: Omit<ConfigOptions, 'sources'>): ConfigManager {
    return new ConfigManager({
      ...options,
      sources: [{ type: 'env', prefix }],
    });
  },

  /**
   * Create config manager with multiple sources
   */
  fromSources(sources: ConfigSource[], options?: Omit<ConfigOptions, 'sources'>): ConfigManager {
    return new ConfigManager({
      ...options,
      sources,
    });
  },
} as const;

/**
 * Common configuration schemas
 */
export const ConfigSchemas = {
  /**
   * Application configuration
   */
  app: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string().optional(),
    environment: z.enum(['development', 'production', 'test']).default('development'),
    debug: z.boolean().default(false),
  }),

  /**
   * Server configuration
   */
  server: z.object({
    port: z.number().positive().default(3000),
    host: z.string().default('localhost'),
    cors: z.boolean().default(true),
  }),

  /**
   * Database configuration
   */
  database: z.object({
    url: z.string(),
    ssl: z.boolean().optional(),
    pool: z.object({
      min: z.number().min(0).default(0),
      max: z.number().positive().default(10),
    }).optional(),
  }),

  /**
   * Logging configuration
   */
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'text']).default('text'),
    file: z.string().optional(),
  }),

  /**
   * Cache configuration
   */
  cache: z.object({
    type: z.enum(['memory', 'redis']).default('memory'),
    ttl: z.number().positive().default(3600),
    maxSize: z.number().positive().optional(),
    redis: z.object({
      url: z.string(),
      keyPrefix: z.string().optional(),
    }).optional(),
  }),
} as const;

/**
 * Common transformers
 */
export const ConfigTransformers = {
  /**
   * Environment variable expansion
   */
  envExpander: (): ConfigTransformer => ({
    name: 'envExpander',
    transform: (config): Record<string, unknown> => {
      const expanded: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'string') {
          expanded[key] = value.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
            return process.env[envVar] || match;
          });
        } else {
          expanded[key] = value;
        }
      }

      return expanded;
    },
  }),

  /**
   * Path resolution
   */
  pathResolver: (basePath?: string): ConfigTransformer => ({
    name: 'pathResolver',
    transform: (config): Record<string, unknown> => {
      const base = basePath || process.cwd();
      const resolved: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'string' && (value.startsWith('./') || value.startsWith('../'))) {
          resolved[key] = join(base, value);
        } else {
          resolved[key] = value;
        }
      }

      return resolved;
    },
  }),
} as const;

/**
 * Common validators
 */
export const ConfigValidators = {
  /**
   * Required fields validator
   */
  required: (fields: string[]): ConfigValidator => ({
    name: 'required',
    validate: (config): Result<void, ValidationError> => {
      const missing = fields.filter(field => !config[field]);
      if (missing.length > 0) {
        return err(new ValidationError(`Required fields missing: ${missing.join(', ')}`));
      }
      return ok(undefined);
    },
  }),

  /**
   * Port range validator
   */
  portRange: (key = 'port'): ConfigValidator => ({
    name: 'portRange',
    validate: (config): Result<void, ValidationError> => {
      const port = config[key];
      if (port !== undefined && (typeof port !== 'number' || port < 1 || port > 65535)) {
        return err(new ValidationError(`Invalid port number: ${port}`));
      }
      return ok(undefined);
    },
  }),
} as const;