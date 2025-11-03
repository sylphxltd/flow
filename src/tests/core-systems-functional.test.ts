/**
 * Core Systems Functional Pattern Verification Tests
 *
 * Tests for:
 * - unified-storage.ts functional patterns
 * - command-system.ts functional patterns
 * - config-system.ts functional patterns
 * - error-handling.ts functional patterns
 */

import { describe, it, expect, beforeEach } from 'bun:test';

// Import core systems
import { MemoryStorage, CacheStorage, VectorStorage, createStorage, StorageConfig } from '../core/unified-storage';
import { CommandRegistry, CommandUtils, CommandBuilder } from '../core/command-system';
import { ConfigManager, ConfigFactory, ConfigTransformers, ConfigValidators } from '../core/config-system';
import { BaseError, ValidationError, withErrorHandling, CircuitBreaker } from '../core/error-handling';
import { ok, err, Result, map, flatMap, tap, tapError } from '../core/result';

describe('Unified Storage Functional Patterns', () => {
  describe('Immutable Operations', () => {
    it('should not mutate input values', async () => {
      const storage = new MemoryStorage<any>();
      await storage.initialize();

      const originalValue = { name: 'test', data: [1, 2, 3] };
      const valueCopy = { ...originalValue };

      await storage.set('key', originalValue);

      // Modify original after setting
      originalValue.data.push(4);

      // Retrieve should have original copy, not modified version
      const retrieved = await storage.get('key');
      expect(retrieved).toEqual(valueCopy);
      expect(retrieved?.data).toEqual([1, 2, 3]);
    });

    it('should handle immutability in CacheStorage', async () => {
      const cache = new CacheStorage<any>({ type: 'cache', defaultTTL: 3600 });
      await cache.initialize();

      const originalData = { user: { name: 'John', preferences: { theme: 'dark' } } };
      await cache.set('user', originalData);

      // Modify original after caching
      originalData.user.preferences.theme = 'light';

      const cached = await cache.get('user');
      expect(cached?.user.preferences.theme).toBe('dark');
    });
  });

  describe('Functional Storage Factory', () => {
    it('should create appropriate storage types', () => {
      const memoryStorage = createStorage(StorageConfig.memory());
      const cacheStorage = createStorage(StorageConfig.cache({ defaultTTL: 1800 }));
      const vectorStorage = createStorage(StorageConfig.vector());

      expect(memoryStorage.type).toBe('memory');
      expect(cacheStorage.type).toBe('cache');
      expect(vectorStorage.type).toBe('vector');
    });

    it('should use functional configuration builders', () => {
      const config = StorageConfig.cache({
        defaultTTL: 7200,
        maxCacheSize: 1000,
        storageDir: './cache'
      });

      expect(config.type).toBe('cache');
      expect(config.defaultTTL).toBe(7200);
      expect(config.maxCacheSize).toBe(1000);
      expect(config.storageDir).toBe('./cache');
    });
  });

  describe('Functional Storage Operations', () => {
    it('should support functional composition with storage', async () => {
      const storage = new MemoryStorage<number>();
      await storage.initialize();

      // Functional pipeline: set -> get -> transform
      const result = await storage.set('key', 5)
        .then(() => storage.get('key'))
        .then(value => value ?? 0)
        .then(x => x * 2)
        .then(x => `Result: ${x}`);

      expect(result).toBe('Result: 10');
    });

    it('should handle storage operations with Result type', async () => {
      const storage = new MemoryStorage<string>();
      await storage.initialize();

      const safeGet = async (key: string): Promise<Result<string | null, Error>> => {
        try {
          const value = await storage.get(key);
          return ok(value);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      };

      const safeSet = async (key: string, value: string): Promise<Result<void, Error>> => {
        try {
          await storage.set(key, value);
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      };

      // Compose operations functionally
      const pipeline = safeSet('test', 'hello')
        .then(flatMap(() => safeGet('test')))
        .then(map(value => value?.toUpperCase() ?? ''))
        .then(tap(value => console.log(`Processed: ${value}`)));

      const result = await pipeline;
      expect(result).toEqual({ success: true, data: 'HELLO' });
    });
  });
});

describe('Command System Functional Patterns', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('Functional Command Building', () => {
    it('should use builder pattern functionally', () => {
      const command = CommandUtils.builder()
        .name('test')
        .description('Test command')
        .handler(async (context) => ok(`Executed with: ${JSON.stringify(context.options)}`))
        .option(CommandUtils.option.string('input', 'Input value', true))
        .middleware(CommandUtils.middleware.logging())
        .examples(['test --input hello'])
        .build();

      expect(command.name).toBe('test');
      expect(command.options).toHaveLength(1);
      expect(command.middleware).toHaveLength(1);
    });

    it('should create commands with functional factory', () => {
      const simpleCommand = CommandUtils.create(
        'simple',
        'Simple command',
        async (options) => `Simple: ${options.name ?? 'default'}`
      );

      const withOptionsCommand = CommandUtils.createWithOptions(
        'complex',
        'Complex command',
        [
          CommandUtils.option.string('name', 'Name', true),
          CommandUtils.option.number('count', 'Count', false)
        ],
        async (options) => ({ name: options.name, count: options.count ?? 1 })
      );

      expect(simpleCommand.name).toBe('simple');
      expect(withOptionsCommand.options).toHaveLength(2);
    });
  });

  describe('Functional Command Execution', () => {
    it('should execute commands with Result type', async () => {
      const command = CommandUtils.create(
        'test',
        'Test command',
        async (options) => {
          if (options.fail) {
            throw new Error('Command failed');
          }
          return `Success: ${options.message}`;
        }
      );

      registry.register(command);

      const successResult = await registry.execute('test', { message: 'hello' });
      const failResult = await registry.execute('test', { fail: true });

      expect(successResult.success).toBe(true);
      expect(successResult.data).toBe('Success: hello');
      expect(failResult.success).toBe(false);
      expect(failResult.error?.message).toBe('Command failed');
    });

    it('should handle middleware functionally', async () => {
      let beforeCalled = false;
      let afterCalled = false;
      let onErrorCalled = false;

      const middleware = {
        name: 'test',
        before: async () => { beforeCalled = true; },
        after: async () => { afterCalled = true; },
        onError: async () => { onErrorCalled = true; }
      };

      const command = CommandUtils.builder()
        .name('middleware-test')
        .description('Test middleware')
        .handler(async () => ok('success'))
        .middleware(middleware)
        .build();

      registry.register(command);

      await registry.execute('middleware-test', {});

      expect(beforeCalled).toBe(true);
      expect(afterCalled).toBe(true);
      expect(onErrorCalled).toBe(false);
    });
  });

  describe('Functional Option Processing', () => {
    it('should process options immutably', async () => {
      const originalOptions = {
        string: 'hello',
        number: '42',
        boolean: 'true',
        array: 'a,b,c'
      };

      const command = CommandUtils.createWithOptions(
        'process-options',
        'Process options',
        [
          CommandUtils.option.string('string', 'String'),
          CommandUtils.option.number('number', 'Number'),
          CommandUtils.option.boolean('boolean', 'Boolean'),
          CommandUtils.option.array('array', 'Array')
        ],
        async (options) => ({ ...options })
      );

      registry.register(command);

      const result = await registry.execute('process-options', { ...originalOptions });

      // Original options should remain unchanged
      expect(originalOptions.string).toBe('hello');
      expect(originalOptions.number).toBe('42');
      expect(originalOptions.boolean).toBe('true');
      expect(originalOptions.array).toBe('a,b,c');

      // Processed options should be transformed
      if (result.success) {
        expect(result.data.string).toBe('hello');
        expect(result.data.number).toBe(42);
        expect(result.data.boolean).toBe(true);
        expect(result.data.array).toEqual(['a', 'b', 'c']);
      }
    });
  });
});

describe('Configuration System Functional Patterns', () => {
  describe('Functional Configuration Loading', () => {
    it('should load configuration functionally', async () => {
      const configManager = ConfigFactory.fromSources([
        { type: 'object', data: { name: 'app', version: '1.0.0' } },
        { type: 'object', data: { environment: 'development' } }
      ]);

      const result = await configManager.load();
      expect(result.success).toBe(true);

      const config = configManager.getAll();
      expect(config).toEqual({
        name: 'app',
        version: '1.0.0',
        environment: 'development'
      });
    });

    it('should handle configuration validation functionally', async () => {
      const configManager = ConfigFactory.create({
        validators: [
          ConfigValidators.required(['name', 'version']),
          ConfigValidators.portRange('port')
        ],
        defaults: {
          port: 3000
        }
      });

      configManager.addSource({ type: 'object', data: { name: 'test', version: '1.0.0', port: 8080 } });

      const result = await configManager.load();
      expect(result.success).toBe(true);
    });

    it('should handle configuration errors functionally', async () => {
      const configManager = ConfigFactory.create({
        validators: [
          ConfigValidators.required(['name', 'version'])
        ]
      });

      configManager.addSource({ type: 'object', data: { version: '1.0.0' } }); // Missing 'name'

      const result = await configManager.load();
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ValidationError);
    });
  });

  describe('Functional Configuration Transformation', () => {
    it('should apply transformers functionally', async () => {
      const configManager = ConfigFactory.create({
        transformers: [
          ConfigTransformers.envExpander(),
          ConfigTransformers.pathResolver('/base/path')
        ],
        defaults: {
          databaseUrl: '${DATABASE_URL}',
          logPath: './logs',
          staticPath: '../static'
        }
      });

      // Mock environment variable
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

      const result = await configManager.load();
      expect(result.success).toBe(true);

      const config = configManager.getAll();
      expect(config.databaseUrl).toBe('postgresql://localhost:5432/test');
      expect(config.logPath).toBe('/base/path/logs');
      expect(config.staticPath).toBe('/base/path/../static');

      // Clean up
      delete process.env.DATABASE_URL;
    });

    it('should support custom transformers', async () => {
      const customTransformer = {
        name: 'uppercase',
        transform: (config: Record<string, unknown>) => {
          const transformed: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(config)) {
            if (typeof value === 'string') {
              transformed[key] = value.toUpperCase();
            } else {
              transformed[key] = value;
            }
          }
          return transformed;
        }
      };

      const configManager = ConfigFactory.create({
        transformers: [customTransformer]
      });

      configManager.addSource({
        type: 'object',
        data: { name: 'app', environment: 'development' }
      });

      const result = await configManager.load();
      expect(result.success).toBe(true);

      const config = configManager.getAll();
      expect(config.name).toBe('APP');
      expect(config.environment).toBe('DEVELOPMENT');
    });
  });

  describe('Immutable Configuration Access', () => {
    it('should return immutable copies', async () => {
      const configManager = ConfigFactory.create();
      configManager.addSource({
        type: 'object',
        data: { nested: { value: 42 } }
      });

      await configManager.load();

      const config1 = configManager.getAll();
      const config2 = configManager.getAll();

      // Modify one copy
      (config1 as any).nested.value = 100;

      // Other copy should remain unchanged
      expect(config2.nested.value).toBe(42);
      expect(configManager.get('nested.value')).toBe(42);
    });

    it('should handle configuration watching functionally', async () => {
      const configManager = ConfigFactory.create();
      let watchCalled = false;

      const unwatch = configManager.watch(() => {
        watchCalled = true;
      });

      configManager.set('test.value', 'changed');

      expect(watchCalled).toBe(true);
      unwatch();

      // Changes after unwatch shouldn't trigger
      watchCalled = false;
      configManager.set('test.value2', 'changed2');
      expect(watchCalled).toBe(false);
    });
  });
});

describe('Error Handling Functional Patterns', () => {
  describe('Functional Error Wrapping', () => {
    it('should wrap async functions with error handling', async () => {
      const goodFn = async () => 'success';
      const badFn = async () => { throw new Error('async error'); };

      const goodResult = await withErrorHandling(goodFn);
      const badResult = await withErrorHandling(badFn);

      expect(goodResult).toEqual({ success: true, data: 'success' });
      expect(badResult).toEqual({ success: false, error: expect.any(Error) });
    });

    it('should support custom error handlers', async () => {
      let customHandlerCalled = false;
      let customError: Error | undefined;

      const customHandler = async (error: Error) => {
        customHandlerCalled = true;
        customError = error;
      };

      const result = await withErrorHandling(
        async () => { throw new Error('handled error'); },
        customHandler
      );

      expect(result.success).toBe(false);
      expect(customHandlerCalled).toBe(true);
      expect(customError?.message).toBe('handled error');
    });
  });

  describe('Functional Error Types', () => {
    it('should create typed errors immutably', () => {
      const validationError = new ValidationError('Invalid input', { field: 'name' });
      const configError = new BaseError('Config error', 'CONFIG_ERROR', 500, { file: 'app.json' });

      expect(validationError.code).toBe('VALIDATION_ERROR');
      expect(validationError.statusCode).toBe(400);
      expect(validationError.details).toEqual({ field: 'name' });

      expect(configError.code).toBe('CONFIG_ERROR');
      expect(configError.statusCode).toBe(500);
      expect(configError.details).toEqual({ file: 'app.json' });
    });

    it('should support error chaining functionally', () => {
      const wrapError = (error: Error): BaseError => {
        return new BaseError(
          `Wrapped: ${error.message}`,
          'WRAPPED_ERROR',
          500,
          { originalError: error.message }
        );
      };

      const originalError = new Error('original');
      const wrapped = wrapError(originalError);

      expect(wrapped.message).toBe('Wrapped: original');
      expect(wrapped.details?.originalError).toBe('original');
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should handle circuit breaker functionally', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeMs: 100
      });

      const flakyFn = async () => {
        if (Math.random() < 0.7) {
          throw new Error('Random failure');
        }
        return 'success';
      };

      // Test successful execution
      const result1 = await circuitBreaker.execute(flakyFn);
      expect(result1.success || result1.error.message).toBeDefined();

      // Force failures to trigger circuit breaker
      let circuitOpen = false;
      for (let i = 0; i < 3; i++) {
        const result = await circuitBreaker.execute(async () => { throw new Error('Forced failure'); });
        if (result.error?.message === 'Circuit breaker is open') {
          circuitOpen = true;
          break;
        }
      }

      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should support circuit breaker recovery', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 1,
        recoveryTimeMs: 50 // Short recovery time for testing
      });

      // Trigger circuit breaker
      await circuitBreaker.execute(async () => { throw new Error('Failure'); });
      expect(circuitBreaker.getState()).toBe('open');

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 60));

      // Should be in half-open state
      const result = await circuitBreaker.execute(async () => 'recovered');
      expect(result.success).toBe(true);
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });

  describe('Functional Error Composition', () => {
    it('should compose error handling with Result type', async () => {
      const validateInput = (input: any): Result<string, ValidationError> => {
        if (!input || typeof input !== 'string') {
          return err(new ValidationError('Invalid input'));
        }
        return ok(input.trim());
      };

      const processData = async (data: string): Promise<Result<number, Error>> => {
        try {
          const num = parseInt(data);
          if (isNaN(num)) {
            return err(new Error('Not a number'));
          }
          return ok(num * 2);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      };

      const pipeline = async (input: any): Promise<Result<number, Error>> => {
        const validationResult = validateInput(input);
        if (!validationResult.success) {
          return err(validationResult.error);
        }

        return processData(validationResult.data);
      };

      const validResult = await pipeline(' 21 ');
      const invalidResult1 = await pipeline(null);
      const invalidResult2 = await pipeline('not a number');

      expect(validResult).toEqual({ success: true, data: 42 });
      expect(invalidResult1.success).toBe(false);
      expect(invalidResult1.error).toBeInstanceOf(ValidationError);
      expect(invalidResult2.success).toBe(false);
      expect(invalidResult2.error).toBeInstanceOf(Error);
    });
  });
});

describe('Cross-System Functional Integration', () => {
  it('should integrate all systems functionally', async () => {
    // Setup configuration
    const config = ConfigFactory.create({
      transformers: [ConfigTransformers.envExpander()]
    });
    config.addSource({ type: 'object', data: { retries: 3, timeout: 5000 } });
    await config.load();

    // Setup storage
    const storage = createStorage(StorageConfig.memory());
    await storage.initialize();

    // Setup command system
    const commands = new CommandRegistry();
    commands.addMiddleware(CommandUtils.middleware.timing());

    // Create integrated command that uses all systems
    const processCommand = CommandUtils.createWithOptions(
      'process',
      'Process data using all systems',
      [CommandUtils.option.string('data', 'Data to process', true)],
      async (options) => {
        const retries = config.get('retries', 3);
        const timeout = config.get('timeout', 5000);

        // Store in storage
        await storage.set('last-input', options.data);

        // Process with timeout and retry
        const process = async () => {
          return withTimeout(async () => {
            if (options.data === 'fail') {
              throw new Error('Processing failed');
            }
            return `Processed: ${options.data.toUpperCase()}`;
          }, timeout);
        };

        for (let i = 0; i < retries; i++) {
          const result = await process();
          if (result.success) {
            await storage.set('last-result', result.data);
            return result.data;
          }
        }

        throw new Error('All retries failed');
      }
    );

    commands.register(processCommand);

    // Execute the integrated command
    const result = await commands.execute('process', { data: 'hello world' });

    expect(result.success).toBe(true);
    expect(result.data).toBe('Processed: HELLO WORLD');

    // Verify storage was used
    const lastInput = await storage.get('last-input');
    const lastResult = await storage.get('last-result');

    expect(lastInput).toBe('hello world');
    expect(lastResult).toBe('Processed: HELLO WORLD');
  });
});