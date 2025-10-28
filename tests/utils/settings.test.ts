/**
 * Settings Tests
 * Tests for project settings management
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ProjectSettings } from '../../src/utils/settings.js';

describe('Settings', () => {
  let testDir: string;
  let settings: ProjectSettings;

  beforeEach(() => {
    // Create temporary test directory
    testDir = mkdtempSync(join(tmpdir(), 'settings-test-'));
    settings = new ProjectSettings(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    it('should create settings instance with default path', () => {
      const defaultSettings = new ProjectSettings();
      expect(defaultSettings).toBeInstanceOf(ProjectSettings);
    });

    it('should create settings instance with custom path', () => {
      const customSettings = new ProjectSettings(testDir);
      expect(customSettings).toBeInstanceOf(ProjectSettings);
    });
  });

  describe('load', () => {
    it('should return empty object when file does not exist', async () => {
      const loaded = await settings.load();
      expect(loaded).toEqual({});
    });

    it('should load settings from file', async () => {
      const settingsData = { defaultTarget: 'claude-code', version: '1.0.0' };

      // Create settings file
      mkdirSync(join(testDir, '.sylphx-flow'), { recursive: true });
      writeFileSync(
        join(testDir, '.sylphx-flow/settings.json'),
        JSON.stringify(settingsData),
        'utf8'
      );

      const loaded = await settings.load();
      expect(loaded).toEqual(settingsData);
    });

    it('should parse JSON correctly', async () => {
      const settingsData = {
        defaultTarget: 'opencode',
        version: '1.0.0',
      };

      mkdirSync(join(testDir, '.sylphx-flow'), { recursive: true });
      writeFileSync(
        join(testDir, '.sylphx-flow/settings.json'),
        JSON.stringify(settingsData, null, 2),
        'utf8'
      );

      const loaded = await settings.load();
      expect(loaded.defaultTarget).toBe('opencode');
      expect(loaded.version).toBe('1.0.0');
    });

    it('should throw error on invalid JSON', async () => {
      mkdirSync(join(testDir, '.sylphx-flow'), { recursive: true });
      writeFileSync(join(testDir, '.sylphx-flow/settings.json'), 'invalid json', 'utf8');

      await expect(settings.load()).rejects.toThrow('Failed to load settings');
    });

    it('should handle empty settings file', async () => {
      const settingsData = {};

      mkdirSync(join(testDir, '.sylphx-flow'), { recursive: true });
      writeFileSync(
        join(testDir, '.sylphx-flow/settings.json'),
        JSON.stringify(settingsData),
        'utf8'
      );

      const loaded = await settings.load();
      expect(loaded).toEqual({});
    });
  });

  describe('save', () => {
    it('should create directory if not exists', async () => {
      await settings.save({ defaultTarget: 'claude-code' });

      const fileContent = readFileSync(join(testDir, '.sylphx-flow/settings.json'), 'utf8');
      expect(fileContent).toBeTruthy();
    });

    it('should save settings to file', async () => {
      const settingsData = { defaultTarget: 'claude-code' };
      await settings.save(settingsData);

      const fileContent = readFileSync(join(testDir, '.sylphx-flow/settings.json'), 'utf8');
      const parsed = JSON.parse(fileContent);

      expect(parsed.defaultTarget).toBe('claude-code');
    });

    it('should add version if not present', async () => {
      await settings.save({ defaultTarget: 'opencode' });

      const fileContent = readFileSync(join(testDir, '.sylphx-flow/settings.json'), 'utf8');
      const parsed = JSON.parse(fileContent);

      expect(parsed.version).toBe('1.0.0');
    });

    it('should preserve existing version', async () => {
      await settings.save({ defaultTarget: 'claude-code', version: '0.9.0' });

      const fileContent = readFileSync(join(testDir, '.sylphx-flow/settings.json'), 'utf8');
      const parsed = JSON.parse(fileContent);

      expect(parsed.version).toBe('0.9.0');
    });

    it('should format JSON with 2 spaces', async () => {
      await settings.save({ defaultTarget: 'claude-code' });

      const fileContent = readFileSync(join(testDir, '.sylphx-flow/settings.json'), 'utf8');
      expect(fileContent).toContain('  "defaultTarget"');
    });

    it('should end file with newline', async () => {
      await settings.save({ defaultTarget: 'claude-code' });

      const fileContent = readFileSync(join(testDir, '.sylphx-flow/settings.json'), 'utf8');
      expect(fileContent.endsWith('\n')).toBe(true);
    });

    it('should overwrite existing file', async () => {
      await settings.save({ defaultTarget: 'claude-code' });
      await settings.save({ defaultTarget: 'opencode' });

      const loaded = await settings.load();
      expect(loaded.defaultTarget).toBe('opencode');
    });
  });

  describe('update', () => {
    it('should update empty settings', async () => {
      await settings.update({ defaultTarget: 'claude-code' });

      const loaded = await settings.load();
      expect(loaded.defaultTarget).toBe('claude-code');
    });

    it('should merge with existing settings', async () => {
      await settings.save({ defaultTarget: 'claude-code', version: '1.0.0' });
      await settings.update({ defaultTarget: 'opencode' });

      const loaded = await settings.load();
      expect(loaded.defaultTarget).toBe('opencode');
      expect(loaded.version).toBe('1.0.0');
    });

    it('should add new properties', async () => {
      await settings.save({ defaultTarget: 'claude-code' });
      await settings.update({ version: '2.0.0' } as any);

      const loaded = await settings.load();
      expect(loaded.defaultTarget).toBe('claude-code');
      expect(loaded.version).toBe('2.0.0');
    });

    it('should handle partial updates', async () => {
      await settings.save({ defaultTarget: 'claude-code', version: '1.0.0' });
      await settings.update({});

      const loaded = await settings.load();
      expect(loaded.defaultTarget).toBe('claude-code');
      expect(loaded.version).toBe('1.0.0');
    });
  });

  describe('getDefaultTarget', () => {
    it('should return undefined when no target set', async () => {
      const target = await settings.getDefaultTarget();
      expect(target).toBeUndefined();
    });

    it('should return default target', async () => {
      await settings.save({ defaultTarget: 'claude-code' });

      const target = await settings.getDefaultTarget();
      expect(target).toBe('claude-code');
    });

    it('should return updated target', async () => {
      await settings.save({ defaultTarget: 'claude-code' });
      await settings.update({ defaultTarget: 'opencode' });

      const target = await settings.getDefaultTarget();
      expect(target).toBe('opencode');
    });
  });

  describe('setDefaultTarget', () => {
    it('should set default target', async () => {
      await settings.setDefaultTarget('claude-code');

      const loaded = await settings.load();
      expect(loaded.defaultTarget).toBe('claude-code');
    });

    it('should update existing target', async () => {
      await settings.setDefaultTarget('claude-code');
      await settings.setDefaultTarget('opencode');

      const target = await settings.getDefaultTarget();
      expect(target).toBe('opencode');
    });

    it('should preserve other settings', async () => {
      await settings.save({ version: '1.0.0' } as any);
      await settings.setDefaultTarget('claude-code');

      const loaded = await settings.load();
      expect(loaded.defaultTarget).toBe('claude-code');
      expect(loaded.version).toBe('1.0.0');
    });
  });

  describe('exists', () => {
    it('should return false when file does not exist', async () => {
      const exists = await settings.exists();
      expect(exists).toBe(false);
    });

    it('should return true when file exists', async () => {
      await settings.save({ defaultTarget: 'claude-code' });

      const exists = await settings.exists();
      expect(exists).toBe(true);
    });

    it('should return true after creating file', async () => {
      expect(await settings.exists()).toBe(false);

      await settings.setDefaultTarget('claude-code');

      expect(await settings.exists()).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should support full workflow', async () => {
      // Check file doesn't exist
      expect(await settings.exists()).toBe(false);

      // Set default target
      await settings.setDefaultTarget('claude-code');

      // Check file exists
      expect(await settings.exists()).toBe(true);

      // Get target
      const target = await settings.getDefaultTarget();
      expect(target).toBe('claude-code');

      // Update target
      await settings.setDefaultTarget('opencode');

      // Verify update
      const newTarget = await settings.getDefaultTarget();
      expect(newTarget).toBe('opencode');
    });

    it('should handle multiple updates', async () => {
      await settings.setDefaultTarget('claude-code');
      await settings.setDefaultTarget('opencode');
      await settings.setDefaultTarget('claude-code');

      const target = await settings.getDefaultTarget();
      expect(target).toBe('claude-code');
    });

    it('should preserve data across instances', async () => {
      await settings.setDefaultTarget('claude-code');

      const newInstance = new ProjectSettings(testDir);
      const target = await newInstance.getDefaultTarget();

      expect(target).toBe('claude-code');
    });
  });

  describe('Error Handling', () => {
    it('should throw on write permission error', async () => {
      // This test is platform-dependent and may need adjustment
      // Testing that errors are properly wrapped
      const invalidSettings = new ProjectSettings('/invalid/path/that/does/not/exist');

      await expect(invalidSettings.save({ defaultTarget: 'test' })).rejects.toThrow(
        'Failed to save settings'
      );
    });
  });
});
