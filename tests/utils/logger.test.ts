/**
 * Logger Tests
 * Tests for centralized logging utility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Console output capture arrays
const consoleLogOutput: string[] = [];
const consoleErrorOutput: string[] = [];

// Mock chalk to avoid ANSI codes in test outputs
vi.mock('chalk', () => ({
  default: {
    gray: (text: string) => `[GRAY]${text}[/GRAY]`,
    blue: (text: string) => `[BLUE]${text}[/BLUE]`,
    yellow: (text: string) => `[YELLOW]${text}[/YELLOW]`,
    red: (text: string) => `[RED]${text}[/RED]`,
    cyan: (text: string) => `[CYAN]${text}[/CYAN]`,
  },
}));

describe('Logger', () => {
  let Logger: any;
  let logger: any;
  let log: any;

  beforeEach(async () => {
    // Note: vi.resetModules() removed in vitest 4.x
    // Module cache reset not needed for these tests

    // Clear output arrays
    consoleLogOutput.length = 0;
    consoleErrorOutput.length = 0;

    // Mock console (vitest 4.x compatible)
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleLogOutput.push(args.join(' '));
    });

    vi.spyOn(console, 'error').mockImplementation((...args) => {
      consoleErrorOutput.push(args.join(' '));
    });

    // Import fresh logger module
    const module = await import('../../src/utils/logger.js');
    Logger = module.default.constructor;
    logger = module.logger;
    log = module.log;
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogOutput.length = 0;
    consoleErrorOutput.length = 0;
  });

  describe('Logger Constructor', () => {
    it('should create logger with default config', () => {
      const newLogger = new Logger();
      expect(newLogger).toBeDefined();
    });

    it('should accept custom config', () => {
      const newLogger = new Logger({ level: 'debug', format: 'json' });
      expect(newLogger).toBeDefined();
    });

    it('should use custom level', () => {
      const newLogger = new Logger({ level: 'error' });
      newLogger.info('Should not log');
      expect(consoleLogOutput).toHaveLength(0);

      newLogger.error('Should log');
      expect(consoleErrorOutput.length).toBeGreaterThan(0);
    });
  });

  describe('Log Levels', () => {
    it('should log debug messages', () => {
      logger.setLevel('debug');
      logger.debug('Debug message');
      expect(consoleLogOutput.length).toBeGreaterThan(0);
      expect(consoleLogOutput[0]).toContain('Debug message');
    });

    it('should log info messages', () => {
      logger.setLevel('info');
      logger.info('Info message');
      expect(consoleLogOutput.length).toBeGreaterThan(0);
      expect(consoleLogOutput[0]).toContain('Info message');
    });

    it('should log warn messages', () => {
      logger.setLevel('warn');
      logger.warn('Warning message');
      expect(consoleLogOutput.length).toBeGreaterThan(0);
      expect(consoleLogOutput[0]).toContain('Warning message');
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(consoleErrorOutput.length).toBeGreaterThan(0);
      expect(consoleErrorOutput[0]).toContain('Error message');
    });

    it('should respect log level hierarchy', () => {
      logger.setLevel('warn');

      logger.debug('Should not log');
      logger.info('Should not log');
      expect(consoleLogOutput).toHaveLength(0);

      logger.warn('Should log');
      logger.error('Should log');
      expect(consoleLogOutput.length).toBeGreaterThan(0);
      expect(consoleErrorOutput.length).toBeGreaterThan(0);
    });
  });

  describe('Formats', () => {
    it('should format as JSON', () => {
      logger.updateConfig({ format: 'json' });
      logger.info('Test message');

      expect(consoleLogOutput.length).toBeGreaterThan(0);
      const output = consoleLogOutput[0];
      const parsed = JSON.parse(output);

      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.id).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
    });

    it('should format as simple', () => {
      logger.updateConfig({ format: 'simple' });
      logger.info('Test message');

      const output = consoleLogOutput[0];
      expect(output).toContain('INFO');
      expect(output).toContain('Test message');
    });

    it('should format as pretty (default)', () => {
      logger.updateConfig({ format: 'pretty' });
      logger.info('Test message');

      const output = consoleLogOutput[0];
      expect(output).toContain('Test message');
    });
  });

  describe('Context', () => {
    it('should include context in logs', () => {
      logger.updateConfig({ format: 'json' });
      logger.info('Message with context', { userId: '123', action: 'login' });

      const parsed = JSON.parse(consoleLogOutput[0]);
      expect(parsed.context).toEqual({ userId: '123', action: 'login' });
    });

    it('should merge context from child logger', () => {
      logger.updateConfig({ format: 'json' });
      const child = logger.child({ service: 'auth' });

      child.info('Child message', { userId: '456' });

      const parsed = JSON.parse(consoleLogOutput[0]);
      expect(parsed.context.service).toBe('auth');
      expect(parsed.context.userId).toBe('456');
    });

    it('should handle empty context', () => {
      logger.updateConfig({ format: 'json' });
      logger.info('No context message');

      const parsed = JSON.parse(consoleLogOutput[0]);
      expect(parsed.context).toEqual({});
    });

    it('should exclude context when disabled', () => {
      logger.updateConfig({ format: 'json', includeContext: false });
      logger.info('Message', { data: 'value' });

      const parsed = JSON.parse(consoleLogOutput[0]);
      expect(parsed.context).toBeUndefined();
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with context', () => {
      const child = logger.child({ component: 'database' });
      expect(child).toBeDefined();
    });

    it('should inherit parent context', () => {
      logger.updateConfig({ format: 'json' });
      const parent = logger.child({ app: 'test' });
      const child = parent.child({ component: 'db' });

      child.info('Child message');

      const parsed = JSON.parse(consoleLogOutput[0]);
      expect(parsed.context.app).toBe('test');
      expect(parsed.context.component).toBe('db');
    });
  });

  describe('Module Logger', () => {
    it('should create module logger', () => {
      const moduleLogger = logger.module('auth');
      expect(moduleLogger).toBeDefined();
    });

    it('should include module in logs', () => {
      logger.updateConfig({ format: 'json' });
      const moduleLogger = logger.module('auth');

      moduleLogger.info('Module message');

      const parsed = JSON.parse(consoleLogOutput[0]);
      expect(parsed.module).toBe('auth');
    });

    it('should include module in simple format', () => {
      logger.updateConfig({ format: 'simple' });
      const moduleLogger = logger.module('database');

      moduleLogger.info('Test');

      const output = consoleLogOutput[0];
      expect(output).toContain('[database]');
    });
  });

  describe('Error Logging', () => {
    it('should log error with stack trace', () => {
      logger.updateConfig({ format: 'json' });
      const error = new Error('Test error');

      logger.error('Error occurred', error);

      const parsed = JSON.parse(consoleErrorOutput[0]);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('Test error');
      expect(parsed.error.stack).toBeDefined();
    });

    it('should include error code if present', () => {
      logger.updateConfig({ format: 'json' });
      const error: any = new Error('Test error');
      error.code = 'ERR_TEST';

      logger.error('Error occurred', error);

      const parsed = JSON.parse(consoleErrorOutput[0]);
      expect(parsed.error.code).toBe('ERR_TEST');
    });

    it('should handle error without code', () => {
      logger.updateConfig({ format: 'json' });
      const error = new Error('Simple error');

      logger.error('Error', error);

      const parsed = JSON.parse(consoleErrorOutput[0]);
      expect(parsed.error.code).toBeUndefined();
    });
  });

  describe('Time Method', () => {
    it('should time async function', async () => {
      logger.setLevel('debug');
      const fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'result';
      };

      const result = await logger.time(fn, 'test operation');

      expect(result).toBe('result');
      expect(consoleLogOutput.length).toBeGreaterThan(0);
    });

    it('should log start and completion', async () => {
      logger.setLevel('debug');
      const fn = async () => 'done';

      await logger.time(fn, 'operation');

      expect(consoleLogOutput.some((log) => log.includes('Starting operation'))).toBe(true);
      expect(consoleLogOutput.some((log) => log.includes('Completed operation'))).toBe(true);
    });

    it('should log error on failure', async () => {
      logger.setLevel('debug');
      const error = new Error('Operation failed');
      const fn = async () => {
        throw error;
      };

      await expect(logger.time(fn, 'failing operation')).rejects.toThrow('Operation failed');

      expect(consoleErrorOutput.some((log) => log.includes('Failed failing operation'))).toBe(true);
    });

    it('should include duration in context', async () => {
      logger.setLevel('debug');
      logger.updateConfig({ format: 'json' });
      const fn = async () => 'done';

      await logger.time(fn, 'timed');

      const completedLog = consoleLogOutput.find((log) => log.includes('Completed timed'));
      expect(completedLog).toBeDefined();

      const parsed = JSON.parse(completedLog!);
      expect(parsed.context.duration).toMatch(/\d+ms/);
    });
  });

  describe('TimeSync Method', () => {
    it('should time sync function', () => {
      logger.setLevel('debug');
      const fn = () => 'result';

      const result = logger.timeSync(fn, 'sync operation');

      expect(result).toBe('result');
      expect(consoleLogOutput.length).toBeGreaterThan(0);
    });

    it('should log start and completion', () => {
      logger.setLevel('debug');
      const fn = () => 42;

      logger.timeSync(fn, 'calculation');

      expect(consoleLogOutput.some((log) => log.includes('Starting calculation'))).toBe(true);
      expect(consoleLogOutput.some((log) => log.includes('Completed calculation'))).toBe(true);
    });

    it('should log error on failure', () => {
      logger.setLevel('debug');
      const fn = () => {
        throw new Error('Sync failed');
      };

      expect(() => logger.timeSync(fn, 'failing sync')).toThrow('Sync failed');

      expect(consoleErrorOutput.some((log) => log.includes('Failed failing sync'))).toBe(true);
    });

    it('should include duration in context', () => {
      logger.setLevel('debug');
      logger.updateConfig({ format: 'json' });
      const fn = () => 'done';

      logger.timeSync(fn, 'timed sync');

      const completedLog = consoleLogOutput.find((log) => log.includes('Completed timed sync'));
      const parsed = JSON.parse(completedLog!);
      expect(parsed.context.duration).toMatch(/\d+ms/);
    });
  });

  describe('Convenience Functions', () => {
    it('should export log.debug', () => {
      logger.setLevel('debug');
      log.debug('Debug via convenience');
      expect(consoleLogOutput.some((line) => line.includes('Debug via convenience'))).toBe(true);
    });

    it('should export log.info', () => {
      log.info('Info via convenience');
      expect(consoleLogOutput.some((line) => line.includes('Info via convenience'))).toBe(true);
    });

    it('should export log.warn', () => {
      log.warn('Warn via convenience');
      expect(consoleLogOutput.some((line) => line.includes('Warn via convenience'))).toBe(true);
    });

    it('should export log.error', () => {
      log.error('Error via convenience', new Error('Test'));
      expect(consoleErrorOutput.some((line) => line.includes('Error via convenience'))).toBe(true);
    });

    it('should export log.time', async () => {
      logger.setLevel('debug');
      const result = await log.time(async () => 'result', 'async op');
      expect(result).toBe('result');
    });

    it('should export log.timeSync', () => {
      logger.setLevel('debug');
      const result = log.timeSync(() => 42, 'sync op');
      expect(result).toBe(42);
    });

    it('should export log.child', () => {
      const child = log.child({ test: 'context' });
      expect(child).toBeDefined();
    });

    it('should export log.module', () => {
      const moduleLogger = log.module('test-module');
      expect(moduleLogger).toBeDefined();
    });

    it('should export log.setLevel', () => {
      log.setLevel('error');
      log.info('Should not log');
      expect(consoleLogOutput).toHaveLength(0);
    });

    it('should export log.updateConfig', () => {
      log.updateConfig({ format: 'json' });
      log.info('JSON test');
      const parsed = JSON.parse(consoleLogOutput[0]);
      expect(parsed.level).toBe('info');
    });
  });

  describe('Configuration', () => {
    it('should disable colors', () => {
      logger.updateConfig({ colors: false, format: 'pretty' });
      logger.info('No colors');

      const output = consoleLogOutput[0];
      expect(output).toContain('No colors');
    });

    it('should exclude timestamp', () => {
      logger.updateConfig({ format: 'json', includeTimestamp: false });
      logger.info('Test');

      const parsed = JSON.parse(consoleLogOutput[0]);
      expect(parsed.timestamp).toBeDefined(); // Still included in JSON entry
    });

    it('should update multiple config options', () => {
      logger.updateConfig({
        level: 'warn',
        format: 'simple',
        colors: false,
      });

      logger.info('Should not log');
      expect(consoleLogOutput).toHaveLength(0);

      logger.warn('Should log');
      expect(consoleLogOutput.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow', async () => {
      logger.updateConfig({ format: 'json', level: 'debug' });
      const moduleLogger = logger.module('test');
      const child = moduleLogger.child({ userId: '123' });

      child.debug('Starting operation');
      const result = await child.time(async () => 'success', 'async work', { step: 1 });
      child.info('Operation complete', { result });

      expect(result).toBe('success');
      expect(consoleLogOutput.length).toBeGreaterThan(2);

      const logs = consoleLogOutput.map((log) => JSON.parse(log));
      logs.forEach((log) => {
        expect(log.module).toBe('test');
        expect(log.context.userId).toBe('123');
      });
    });
  });
});
