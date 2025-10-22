import { describe, it, expect, beforeEach } from 'vitest';
import { Effect } from 'effect';
import { pipe } from 'effect/Function';
import { RuntimeConfig, RuntimeConfigLive, execute, runSync } from '../../src/core/runtime.js';

describe('Runtime Configuration', () => {
  beforeEach(() => {
    // Reset environment before each test
    delete process.env.LOG_LEVEL;
    delete process.env.DATA_DIR;
    delete process.env.MAX_CONNECTIONS;
    delete process.env.TIMEOUT;
  });

  describe('RuntimeConfigLive', () => {
    it('should load default configuration when no environment variables are set', async () => {
      const config = await Effect.runPromise(
        pipe(RuntimeConfig, Effect.provide(RuntimeConfigLive))
      );

      expect(config).toEqual({
        logLevel: 'info',
        dataDir: './data',
        maxConnections: 10,
        timeout: 30000,
      });
    });

    it('should load configuration from environment variables', async () => {
      process.env.LOG_LEVEL = 'debug';
      process.env.DATA_DIR = '/tmp/data';
      process.env.MAX_CONNECTIONS = '20';
      process.env.TIMEOUT = '60000';

      const config = await Effect.runPromise(
        pipe(RuntimeConfig, Effect.provide(RuntimeConfigLive))
      );

      expect(config).toEqual({
        logLevel: 'debug',
        dataDir: '/tmp/data',
        maxConnections: 20,
        timeout: 60000,
      });
    });

    it('should handle mixed environment variables and defaults', async () => {
      process.env.LOG_LEVEL = 'warn';
      // Other variables use defaults

      const config = await Effect.runPromise(
        pipe(RuntimeConfig, Effect.provide(RuntimeConfigLive))
      );

      expect(config).toEqual({
        logLevel: 'warn',
        dataDir: './data',
        maxConnections: 10,
        timeout: 30000,
      });
    });
  });

  describe('execute function', () => {
    it('should execute Effect with runtime configuration', async () => {
      const effect = Effect.gen(function* () {
        const config = yield* RuntimeConfig;
        return config.logLevel;
      });

      const result = await execute(effect);
      expect(result).toBe('info');
    });

    it('should handle errors in Effect execution', async () => {
      const effect = Effect.fail(new Error('Test error'));

      await expect(execute(effect)).rejects.toThrow('Test error');
    });
  });

  describe('runSync function', () => {
    it('should execute Effect synchronously with runtime configuration', () => {
      const effect = Effect.gen(function* () {
        const config = yield* RuntimeConfig;
        return config.dataDir;
      });

      const result = runSync(effect);
      expect(result).toBe('./data');
    });

    it('should handle errors in synchronous Effect execution', () => {
      const effect = Effect.fail(new Error('Sync test error'));

      expect(() => runSync(effect)).toThrow('Sync test error');
    });
  });

  describe('Configuration validation', () => {
    it('should validate integer configuration values', async () => {
      process.env.MAX_CONNECTIONS = 'invalid';

      const effect = Effect.gen(function* () {
        const config = yield* RuntimeConfig;
        return config.maxConnections;
      });

      await expect(execute(effect)).rejects.toThrow();
    });

    it('should validate timeout configuration values', async () => {
      process.env.TIMEOUT = 'not-a-number';

      const effect = Effect.gen(function* () {
        const config = yield* RuntimeConfig;
        return config.timeout;
      });

      await expect(execute(effect)).rejects.toThrow();
    });
  });
});
