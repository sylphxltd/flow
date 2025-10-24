import { describe, expect, it } from 'vitest';
import { getPathsInfo } from '../src/utils/paths.js';

describe('Path Resolution Tests', () => {
  describe('getPathsInfo', () => {
    it('should return paths information without throwing errors', () => {
      const info = getPathsInfo();

      expect(info).toBeDefined();
      expect(info).toHaveProperty('assetsRoot');
      expect(info).toHaveProperty('agents');
      expect(info).toHaveProperty('templates');
      expect(info).toHaveProperty('rules');

      // Check that paths are strings
      expect(typeof info.assetsRoot).toBe('string');
      expect(typeof info.agents).toBe('string');
      expect(typeof info.templates).toBe('string');
      expect(typeof info.rules).toBe('string');

      // Check that paths are absolute
      expect(info.assetsRoot).toMatch(/^\/.*/);
      expect(info.agents).toMatch(/^\/.*/);
      expect(info.templates).toMatch(/^\/.*/);
      expect(info.rules).toMatch(/^\/.*/);
    });

    it('should have consistent path structure', () => {
      const info = getPathsInfo();

      // Assets root should be the base for other paths
      expect(info.agents).toContain(info.assetsRoot);
      expect(info.templates).toContain(info.assetsRoot);
      expect(info.rules).toContain(info.assetsRoot);
    });
  });
});
