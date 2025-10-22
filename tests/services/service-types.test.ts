import { describe, it, expect } from 'vitest';
import {
  MemoryService,
  ConfigService,
  McpService,
  TerminalService,
  MemoryError,
  ConfigError,
  McpError,
  type MemoryEntry,
  type AppConfig,
} from '../../src/services/service-types.js';

describe('Service Types', () => {
  describe('MemoryService', () => {
    it('should define correct interface', () => {
      expect(MemoryService.key).toBe('MemoryService');
    });

    it('should create MemoryError correctly', () => {
      const error = new MemoryError('Test error', new Error('cause'), 'set');
      expect(error._tag).toBe('MemoryError');
      expect(error.message).toBe('Test error');
      expect(error.operation).toBe('set');
      expect(error.cause).toBeInstanceOf(Error);
    });
  });

  describe('ConfigService', () => {
    it('should define correct interface', () => {
      expect(ConfigService.key).toBe('ConfigService');
    });

    it('should create ConfigError correctly', () => {
      const error = new ConfigError('Config error', new Error('cause'), '/path/to/config');
      expect(error._tag).toBe('ConfigError');
      expect(error.message).toBe('Config error');
      expect(error.path).toBe('/path/to/config');
      expect(error.cause).toBeInstanceOf(Error);
    });
  });

  describe('McpService', () => {
    it('should define correct interface', () => {
      expect(McpService.key).toBe('McpService');
    });

    it('should create McpError correctly', () => {
      const error = new McpError('MCP error', new Error('cause'), 'server-1');
      expect(error._tag).toBe('McpError');
      expect(error.message).toBe('MCP error');
      expect(error.serverId).toBe('server-1');
      expect(error.cause).toBeInstanceOf(Error);
    });
  });

  describe('TerminalService', () => {
    it('should define correct interface', () => {
      expect(TerminalService.key).toBe('TerminalService');
    });
  });

  describe('Type Definitions', () => {
    it('should create valid MemoryEntry', () => {
      const entry: MemoryEntry = {
        id: 'test-id',
        key: 'test-key',
        value: 'test-value',
        namespace: 'test-namespace',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(entry.id).toBe('test-id');
      expect(entry.key).toBe('test-key');
      expect(entry.value).toBe('test-value');
      expect(entry.namespace).toBe('test-namespace');
    });

    it('should create valid AppConfig structure', () => {
      const config: AppConfig = {
        version: '1.0.0',
        dataDir: './data',
        logLevel: 'info',
        targets: {
          opencode: {
            id: 'opencode',
            name: 'OpenCode',
            description: 'OpenCode target',
            enabled: true,
            settings: {},
          },
        },
        mcp: {
          enabled: true,
          servers: {},
        },
        memory: {
          defaultNamespace: 'default',
          maxEntries: 1000,
          retentionDays: 30,
        },
      };
      expect(config.version).toBe('1.0.0');
      expect(config.logLevel).toBe('info');
      expect(config.targets.opencode.enabled).toBe(true);
    });
  });
});
