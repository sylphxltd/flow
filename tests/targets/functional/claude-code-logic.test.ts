import { describe, expect, it } from 'vitest';
import {
  buildHookConfiguration,
  createSettings,
  DEFAULT_HOOKS,
  getSuccessMessage,
  mergeSettings,
  parseSettings,
  processSettings,
  serializeSettings,
  validateHookConfig,
} from '../../../packages/flow/src/targets/functional/claude-code-logic';

describe('claude-code-logic', () => {
  describe('parseSettings', () => {
    it('should parse valid JSON', () => {
      const content = '{"hooks": {}, "test": "value"}';
      const result = parseSettings(content);

      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        expect(result.value).toEqual({ hooks: {}, test: 'value' });
      }
    });

    it('should fail for invalid JSON', () => {
      const content = '{invalid json}';
      const result = parseSettings(content);

      expect(result._tag).toBe('Failure');
    });
  });

  describe('buildHookConfiguration', () => {
    it('should build hooks with default commands', () => {
      const hooks = buildHookConfiguration();

      expect(hooks.Notification).toBeDefined();
      expect(hooks.Notification[0].hooks[0].command).toContain('hook --type notification');
    });

    it('should build hooks with custom commands', () => {
      const hooks = buildHookConfiguration({
        notificationCommand: 'custom-notification',
      });

      expect(hooks.Notification[0].hooks[0].command).toBe('custom-notification');
    });
  });

  describe('mergeSettings', () => {
    it('should merge hooks with existing settings', () => {
      const existing = {
        existingKey: 'value',
        hooks: {
          ExistingHook: [{ hooks: [{ type: 'command', command: 'existing' }] }],
        },
      };

      const merged = mergeSettings(existing);

      expect(merged.existingKey).toBe('value');
      expect(merged.hooks?.ExistingHook).toBeDefined();
      expect(merged.hooks?.Notification).toBeDefined();
    });

    it('should create hooks if none exist', () => {
      const existing = { test: 'value' };
      const merged = mergeSettings(existing);

      expect(merged.test).toBe('value');
      expect(merged.hooks?.Notification).toBeDefined();
    });

    it('should override Notification hook', () => {
      const existing = {
        hooks: {
          Notification: [{ hooks: [{ type: 'command', command: 'old' }] }],
        },
      };

      const merged = mergeSettings(existing);

      expect(merged.hooks?.Notification[0].hooks[0].command).toContain('hook --type notification');
    });
  });

  describe('createSettings', () => {
    it('should create new settings with hooks', () => {
      const settings = createSettings();

      expect(settings.hooks).toBeDefined();
      expect(settings.hooks?.Notification).toBeDefined();
    });
  });

  describe('serializeSettings', () => {
    it('should serialize settings to JSON', () => {
      const settings = { test: 'value', hooks: {} };
      const serialized = serializeSettings(settings);

      expect(serialized).toContain('"test": "value"');
      expect(serialized).toContain('"hooks": {}');
    });

    it('should use pretty formatting', () => {
      const settings = { test: 'value' };
      const serialized = serializeSettings(settings);

      // Should be indented
      expect(serialized).toContain('\n');
      expect(serialized).toContain('  ');
    });
  });

  describe('getSuccessMessage', () => {
    it('should return success message', () => {
      const message = getSuccessMessage();

      expect(message).toContain('Claude Code hook configured');
      expect(message).toContain('Notification');
    });
  });

  describe('processSettings', () => {
    it('should create new settings when content is null', () => {
      const result = processSettings(null);

      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        const parsed = JSON.parse(result.value);
        expect(parsed.hooks.Notification).toBeDefined();
      }
    });

    it('should create new settings when content is empty', () => {
      const result = processSettings('');

      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        const parsed = JSON.parse(result.value);
        expect(parsed.hooks.Notification).toBeDefined();
      }
    });

    it('should merge with existing valid settings', () => {
      const existing = JSON.stringify({ test: 'value', hooks: {} });
      const result = processSettings(existing);

      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        const parsed = JSON.parse(result.value);
        expect(parsed.test).toBe('value');
        expect(parsed.hooks.Notification).toBeDefined();
      }
    });

    it('should create new settings when existing is invalid JSON', () => {
      const result = processSettings('{invalid}');

      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        const parsed = JSON.parse(result.value);
        expect(parsed.hooks.Notification).toBeDefined();
        // Should not have any invalid content
        expect(parsed.invalid).toBeUndefined();
      }
    });

    it('should use custom hook config', () => {
      const result = processSettings(null, {
        notificationCommand: 'custom-notification',
      });

      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        const parsed = JSON.parse(result.value);
        expect(parsed.hooks.Notification[0].hooks[0].command).toBe('custom-notification');
      }
    });
  });

  describe('validateHookConfig', () => {
    it('should accept valid config', () => {
      const result = validateHookConfig({
        notificationCommand: 'valid-command',
      });

      expect(result._tag).toBe('Success');
    });

    it('should reject empty notification command', () => {
      const result = validateHookConfig({
        notificationCommand: '   ',
      });

      expect(result._tag).toBe('Failure');
    });

    it('should accept empty config object', () => {
      const result = validateHookConfig({});

      expect(result._tag).toBe('Success');
    });
  });
});
