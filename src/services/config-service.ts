import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Context, Effect, Layer } from 'effect';
import {
  type AppConfig,
  ConfigError,
  ConfigService,
  type McpConfig,
  type MemoryConfig,
  type TargetConfig,
} from './service-types.js';

// Re-export types and values for convenience
export type { AppConfig, TargetConfig, McpConfig, MemoryConfig };

export { ConfigService, ConfigError };

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default application configuration
 */
export const DefaultAppConfig: AppConfig = {
  version: '1.0.0',
  dataDir: '.sylphx-flow',
  logLevel: 'info',
  targets: {},
  mcp: {
    enabled: true,
    servers: {},
  },
  memory: {
    defaultNamespace: 'default',
    maxEntries: 10000,
    retentionDays: 365,
  },
};

// ============================================================================
// CONFIGURATION SCHEMA
// ============================================================================

/**
 * Validate configuration object
 */
const validateConfig = (config: unknown): AppConfig => {
  if (!config || typeof config !== 'object') {
    throw new ConfigError('Configuration must be an object');
  }

  const cfg = config as any;

  // Validate required fields
  if (typeof cfg.version !== 'string') {
    throw new ConfigError('Configuration version is required and must be a string');
  }

  if (typeof cfg.dataDir !== 'string') {
    throw new ConfigError('Configuration dataDir is required and must be a string');
  }

  if (!['debug', 'info', 'warn', 'error'].includes(cfg.logLevel)) {
    cfg.logLevel = 'info'; // Default to info if invalid
  }

  // Validate targets
  if (cfg.targets && typeof cfg.targets !== 'object') {
    throw new ConfigError('Configuration targets must be an object');
  }

  // Validate MCP config
  if (cfg.mcp) {
    if (typeof cfg.mcp !== 'object') {
      throw new ConfigError('Configuration mcp must be an object');
    }
    if (typeof cfg.mcp.enabled !== 'boolean') {
      cfg.mcp.enabled = true;
    }
    if (cfg.mcp.servers && typeof cfg.mcp.servers !== 'object') {
      throw new ConfigError('Configuration mcp.servers must be an object');
    }
  } else {
    cfg.mcp = DefaultAppConfig.mcp;
  }

  // Validate memory config
  if (cfg.memory) {
    if (typeof cfg.memory !== 'object') {
      throw new ConfigError('Configuration memory must be an object');
    }
    if (typeof cfg.memory.defaultNamespace !== 'string') {
      cfg.memory = { ...cfg.memory, defaultNamespace: DefaultAppConfig.memory.defaultNamespace };
    }
    if (typeof cfg.memory.maxEntries !== 'number' || cfg.memory.maxEntries <= 0) {
      cfg.memory = { ...cfg.memory, maxEntries: DefaultAppConfig.memory.maxEntries };
    }
    if (typeof cfg.memory.retentionDays !== 'number' || cfg.memory.retentionDays <= 0) {
      cfg.memory = { ...cfg.memory, retentionDays: DefaultAppConfig.memory.retentionDays };
    }
  } else {
    cfg.memory = DefaultAppConfig.memory;
  }

  return cfg as AppConfig;
};

// ============================================================================
// CONFIGURATION SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Create configuration service with Effect
 */
const makeConfigService = Effect.gen(function* () {
  // Default config path
  const defaultConfigPath = join(process.cwd(), '.sylphx-flow', 'config.json');

  // Load configuration from file
  const load = (path?: string) =>
    Effect.gen(function* () {
      const configPath = path || defaultConfigPath;

      try {
        // Ensure directory exists
        yield* Effect.tryPromise({
          try: () => mkdir(dirname(configPath), { recursive: true }),
          catch: (error) =>
            new ConfigError(
              `Failed to create config directory: ${error}`,
              error as Error,
              configPath
            ),
        });

        // Read config file
        const configData = yield* Effect.tryPromise({
          try: () => readFile(configPath, 'utf-8'),
          catch: (error) =>
            new ConfigError(`Failed to read config file: ${error}`, error as Error, configPath),
        });

        // Parse and validate configuration
        const config = yield* Effect.try({
          try: () => validateConfig(JSON.parse(configData)),
          catch: (error) =>
            new ConfigError(`Failed to parse config file: ${error}`, error as Error, configPath),
        });

        yield* Effect.log(`Configuration loaded from ${configPath}`);
        return config;
      } catch (error) {
        // If file doesn't exist, return default config
        if (error instanceof ConfigError && error.cause && (error.cause as any).code === 'ENOENT') {
          yield* Effect.log(`Config file not found, using defaults`);
          return DefaultAppConfig;
        }
        throw error;
      }
    });

  // Save configuration to file
  const save = (config: AppConfig, path?: string) =>
    Effect.gen(function* () {
      const configPath = path || defaultConfigPath;

      // Validate configuration before saving
      const validatedConfig = yield* Effect.try({
        try: () => validateConfig(config),
        catch: (error) =>
          new ConfigError(`Invalid configuration: ${error}`, error as Error, configPath),
      });

      // Ensure directory exists
      yield* Effect.tryPromise({
        try: () => mkdir(dirname(configPath), { recursive: true }),
        catch: (error) =>
          new ConfigError(
            `Failed to create config directory: ${error}`,
            error as Error,
            configPath
          ),
      });

      // Write config file
      yield* Effect.tryPromise({
        try: () => writeFile(configPath, JSON.stringify(validatedConfig, null, 2), 'utf-8'),
        catch: (error) =>
          new ConfigError(`Failed to write config file: ${error}`, error as Error, configPath),
      });

      yield* Effect.log(`Configuration saved to ${configPath}`);
    });

  // Get configuration value by key
  const get = <K extends keyof AppConfig>(key: K) =>
    Effect.gen(function* () {
      const config = yield* load();
      return config[key];
    });

  // Set configuration value by key
  const set = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) =>
    Effect.gen(function* () {
      const config = yield* load();
      const updatedConfig = { ...config, [key]: value };
      yield* save(updatedConfig);
    });

  // Validate configuration
  const validate = (config: unknown) =>
    Effect.try({
      try: () => validateConfig(config),
      catch: (error) =>
        new ConfigError(`Configuration validation failed: ${error}`, error as Error),
    });

  return {
    load,
    save,
    get,
    set,
    validate,
  } as ConfigService;
});

// ============================================================================
// SERVICE LAYERS
// ============================================================================

/**
 * Configuration service layer
 */
export const ConfigServiceLive = Layer.effect(ConfigService, makeConfigService);

/**
 * Default configuration service layer
 */
export const DefaultConfigServiceLive = ConfigServiceLive;

// ============================================================================
// TEST LAYER
// ============================================================================

/**
 * In-memory configuration service for testing
 */
export const TestConfigServiceLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    let testConfig: AppConfig = { ...DefaultAppConfig };

    const load = (path?: string) => Effect.succeed(testConfig);

    const save = (config: AppConfig, path?: string) =>
      Effect.gen(function* () {
        testConfig = { ...config };
        yield* Effect.log('Test configuration saved');
      });

    const get = <K extends keyof AppConfig>(key: K) => Effect.succeed(testConfig[key]);

    const set = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) =>
      Effect.gen(function* () {
        testConfig = { ...testConfig, [key]: value };
        yield* Effect.log(`Test config ${String(key)} updated`);
      });

    const validate = (config: unknown) =>
      Effect.try({
        try: () => validateConfig(config),
        catch: (error) =>
          new ConfigError(`Configuration validation failed: ${error}`, error as Error),
      });

    return {
      load,
      save,
      get,
      set,
      validate,
    } as ConfigService;
  })
);

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get default configuration path
 */
export const getDefaultConfigPath = (): string => {
  return join(process.cwd(), '.sylphx-flow', 'config.json');
};

/**
 * Merge configurations with deep merge for nested objects
 */
export const mergeConfig = (base: AppConfig, override: Partial<AppConfig>): AppConfig => {
  return {
    ...base,
    ...override,
    targets: { ...base.targets, ...override.targets },
    mcp: override.mcp
      ? {
          ...base.mcp,
          ...override.mcp,
          servers: { ...base.mcp.servers, ...override.mcp.servers },
        }
      : base.mcp,
    memory: override.memory
      ? {
          ...base.memory,
          ...override.memory,
        }
      : base.memory,
  };
};

/**
 * Create configuration with environment variable overrides
 */
export const createConfigFromEnv = (): AppConfig => {
  let config = { ...DefaultAppConfig };

  // Override with environment variables
  if (process.env.SYLPHX_DATA_DIR) {
    config = { ...config, dataDir: process.env.SYLPHX_DATA_DIR };
  }

  if (process.env.SYLPHX_LOG_LEVEL) {
    const logLevel = process.env.SYLPHX_LOG_LEVEL;
    if (['debug', 'info', 'warn', 'error'].includes(logLevel)) {
      config = { ...config, logLevel: logLevel as any };
    }
  }

  if (process.env.SYLPHX_MEMORY_NAMESPACE) {
    config = {
      ...config,
      memory: { ...config.memory, defaultNamespace: process.env.SYLPHX_MEMORY_NAMESPACE },
    };
  }

  if (process.env.SYLPHX_MEMORY_MAX_ENTRIES) {
    const maxEntries = Number.parseInt(process.env.SYLPHX_MEMORY_MAX_ENTRIES, 10);
    if (!isNaN(maxEntries) && maxEntries > 0) {
      config = {
        ...config,
        memory: { ...config.memory, maxEntries },
      };
    }
  }

  if (process.env.SYLPHX_MEMORY_RETENTION_DAYS) {
    const retentionDays = Number.parseInt(process.env.SYLPHX_MEMORY_RETENTION_DAYS, 10);
    if (!isNaN(retentionDays) && retentionDays > 0) {
      config = {
        ...config,
        memory: { ...config.memory, retentionDays },
      };
    }
  }

  return config;
};
