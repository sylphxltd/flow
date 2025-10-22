import { Effect } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ConfigError,
  DefaultAppConfig,
  TestConfigServiceLive,
  createConfigFromEnv,
  getDefaultConfigPath,
  mergeConfig,
} from '../../src/services/config-service.js';
import { type AppConfig, ConfigService } from '../../src/services/service-types.js';

describe('ConfigService', () => {
  const runTest = (testEffect: Effect.Effect<any, any, any>) => {
    return Effect.runSync(Effect.provide(testEffect, TestConfigServiceLive)) as any;
  };

  describe('configuration loading', () => {
    it('should load default configuration', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          const config = yield* configService.load();

          expect(config).toEqual(DefaultAppConfig);
          expect(config.version).toBe('1.0.0');
          expect(config.dataDir).toBe('.sylphx-flow');
          expect(config.logLevel).toBe('info');
        })
      ));

    it('should load configuration with custom path', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          const config = yield* configService.load('/custom/path/config.json');

          expect(config).toEqual(DefaultAppConfig);
        })
      ));
  });

  describe('configuration saving', () => {
    it('should save configuration', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          const config: AppConfig = {
            ...DefaultAppConfig,
            version: '2.0.0',
            dataDir: 'custom-data',
          };

          yield* configService.save(config);

          // Verify it was saved by loading it back
          const loadedConfig = yield* configService.load();
          expect(loadedConfig.version).toBe('2.0.0');
          expect(loadedConfig.dataDir).toBe('custom-data');
        })
      ));

    it('should save configuration with custom path', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          const config: AppConfig = {
            ...DefaultAppConfig,
            logLevel: 'debug',
          };

          yield* configService.save(config, '/custom/path/config.json');

          // Verify it was saved
          const loadedConfig = yield* configService.load('/custom/path/config.json');
          expect(loadedConfig.logLevel).toBe('debug');
        })
      ));
  });

  describe('configuration getting and setting', () => {
    it('should get configuration value by key', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          const version = yield* configService.get('version');
          expect(version).toBe('1.0.0');

          const dataDir = yield* configService.get('dataDir');
          expect(dataDir).toBe('.sylphx-flow');

          const logLevel = yield* configService.get('logLevel');
          expect(logLevel).toBe('info');
        })
      ));

    it('should set configuration value by key', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          yield* configService.set('version', '2.0.0');
          const version = yield* configService.get('version');
          expect(version).toBe('2.0.0');

          yield* configService.set('logLevel', 'debug');
          const logLevel = yield* configService.get('logLevel');
          expect(logLevel).toBe('debug');

          yield* configService.set('dataDir', 'custom-dir');
          const dataDir = yield* configService.get('dataDir');
          expect(dataDir).toBe('custom-dir');
        })
      ));

    it('should set nested configuration values', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          const newMemoryConfig = {
            defaultNamespace: 'test-namespace',
            maxEntries: 5000,
            retentionDays: 180,
          };

          yield* configService.set('memory', newMemoryConfig);
          const memory = yield* configService.get('memory');
          expect(memory).toEqual(newMemoryConfig);
        })
      ));
  });

  describe('configuration validation', () => {
    it('should validate valid configuration', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          const validConfig: AppConfig = {
            version: '1.0.0',
            dataDir: 'test',
            logLevel: 'info',
            targets: {},
            mcp: {
              enabled: true,
              servers: {},
            },
            memory: {
              defaultNamespace: 'test',
              maxEntries: 1000,
              retentionDays: 30,
            },
          };

          const result = yield* configService.validate(validConfig);
          expect(result).toEqual(validConfig);
        })
      ));

    it('should fail validation for invalid configuration', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          const invalidConfig = { invalid: 'config' };

          const result = yield* Effect.either(configService.validate(invalidConfig));
          expect(result._tag).toBe('Left');
          if (result._tag === 'Left') {
            expect(result.left).toBeInstanceOf(ConfigError);
            expect(result.left.message).toContain('Configuration validation failed');
          }
        })
      ));

    it('should fail validation for missing required fields', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          const incompleteConfig = {
            dataDir: 'test',
            // Missing version
          };

          const result = yield* Effect.either(configService.validate(incompleteConfig));
          expect(result._tag).toBe('Left');
          if (result._tag === 'Left') {
            expect(result.left).toBeInstanceOf(ConfigError);
            expect(result.left.message).toContain('version is required');
          }
        })
      ));

    it('should fix invalid log level', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          const configWithInvalidLogLevel = {
            version: '1.0.0',
            dataDir: 'test',
            logLevel: 'invalid', // Should default to 'info'
            targets: {},
            mcp: {
              enabled: true,
              servers: {},
            },
            memory: {
              defaultNamespace: 'test',
              maxEntries: 1000,
              retentionDays: 30,
            },
          };

          const result = yield* configService.validate(configWithInvalidLogLevel);
          expect(result.logLevel).toBe('info');
        })
      ));
  });

  describe('configuration persistence', () => {
    it('should maintain configuration state across operations', () =>
      runTest(
        Effect.gen(function* () {
          const configService = yield* ConfigService;
          // Set initial values
          yield* configService.set('version', '3.0.0');
          yield* configService.set('dataDir', 'persistent-dir');

          // Verify values persist
          const version = yield* configService.get('version');
          const dataDir = yield* configService.get('dataDir');

          expect(version).toBe('3.0.0');
          expect(dataDir).toBe('persistent-dir');

          // Save and reload
          const config = yield* configService.load();
          expect(config.version).toBe('3.0.0');
          expect(config.dataDir).toBe('persistent-dir');
        })
      ));
  });
});

describe('Configuration Utilities', () => {
  describe('getDefaultConfigPath', () => {
    it('should return default config path', () => {
      const path = getDefaultConfigPath();
      expect(path).toContain('.sylphx-flow');
      expect(path).toContain('config.json');
    });
  });

  describe('mergeConfig', () => {
    it('should merge configurations correctly', () => {
      const base: AppConfig = {
        version: '1.0.0',
        dataDir: 'base',
        logLevel: 'info',
        targets: {
          target1: {
            id: 'target1',
            name: 'Target 1',
            description: '',
            enabled: true,
            settings: {},
          },
        },
        mcp: {
          enabled: true,
          servers: { server1: { type: 'stdio', command: 'echo' } },
        },
        memory: {
          defaultNamespace: 'base',
          maxEntries: 1000,
          retentionDays: 30,
        },
      };

      const override: Partial<AppConfig> = {
        version: '2.0.0',
        logLevel: 'debug',
        targets: {
          target2: {
            id: 'target2',
            name: 'Target 2',
            description: '',
            enabled: true,
            settings: {},
          },
        },
        mcp: {
          enabled: true,
          servers: { server2: { type: 'http', url: 'http://localhost:3000' } },
        },
        memory: {
          defaultNamespace: 'base',
          maxEntries: 2000,
          retentionDays: 30,
        },
      };

      const merged = mergeConfig(base, override);

      expect(merged.version).toBe('2.0.0'); // Overridden
      expect(merged.dataDir).toBe('base'); // Preserved
      expect(merged.logLevel).toBe('debug'); // Overridden
      expect(merged.targets).toEqual({
        target1: { id: 'target1', name: 'Target 1', description: '', enabled: true, settings: {} },
        target2: { id: 'target2', name: 'Target 2', description: '', enabled: true, settings: {} },
      }); // Merged
      expect(merged.mcp.enabled).toBe(true); // Preserved
      expect(merged.mcp.servers).toEqual({
        server1: { type: 'stdio', command: 'echo' },
        server2: { type: 'http', url: 'http://localhost:3000' },
      }); // Merged
      expect(merged.memory).toEqual({
        defaultNamespace: 'base', // Preserved
        maxEntries: 2000, // Overridden
        retentionDays: 30, // Preserved
      });
    });
  });

  describe('createConfigFromEnv', () => {
    beforeEach(() => {
      // Clear environment variables
      delete process.env.SYLPHX_DATA_DIR;
      delete process.env.SYLPHX_LOG_LEVEL;
      delete process.env.SYLPHX_MEMORY_NAMESPACE;
      delete process.env.SYLPHX_MEMORY_MAX_ENTRIES;
      delete process.env.SYLPHX_MEMORY_RETENTION_DAYS;
    });

    it('should return default config when no env vars set', () => {
      const config = createConfigFromEnv();
      expect(config).toEqual(DefaultAppConfig);
    });

    it('should override config with environment variables', () => {
      process.env.SYLPHX_DATA_DIR = 'env-data-dir';
      process.env.SYLPHX_LOG_LEVEL = 'debug';
      process.env.SYLPHX_MEMORY_NAMESPACE = 'env-namespace';
      process.env.SYLPHX_MEMORY_MAX_ENTRIES = '5000';
      process.env.SYLPHX_MEMORY_RETENTION_DAYS = '180';

      const config = createConfigFromEnv();

      expect(config.dataDir).toBe('env-data-dir');
      expect(config.logLevel).toBe('debug');
      expect(config.memory.defaultNamespace).toBe('env-namespace');
      expect(config.memory.maxEntries).toBe(5000);
      expect(config.memory.retentionDays).toBe(180);
    });

    it('should ignore invalid environment variables', () => {
      process.env.SYLPHX_LOG_LEVEL = 'invalid';
      process.env.SYLPHX_MEMORY_MAX_ENTRIES = 'not-a-number';
      process.env.SYLPHX_MEMORY_RETENTION_DAYS = '-5';

      const config = createConfigFromEnv();

      expect(config.logLevel).toBe('info'); // Should default to 'info'
      expect(config.memory.maxEntries).toBe(10000); // Should keep default
      expect(config.memory.retentionDays).toBe(365); // Should keep default
    });
  });
});
