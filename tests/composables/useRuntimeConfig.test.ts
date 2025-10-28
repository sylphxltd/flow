/**
 * useRuntimeConfig Tests
 * Tests for runtime configuration utilities
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { useRuntimeConfig, useIsCI, useIsDebug } from '../../src/composables/useRuntimeConfig.js';

describe('useRuntimeConfig', () => {
  const originalEnv = process.env;
  const originalCwd = process.cwd();
  const originalPlatform = process.platform;
  const originalVersion = process.version;

  beforeEach(() => {
    // Reset to original environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('useRuntimeConfig', () => {
    it('should return runtime configuration', () => {
      const config = useRuntimeConfig();
      expect(config).toBeDefined();
      expect(config).toHaveProperty('isDebug');
      expect(config).toHaveProperty('isCI');
      expect(config).toHaveProperty('cwd');
      expect(config).toHaveProperty('platform');
      expect(config).toHaveProperty('nodeVersion');
    });

    it('should return current working directory', () => {
      const config = useRuntimeConfig();
      expect(config.cwd).toBe(originalCwd);
    });

    it('should return platform', () => {
      const config = useRuntimeConfig();
      expect(config.platform).toBe(originalPlatform);
    });

    it('should return node version', () => {
      const config = useRuntimeConfig();
      expect(config.nodeVersion).toBe(originalVersion);
    });

    it('should detect debug mode in development', () => {
      process.env.NODE_ENV = 'development';
      const config = useRuntimeConfig();
      expect(config.isDebug).toBe(true);
    });

    it('should detect debug mode when DEBUG is true', () => {
      process.env.DEBUG = 'true';
      const config = useRuntimeConfig();
      expect(config.isDebug).toBe(true);
    });

    it('should not be in debug mode in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DEBUG;
      const config = useRuntimeConfig();
      expect(config.isDebug).toBe(false);
    });

    it('should detect CI mode when CI is true', () => {
      process.env.CI = 'true';
      const config = useRuntimeConfig();
      expect(config.isCI).toBe(true);
    });

    it('should not be in CI mode by default', () => {
      delete process.env.CI;
      const config = useRuntimeConfig();
      expect(config.isCI).toBe(false);
    });

    it('should return different config based on environment', () => {
      process.env.NODE_ENV = 'development';
      const devConfig = useRuntimeConfig();
      expect(devConfig.isDebug).toBe(true);

      process.env.NODE_ENV = 'production';
      delete process.env.DEBUG;
      const prodConfig = useRuntimeConfig();
      expect(prodConfig.isDebug).toBe(false);
    });

    it('should always include platform info', () => {
      const config = useRuntimeConfig();
      expect(typeof config.platform).toBe('string');
      expect(['darwin', 'linux', 'win32', 'freebsd', 'openbsd', 'sunos', 'aix']).toContain(
        config.platform
      );
    });

    it('should always include node version', () => {
      const config = useRuntimeConfig();
      expect(typeof config.nodeVersion).toBe('string');
      expect(config.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('useIsCI', () => {
    it('should return true when CI is "true"', () => {
      process.env.CI = 'true';
      expect(useIsCI()).toBe(true);
    });

    it('should return true when CI is any truthy value', () => {
      process.env.CI = '1';
      expect(useIsCI()).toBe(true);
    });

    it('should return true when CONTINUOUS_INTEGRATION is set', () => {
      delete process.env.CI;
      process.env.CONTINUOUS_INTEGRATION = 'true';
      expect(useIsCI()).toBe(true);
    });

    it('should return false when no CI variables are set', () => {
      delete process.env.CI;
      delete process.env.CONTINUOUS_INTEGRATION;
      expect(useIsCI()).toBe(false);
    });

    it('should return false when CI is empty string', () => {
      process.env.CI = '';
      delete process.env.CONTINUOUS_INTEGRATION;
      expect(useIsCI()).toBe(false);
    });

    it('should prefer CI over CONTINUOUS_INTEGRATION', () => {
      process.env.CI = 'true';
      process.env.CONTINUOUS_INTEGRATION = '';
      expect(useIsCI()).toBe(true);
    });

    it('should handle various CI variable formats', () => {
      // GitHub Actions
      process.env.CI = 'true';
      expect(useIsCI()).toBe(true);

      // GitLab CI
      delete process.env.CI;
      process.env.CONTINUOUS_INTEGRATION = 'true';
      expect(useIsCI()).toBe(true);
    });
  });

  describe('useIsDebug', () => {
    it('should return true when DEBUG is "true"', () => {
      process.env.DEBUG = 'true';
      expect(useIsDebug()).toBe(true);
    });

    it('should return true when NODE_ENV is development', () => {
      delete process.env.DEBUG;
      process.env.NODE_ENV = 'development';
      expect(useIsDebug()).toBe(true);
    });

    it('should return true when both DEBUG and NODE_ENV are set', () => {
      process.env.DEBUG = 'true';
      process.env.NODE_ENV = 'development';
      expect(useIsDebug()).toBe(true);
    });

    it('should return false in production without DEBUG', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DEBUG;
      expect(useIsDebug()).toBe(false);
    });

    it('should return false when DEBUG is not "true"', () => {
      process.env.DEBUG = 'false';
      process.env.NODE_ENV = 'production';
      expect(useIsDebug()).toBe(false);
    });

    it('should return false when neither variable is set correctly', () => {
      delete process.env.DEBUG;
      delete process.env.NODE_ENV;
      expect(useIsDebug()).toBe(false);
    });

    it('should handle test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.DEBUG;
      expect(useIsDebug()).toBe(false);
    });

    it('should prioritize DEBUG over NODE_ENV', () => {
      process.env.DEBUG = 'true';
      process.env.NODE_ENV = 'production';
      expect(useIsDebug()).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should provide consistent CI detection', () => {
      process.env.CI = 'true';
      const config = useRuntimeConfig();
      const isCI = useIsCI();

      expect(config.isCI).toBe(isCI);
    });

    it('should provide consistent debug detection', () => {
      process.env.NODE_ENV = 'development';
      const config = useRuntimeConfig();
      const isDebug = useIsDebug();

      expect(config.isDebug).toBe(isDebug);
    });

    it('should handle production environment correctly', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CI;
      delete process.env.DEBUG;
      delete process.env.CONTINUOUS_INTEGRATION;

      const config = useRuntimeConfig();
      const isCI = useIsCI();
      const isDebug = useIsDebug();

      expect(config.isCI).toBe(false);
      expect(config.isDebug).toBe(false);
      expect(isCI).toBe(false);
      expect(isDebug).toBe(false);
    });

    it('should handle CI + debug environment', () => {
      process.env.CI = 'true';
      process.env.NODE_ENV = 'development';

      const config = useRuntimeConfig();

      expect(config.isCI).toBe(true);
      expect(config.isDebug).toBe(true);
    });

    it('should provide complete runtime context', () => {
      const config = useRuntimeConfig();

      // All fields should be defined
      expect(config.cwd).toBeDefined();
      expect(config.platform).toBeDefined();
      expect(config.nodeVersion).toBeDefined();
      expect(typeof config.isDebug).toBe('boolean');
      expect(typeof config.isCI).toBe('boolean');
    });
  });
});
