/**
 * Tests for ProjectSettings functions
 * Validates functional refactoring with Result types
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isFailure, isSuccess } from '../../src/core/functional/result.js';
import {
  getDefaultTarget,
  getSettingsPath,
  loadSettings,
  saveSettings,
  setDefaultTarget,
  settingsExists,
  updateSettings,
} from '../../src/utils/settings.js';

describe('ProjectSettings (Functional)', () => {
  const testDir = path.join('/tmp', 'test-settings-' + Math.random().toString(36).substring(7));

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Path Operations', () => {
    it('should get settings path', () => {
      const settingsPath = getSettingsPath(testDir);

      expect(settingsPath).toContain('.sylphx-flow');
      expect(settingsPath).toContain('settings.json');
      expect(settingsPath).toContain(testDir);
    });

    it('should check if settings exists', async () => {
      const exists1 = await settingsExists(testDir);
      expect(exists1).toBe(false);

      await saveSettings({ version: '1.0.0' }, testDir);

      const exists2 = await settingsExists(testDir);
      expect(exists2).toBe(true);
    });
  });

  describe('Load Settings', () => {
    it('should return empty settings for non-existent file', async () => {
      const result = await loadSettings(testDir);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual({});
      }
    });

    it('should load existing settings', async () => {
      const settings = { defaultTarget: 'opencode', version: '1.0.0' };
      await saveSettings(settings, testDir);

      const result = await loadSettings(testDir);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.defaultTarget).toBe('opencode');
        expect(result.value.version).toBe('1.0.0');
      }
    });

    it('should return failure for invalid JSON', async () => {
      const settingsPath = getSettingsPath(testDir);
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      await fs.writeFile(settingsPath, 'invalid json{', 'utf8');

      const result = await loadSettings(testDir);

      expect(isFailure(result)).toBe(true);
    });
  });

  describe('Save Settings', () => {
    it('should save settings with version', async () => {
      const settings = { defaultTarget: 'claude-code' };
      const result = await saveSettings(settings, testDir);

      expect(isSuccess(result)).toBe(true);

      const loadResult = await loadSettings(testDir);
      expect(isSuccess(loadResult)).toBe(true);
      if (isSuccess(loadResult)) {
        expect(loadResult.value.defaultTarget).toBe('claude-code');
        expect(loadResult.value.version).toBe('1.0.0');
      }
    });

    it('should preserve existing version', async () => {
      const settings = { defaultTarget: 'opencode', version: '2.0.0' };
      await saveSettings(settings, testDir);

      const result = await loadSettings(testDir);
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.version).toBe('2.0.0');
      }
    });

    it('should create directory if not exists', async () => {
      const result = await saveSettings({ defaultTarget: 'test' }, testDir);

      expect(isSuccess(result)).toBe(true);
      const settingsPath = getSettingsPath(testDir);
      const exists = await fs.access(settingsPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('Update Settings', () => {
    it('should update existing settings', async () => {
      await saveSettings({ defaultTarget: 'opencode' }, testDir);

      const result = await updateSettings({ defaultTarget: 'claude-code' }, testDir);

      expect(isSuccess(result)).toBe(true);

      const loaded = await loadSettings(testDir);
      if (isSuccess(loaded)) {
        expect(loaded.value.defaultTarget).toBe('claude-code');
      }
    });

    it('should merge with existing settings', async () => {
      await saveSettings({ defaultTarget: 'opencode', version: '1.0.0' }, testDir);

      const result = await updateSettings({ defaultTarget: 'claude-code' }, testDir);

      expect(isSuccess(result)).toBe(true);

      const loaded = await loadSettings(testDir);
      if (isSuccess(loaded)) {
        expect(loaded.value.defaultTarget).toBe('claude-code');
        expect(loaded.value.version).toBe('1.0.0');
      }
    });

    it('should create settings if not exists', async () => {
      const result = await updateSettings({ defaultTarget: 'test' }, testDir);

      expect(isSuccess(result)).toBe(true);

      const loaded = await loadSettings(testDir);
      if (isSuccess(loaded)) {
        expect(loaded.value.defaultTarget).toBe('test');
      }
    });
  });

  describe('Default Target Operations', () => {
    it('should get undefined for no settings', async () => {
      const target = await getDefaultTarget(testDir);

      expect(target).toBeUndefined();
    });

    it('should get default target from settings', async () => {
      await saveSettings({ defaultTarget: 'opencode' }, testDir);

      const target = await getDefaultTarget(testDir);

      expect(target).toBe('opencode');
    });

    it('should set default target', async () => {
      const result = await setDefaultTarget('claude-code', testDir);

      expect(isSuccess(result)).toBe(true);

      const target = await getDefaultTarget(testDir);
      expect(target).toBe('claude-code');
    });
  });

  describe('Result Type Integration', () => {
    it('should compose operations with Result', async () => {
      const result1 = await saveSettings({ defaultTarget: 'opencode' }, testDir);
      expect(isSuccess(result1)).toBe(true);

      const result2 = await loadSettings(testDir);
      expect(isSuccess(result2)).toBe(true);

      const result3 = await updateSettings({ defaultTarget: 'claude-code' }, testDir);
      expect(isSuccess(result3)).toBe(true);
    });

    it('should propagate failures through chain', async () => {
      const result1 = await saveSettings({ defaultTarget: 'test' }, testDir);
      expect(isSuccess(result1)).toBe(true);

      const settingsPath = getSettingsPath(testDir);
      await fs.writeFile(settingsPath, 'corrupted{', 'utf8');

      const result2 = await loadSettings(testDir);
      expect(isFailure(result2)).toBe(true);

      const result3 = await updateSettings({ defaultTarget: 'new' }, testDir);
      expect(isFailure(result3)).toBe(true);
    });
  });
});
