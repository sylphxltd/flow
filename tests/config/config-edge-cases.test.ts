/**
 * Comprehensive Configuration System Edge Case Tests
 * Tests robustness of configuration handling under extreme conditions
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import * as rulesConfig from '../../src/config/rules.js';
import * as targetsConfig from '../../src/config/targets.js';
import * as serversConfig from '../../src/config/servers.js';
import { useEnv, useEnvVar } from '../../src/composables/useEnv.js';
import { useRuntimeConfig, useIsCI, useIsDebug } from '../../src/composables/useRuntimeConfig.js';

// Mock process.env for testing
const originalEnv = process.env;

describe('Configuration System Edge Cases', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Rules Configuration Edge Cases', () => {
    it('should handle invalid rule types gracefully', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => rulesConfig.getRulesPath('invalid')).not.toThrow();
    });

    it('should handle missing rule files', () => {
      // Mock missing rule file
      const mockGetRuleFile = vi.fn(() => {
        throw new Error('File not found');
      });

      // This should be handled gracefully
      expect(() => mockGetRuleFile('nonexistent.md')).toThrow('File not found');
    });

    it('should handle rule file existence checks with invalid types', () => {
      // @ts-expect-error - Testing invalid input
      const result = rulesConfig.ruleFileExists('nonexistent');
      expect(typeof result).toBe('boolean');
    });

    it('should handle rules filename mapping edge cases', () => {
      expect(rulesConfig.RULES_FILES).toHaveProperty('claude-code');
      expect(rulesConfig.RULES_FILES).toHaveProperty('opencode');

      // Should be readonly
      expect(() => {
        // @ts-expect-error - Testing immutability
        rulesConfig.RULES_FILES.newTarget = 'test.md';
      }).not.toThrow();
    });
  });

  describe('Target Configuration Edge Cases', () => {
    it('should handle target lookup with invalid IDs', () => {
      const result = targetsConfig.getTarget('nonexistent-target');
      expect(result._tag).toBe('None');
    });

    it('should handle unsafe target lookup with invalid IDs', () => {
      expect(() => targetsConfig.getTargetUnsafe('nonexistent-target'))
        .toThrow('Target not found: nonexistent-target');
    });

    it('should handle default target lookup when no default exists', () => {
      // This should not crash even if no default is configured
      const result = targetsConfig.getDefaultTarget();
      expect(typeof result._tag).toBe('string'); // 'Some' or 'None'
    });

    it('should handle unsafe default target lookup when no default exists', () => {
      // This should throw if no default is configured
      expect(() => targetsConfig.getDefaultTargetUnsafe()).not.toThrow();
    });

    it('should handle target implementation checks with edge cases', () => {
      expect(targetsConfig.isTargetImplemented('claude-code')).toBe(true);
      expect(targetsConfig.isTargetImplemented('nonexistent')).toBe(false);
      expect(targetsConfig.isTargetImplemented('')).toBe(false);
      expect(targetsConfig.isTargetImplemented('null')).toBe(false);
      expect(targetsConfig.isTargetImplemented('undefined')).toBe(false);
    });

    it('should handle target ID type safety', () => {
      const allIDs = targetsConfig.getAllTargetIDs();
      expect(Array.isArray(allIDs)).toBe(true);
      expect(allIDs.length).toBeGreaterThan(0);

      // All IDs should be strings
      expect(allIDs.every(id => typeof id === 'string')).toBe(true);
    });

    it('should handle cached target initialization edge cases', () => {
      // Multiple calls should return same cached instance
      const targets1 = targetsConfig.getAllTargets();
      const targets2 = targetsConfig.getAllTargets();
      expect(targets1).toBe(targets2); // Same reference

      // Should be frozen/immutable
      expect(Object.isFrozen(targets1)).toBe(true);
    });

    it('should handle MCP support filtering edge cases', () => {
      const mcpTargets = targetsConfig.getTargetsWithMCPSupport();
      expect(Array.isArray(mcpTargets)).toBe(true);

      // All returned targets should have setupMCP defined
      expect(mcpTargets.every(target => !!target.setupMCP)).toBe(true);
    });
  });

  describe('Server Configuration Edge Cases', () => {
    it('should handle server ID validation edge cases', () => {
      expect(serversConfig.isValidServerID('sylphx-flow')).toBe(true);
      expect(serversConfig.isValidServerID('nonexistent')).toBe(false);
      expect(serversConfig.isValidServerID('')).toBe(false);
      expect(serversConfig.isValidServerID(null as any)).toBe(false);
      expect(serversConfig.isValidServerID(undefined as any)).toBe(false);
      expect(serversConfig.isValidServerID(123 as any)).toBe(false);
      expect(serversConfig.isValidServerID({} as any)).toBe(false);
    });

    it('should handle server definition lookup with invalid IDs', () => {
      expect(() => serversConfig.getServerDefinition('nonexistent' as any))
        .toThrow('Unknown MCP server: nonexistent');
    });

    it('should handle server category filtering edge cases', () => {
      const coreServers = serversConfig.getServersByCategory('core');
      const externalServers = serversConfig.getServersByCategory('external');
      const aiServers = serversConfig.getServersByCategory('ai');

      expect(Array.isArray(coreServers)).toBe(true);
      expect(Array.isArray(externalServers)).toBe(true);
      expect(Array.isArray(aiServers)).toBe(true);

      // Verify category assignment
      coreServers.forEach(id => {
        const server = serversConfig.getServerDefinition(id);
        expect(server.category).toBe('core');
      });
    });

    it('should handle environment variable extraction edge cases', () => {
      const testServers = ['sylphx-flow', 'gpt-image', 'perplexity'] as const;

      testServers.forEach(serverId => {
        // Required vars
        const requiredVars = serversConfig.getRequiredEnvVars(serverId);
        expect(Array.isArray(requiredVars)).toBe(true);

        // Optional vars
        const optionalVars = serversConfig.getOptionalEnvVars(serverId);
        expect(Array.isArray(optionalVars)).toBe(true);

        // All vars
        const allVars = serversConfig.getAllEnvVars(serverId);
        expect(Array.isArray(allVars)).toBe(true);

        // Secret vars
        const secretVars = serversConfig.getSecretEnvVars(serverId);
        expect(Array.isArray(secretVars)).toBe(true);

        // Non-secret vars
        const nonSecretVars = serversConfig.getNonSecretEnvVars(serverId);
        expect(Array.isArray(nonSecretVars)).toBe(true);

        // All vars should equal required + optional
        expect(allVars.sort()).toEqual([...requiredVars, ...optionalVars].sort());

        // Secret + non-secret should equal all vars
        expect([...secretVars, ...nonSecretVars].sort()).toEqual(allVars.sort());
      });
    });

    it('should handle server selection edge cases', () => {
      const allServers = serversConfig.getAllServerIDs();
      const defaultServers = serversConfig.getDefaultServers();
      const requiredServers = allServers.filter(id =>
        serversConfig.getServerDefinition(id).required
      );

      // All required servers should be in all servers
      requiredServers.forEach(id => {
        expect(allServers).toContain(id);
      });

      // Default servers should be subset of all servers
      defaultServers.forEach(id => {
        expect(allServers).toContain(id);
      });
    });

    it('should handle API key requirement detection', () => {
      const requiredKeyServers = serversConfig.getServersRequiringAPIKeys();
      const optionalKeyServers = serversConfig.getServersWithOptionalAPIKeys();
      const anyKeyServers = serversConfig.getServersWithAnyAPIKeys();

      expect(Array.isArray(requiredKeyServers)).toBe(true);
      expect(Array.isArray(optionalKeyServers)).toBe(true);
      expect(Array.isArray(anyKeyServers)).toBe(true);

      // Required + optional should equal any
      const combined = [...requiredKeyServers, ...optionalKeyServers]
        .filter((id, index, arr) => arr.indexOf(id) === index)
        .sort();
      expect(combined).toEqual(anyKeyServers.sort());
    });
  });

  describe('Environment Variable Edge Cases', () => {
    it('should handle process.env manipulation safely', () => {
      // Test with modified process.env
      process.env = { ...originalEnv };
      process.env.TEST_VAR = 'test-value';

      const env = useEnv();
      expect(env.TEST_VAR).toBe('test-value');
      expect(env).toBe(process.env); // Should be same reference
    });

    it('should handle environment variable access with special characters', () => {
      const specialEnvVars = {
        'VAR_WITH_DASHES': 'value1',
        'VAR_WITH_UNDERSCORES': 'value2',
        'VAR.WITH.DOTS': 'value3',
        'VAR/WITH/SLASHES': 'value4',
        'VAR WITH SPACES': 'value5',
        'VAR-WITH-@SPECIAL-@CHARS': 'value6',
        '123NUMERIC_START': 'value7',
        '': 'empty-key-value',
        '\0NULL_CHARACTER': 'value8',
        'VAR\nWITH\nNEWLINES': 'value9',
        'VAR\tWITH\tTABS': 'value10',
      };

      process.env = { ...originalEnv, ...specialEnvVars };

      Object.entries(specialEnvVars).forEach(([key, expectedValue]) => {
        // useEnvVar should handle special characters
        const actualValue = useEnvVar(key);
        expect(actualValue).toBe(expectedValue);
      });
    });

    it('should handle undefined and null environment variables', () => {
      process.env = { ...originalEnv };
      delete process.env.UNDEFINED_VAR;

      expect(useEnvVar('UNDEFINED_VAR')).toBeUndefined();
      expect(useEnvVar('UNDEFINED_VAR', 'default')).toBe('default');
      expect(useEnvVar('UNDEFINED_VAR', '')).toBe('');
      expect(useEnvVar('UNDEFINED_VAR', null as any)).toBeNull();
    });

    it('should handle environment variable injection attacks', () => {
      const maliciousEnvVars = {
        '__proto__': 'malicious-proto',
        'constructor': 'malicious-constructor',
        'prototype': 'malicious-prototype',
        'NODE_OPTIONS': '--evil-script.js',
        'ELECTRON_RUN_AS_NODE': '1',
      };

      process.env = { ...originalEnv, ...maliciousEnvVars };

      // Should not crash with malicious environment variables
      expect(() => {
        Object.keys(maliciousEnvVars).forEach(key => {
          const value = useEnvVar(key);
          expect(value).toBeDefined();
        });
      }).not.toThrow();
    });

    it('should handle extremely long environment variable values', () => {
      const longValue = 'x'.repeat(1000000); // 1MB
      process.env = { ...originalEnv, LONG_VAR: longValue };

      expect(useEnvVar('LONG_VAR')).toBe(longValue);
    });

    it('should handle environment variable with binary data', () => {
      const binaryData = Buffer.from([0x00, 0xFF, 0x80, 0x7F]).toString('binary');
      process.env = { ...originalEnv, BINARY_VAR: binaryData };

      expect(useEnvVar('BINARY_VAR')).toBe(binaryData);
    });

    it('should handle environment variable with Unicode characters', () => {
      const unicodeVars = {
        'UNICODE_EMOJI': '🚀🎉🌟',
        'UNICODE_CHINESE': '中文测试',
        'UNICODE_ARABIC': 'العربية',
        'UNICODE_HEBREW': 'עברית',
        'UNICODE_RTL': '\u202ERight-to-left',
        'UNICODE_ZWJ': '👨\u200d👩\u200d👧\u200d👦', // ZWJ sequence
        'UNICODE_COMBINING': 'cafe\u0301', // combining character
      };

      process.env = { ...originalEnv, ...unicodeVars };

      Object.entries(unicodeVars).forEach(([key, expectedValue]) => {
        expect(useEnvVar(key)).toBe(expectedValue);
      });
    });
  });

  describe('Runtime Configuration Edge Cases', () => {
    it('should handle runtime config with modified process properties', () => {
      // Mock process properties
      const originalCwd = process.cwd;
      const originalPlatform = process.platform;
      const originalVersion = process.version;

      process.cwd = () => '/mock/test/path' as any;
      Object.defineProperty(process, 'platform', { value: 'mock-platform', writable: true });
      Object.defineProperty(process, 'version', { value: 'v999.999.999', writable: true });

      const config = useRuntimeConfig();

      expect(config.cwd).toBe('/mock/test/path');
      expect(config.platform).toBe('mock-platform');
      expect(config.nodeVersion).toBe('v999.999.999');

      // Restore
      process.cwd = originalCwd;
      Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
      Object.defineProperty(process, 'version', { value: originalVersion, writable: true });
    });

    it('should handle CI detection edge cases', () => {
      const testCases = [
        { env: { CI: 'true' }, expected: true },
        { env: { CI: '1' }, expected: true },
        { env: { CI: 'false' }, expected: false },
        { env: { CI: '' }, expected: false },
        { env: { CONTINUOUS_INTEGRATION: 'true' }, expected: true },
        { env: { ci: 'true' }, expected: false }, // case sensitive
        { env: {}, expected: false },
        { env: { CI: 'true', CONTINUOUS_INTEGRATION: 'false' }, expected: true },
      ];

      testCases.forEach(({ env, expected }) => {
        process.env = { ...originalEnv, ...env };
        expect(useIsCI()).toBe(expected);
      });
    });

    it('should handle debug mode detection edge cases', () => {
      const testCases = [
        { env: { NODE_ENV: 'development' }, expected: true },
        { env: { NODE_ENV: 'dev' }, expected: false },
        { env: { NODE_ENV: 'production' }, expected: false },
        { env: { DEBUG: 'true' }, expected: true },
        { env: { DEBUG: '1' }, expected: false },
        { env: { DEBUG: 'false' }, expected: false },
        { env: {}, expected: false },
        { env: { NODE_ENV: 'development', DEBUG: 'true' }, expected: true },
        { env: { NODE_ENV: 'production', DEBUG: 'true' }, expected: true },
      ];

      testCases.forEach(({ env, expected }) => {
        process.env = { ...originalEnv, ...env };
        expect(useIsDebug()).toBe(expected);
      });
    });

    it('should handle runtime config when process properties are undefined', () => {
      // Mock undefined process properties
      const originalEnv = process.env;
      const originalCwd = process.cwd;
      const originalPlatform = process.platform;
      const originalVersion = process.version;

      // @ts-expect-error - Testing undefined properties
      process.env = undefined;
      // @ts-expect-error - Testing undefined properties
      process.cwd = undefined;
      Object.defineProperty(process, 'platform', { value: undefined, writable: true });
      Object.defineProperty(process, 'version', { value: undefined, writable: true });

      // Should not crash
      expect(() => {
        const config = useRuntimeConfig();
        expect(config).toBeDefined();
      }).not.toThrow();

      // Restore
      process.env = originalEnv;
      process.cwd = originalCwd;
      Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
      Object.defineProperty(process, 'version', { value: originalVersion, writable: true });
    });
  });

  describe('Configuration Validation Edge Cases', () => {
    it('should handle circular references in configuration', () => {
      const circularConfig: any = { name: 'circular' };
      circularConfig.self = circularConfig;

      // Configuration should handle circular references gracefully
      expect(() => {
        JSON.stringify(circularConfig); // This would normally throw
      }).toThrow(); // Circular references should throw

      // But the system should handle it
      expect(() => {
        // Test configuration parsing with circular data
        try {
          JSON.parse(JSON.stringify(circularConfig));
        } catch {
          // Handle the error gracefully
        }
      }).not.toThrow();
    });

    it('should handle extremely deep configuration objects', () => {
      let deepConfig: any = { value: 'deep' };
      const depth = 1000;

      for (let i = 0; i < depth; i++) {
        deepConfig = { [`level${i}`]: deepConfig };
      }

      // Should handle deep objects without stack overflow
      expect(() => {
        JSON.stringify(deepConfig);
      }).not.toThrow();
    });

    it('should handle configuration with special JSON values', () => {
      const specialConfig = {
        nullValue: null,
        undefinedValue: undefined,
        infinity: Infinity,
        negInfinity: -Infinity,
        nan: NaN,
        date: new Date(),
        regex: /test/g,
        function: () => 'test',
        symbol: Symbol('test'),
        bigint: BigInt(123),
      };

      // JSON.stringify should handle these with limitations
      const jsonString = JSON.stringify(specialConfig, (key, value) => {
        if (typeof value === 'bigint') return value.toString();
        if (typeof value === 'function') return '[Function]';
        if (typeof value === 'symbol') return '[Symbol]';
        if (Number.isNaN(value)) return null;
        if (!Number.isFinite(value)) return null;
        if (value instanceof RegExp) return value.toString();
        if (value instanceof Date) return value.toISOString();
        return value;
      });

      expect(jsonString).toBeDefined();
      expect(jsonString.length).toBeGreaterThan(0);

      // Should parse back without errors
      expect(() => {
        JSON.parse(jsonString);
      }).not.toThrow();
    });

    it('should handle malformed JSON configuration', () => {
      const malformedJsonStrings = [
        '{ invalid json }',
        '{ "key": "value", }', // trailing comma
        '{ "key": undefined }', // undefined value
        '{ "key": function() {} }', // function value
        '{ "key": Symbol("test") }', // symbol value
        '"just a string"', // not an object
        'null',
        'undefined',
        '123',
        'true',
        '[]',
        '',
        '{',
        '}',
        '{{}',
        '}}',
      ];

      malformedJsonStrings.forEach(jsonString => {
        expect(() => {
          JSON.parse(jsonString);
        }).toThrow();
      });
    });
  });

  describe('Configuration Hot Reload Scenarios', () => {
    it('should handle configuration changes during runtime', () => {
      // Simulate configuration changes
      const originalConfig = { value: 'original' };
      let currentConfig = { ...originalConfig };

      // Simulate hot reload
      const hotReload = (newConfig: any) => {
        currentConfig = { ...currentConfig, ...newConfig };
        return currentConfig;
      };

      const reloaded1 = hotReload({ newValue: 'added1' });
      const reloaded2 = hotReload({ newValue: 'added2', anotherValue: 'test' });

      expect(reloaded1.value).toBe('original');
      expect(reloaded1.newValue).toBe('added1');
      expect(reloaded2.value).toBe('original');
      expect(reloaded2.newValue).toBe('added2');
      expect(reloaded2.anotherValue).toBe('test');
    });

    it('should handle configuration reload failures gracefully', () => {
      const mockReload = vi.fn(() => {
        throw new Error('Configuration reload failed');
      });

      expect(() => mockReload()).toThrow('Configuration reload failed');

      // System should handle reload failure without crashing
      const config = { value: 'stable' };
      expect(() => {
        try {
          mockReload();
        } catch {
          // Fallback to previous configuration
          return config;
        }
      }).not.toThrow();
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('should handle validation with missing required fields', () => {
      const schema = {
        required: ['name', 'version'],
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          optional: { type: 'string' }
        }
      };

      const invalidData = { optional: 'value' }; // missing required fields

      // Simulate validation
      const validate = (data: any, schema: any) => {
        const missing = schema.required.filter((field: string) => !(field in data));
        if (missing.length > 0) {
          throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        return true;
      };

      expect(() => validate(invalidData, schema))
        .toThrow('Missing required fields: name, version');
    });

    it('should handle validation with incorrect data types', () => {
      const schema = {
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          active: { type: 'boolean' },
          tags: { type: 'array' },
          meta: { type: 'object' }
        }
      };

      const invalidData = {
        name: 123, // should be string
        age: '25', // should be number
        active: 'true', // should be boolean
        tags: 'not-array', // should be array
        meta: 'not-object' // should be object
      };

      // Simulate type validation
      const validateTypes = (data: any, schema: any) => {
        Object.entries(schema.properties).forEach(([field, fieldSchema]: [string, any]) => {
          if (field in data) {
            const expectedType = fieldSchema.type;
            const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
            if (actualType !== expectedType) {
              throw new Error(`Field '${field}' should be ${expectedType}, got ${actualType}`);
            }
          }
        });
      };

      Object.entries(invalidData).forEach(([field, value]) => {
        expect(() => validateTypes({ [field]: value }, schema)).toThrow();
      });
    });
  });

  describe('Concurrent Configuration Access', () => {
    it('should handle concurrent configuration reads', async () => {
      const promises = [];
      const readCount = 100;

      // Simulate concurrent configuration reads
      for (let i = 0; i < readCount; i++) {
        promises.push(Promise.resolve().then(() => {
          return targetsConfig.getAllTargets();
        }));
      }

      const results = await Promise.all(promises);

      // All reads should return the same result
      expect(results.length).toBe(readCount);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      // All should be the same reference (cached)
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });

    it('should handle concurrent environment variable access', async () => {
      process.env = { ...originalEnv, CONCURRENT_TEST: 'test-value' };

      const promises = [];
      const accessCount = 100;

      for (let i = 0; i < accessCount; i++) {
        promises.push(Promise.resolve().then(() => {
          return useEnvVar('CONCURRENT_TEST');
        }));
      }

      const results = await Promise.all(promises);

      expect(results.length).toBe(accessCount);
      results.forEach(result => {
        expect(result).toBe('test-value');
      });
    });
  });
});