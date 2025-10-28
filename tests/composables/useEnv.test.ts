/**
 * useEnv Tests
 * Tests for environment variable utilities
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { useEnv, useEnvVar } from '../../src/composables/useEnv.js';

describe('useEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset to original environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('useEnv', () => {
    it('should return process.env', () => {
      const env = useEnv();
      expect(env).toBe(process.env);
    });

    it('should return environment variables', () => {
      process.env.TEST_VAR = 'test-value';
      const env = useEnv();
      expect(env.TEST_VAR).toBe('test-value');
    });

    it('should return all environment variables', () => {
      process.env.VAR_A = 'value-a';
      process.env.VAR_B = 'value-b';
      const env = useEnv();
      expect(env.VAR_A).toBe('value-a');
      expect(env.VAR_B).toBe('value-b');
    });

    it('should be same reference as process.env', () => {
      const env = useEnv();
      expect(env).toStrictEqual(process.env);
    });

    it('should reflect changes to process.env', () => {
      const env = useEnv();
      process.env.NEW_VAR = 'new-value';
      expect(env.NEW_VAR).toBe('new-value');
    });
  });

  describe('useEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.TEST_KEY = 'test-value';
      const result = useEnvVar('TEST_KEY');
      expect(result).toBe('test-value');
    });

    it('should return undefined for missing variable', () => {
      const result = useEnvVar('NONEXISTENT_KEY');
      expect(result).toBeUndefined();
    });

    it('should return default value for missing variable', () => {
      const result = useEnvVar('MISSING_KEY', 'default-value');
      expect(result).toBe('default-value');
    });

    it('should prefer environment value over default', () => {
      process.env.EXISTING_KEY = 'env-value';
      const result = useEnvVar('EXISTING_KEY', 'default-value');
      expect(result).toBe('env-value');
    });

    it('should return default when env var is empty string', () => {
      process.env.EMPTY_KEY = '';
      const result = useEnvVar('EMPTY_KEY', 'default-value');
      expect(result).toBe('default-value');
    });

    it('should handle undefined default value', () => {
      const result = useEnvVar('MISSING_KEY', undefined);
      expect(result).toBeUndefined();
    });

    it('should handle numeric strings', () => {
      process.env.NUMBER_KEY = '12345';
      const result = useEnvVar('NUMBER_KEY');
      expect(result).toBe('12345');
    });

    it('should handle special characters', () => {
      process.env.SPECIAL_KEY = 'value!@#$%';
      const result = useEnvVar('SPECIAL_KEY');
      expect(result).toBe('value!@#$%');
    });

    it('should handle whitespace in values', () => {
      process.env.WHITESPACE_KEY = '  value with spaces  ';
      const result = useEnvVar('WHITESPACE_KEY');
      expect(result).toBe('  value with spaces  ');
    });

    it('should handle multiple calls for same key', () => {
      process.env.SAME_KEY = 'same-value';
      const result1 = useEnvVar('SAME_KEY');
      const result2 = useEnvVar('SAME_KEY');
      expect(result1).toBe('same-value');
      expect(result2).toBe('same-value');
    });

    it('should handle case-sensitive keys', () => {
      process.env.LOWERCASE_KEY = 'lower';
      process.env.UPPERCASE_KEY = 'upper';
      expect(useEnvVar('LOWERCASE_KEY')).toBe('lower');
      expect(useEnvVar('UPPERCASE_KEY')).toBe('upper');
      expect(useEnvVar('lowercase_key')).toBeUndefined();
    });
  });

  describe('Integration', () => {
    it('should work together for complete environment access', () => {
      process.env.APP_NAME = 'TestApp';
      process.env.APP_VERSION = '1.0.0';

      const allEnv = useEnv();
      const name = useEnvVar('APP_NAME');
      const version = useEnvVar('APP_VERSION');

      expect(allEnv.APP_NAME).toBe('TestApp');
      expect(name).toBe('TestApp');
      expect(version).toBe('1.0.0');
    });

    it('should handle missing values with defaults', () => {
      const nodeEnv = useEnvVar('NODE_ENV', 'development');
      const customVar = useEnvVar('CUSTOM_VAR', 'default');

      expect(nodeEnv).toBeDefined();
      expect(customVar).toBe('default');
    });
  });
});
