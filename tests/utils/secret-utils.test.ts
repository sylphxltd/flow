/**
 * Secret Utils Tests
 * Tests for secret management utilities
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { secretUtils } from '../../src/utils/secret-utils.js';

describe('Secret Utils', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'secret-utils-test-'));
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getSecretsDir', () => {
    it('should return secrets directory path', () => {
      const secretsDir = secretUtils.getSecretsDir(testDir);
      expect(secretsDir).toContain(testDir);
      expect(secretsDir).toContain('.secrets');
    });

    it('should join paths correctly', () => {
      const secretsDir = secretUtils.getSecretsDir(testDir);
      expect(secretsDir.endsWith('.secrets')).toBe(true);
    });

    it('should work with different cwd paths', () => {
      const dir1 = secretUtils.getSecretsDir('/path/one');
      const dir2 = secretUtils.getSecretsDir('/path/two');
      expect(dir1).not.toBe(dir2);
      expect(dir1).toContain('/path/one');
      expect(dir2).toContain('/path/two');
    });
  });

  describe('ensureSecretsDir', () => {
    it('should create secrets directory', async () => {
      await secretUtils.ensureSecretsDir(testDir);
      const secretsDir = join(testDir, '.secrets');
      expect(existsSync(secretsDir)).toBe(true);
    });

    it('should not fail if directory already exists', async () => {
      const secretsDir = join(testDir, '.secrets');
      mkdirSync(secretsDir);

      await expect(secretUtils.ensureSecretsDir(testDir)).resolves.toBeUndefined();
    });

    it('should create directory with recursive flag', async () => {
      // Ensure it works even if parent doesn't exist (though testDir does)
      await expect(secretUtils.ensureSecretsDir(testDir)).resolves.toBeUndefined();
    });
  });

  describe('writeSecret', () => {
    it('should write secret to file', async () => {
      await secretUtils.writeSecret(testDir, 'API_KEY', 'secret-value');

      const secretPath = join(testDir, '.secrets', 'API_KEY');
      const content = readFileSync(secretPath, 'utf8');
      expect(content).toBe('secret-value');
    });

    it('should create secrets directory if missing', async () => {
      const secretFile = await secretUtils.writeSecret(testDir, 'KEY', 'value');
      expect(secretFile).toContain('.secrets');
      expect(existsSync(join(testDir, '.secrets'))).toBe(true);
    });

    it('should return secret file path', async () => {
      const secretFile = await secretUtils.writeSecret(testDir, 'KEY', 'value');
      expect(secretFile).toBe('.secrets/KEY');
    });

    it('should trim whitespace from value', async () => {
      await secretUtils.writeSecret(testDir, 'KEY', '  value with spaces  ');

      const secretPath = join(testDir, '.secrets', 'KEY');
      const content = readFileSync(secretPath, 'utf8');
      expect(content).toBe('value with spaces');
    });

    it('should handle empty string value', async () => {
      await secretUtils.writeSecret(testDir, 'EMPTY', '');

      const secretPath = join(testDir, '.secrets', 'EMPTY');
      const content = readFileSync(secretPath, 'utf8');
      expect(content).toBe('');
    });

    it('should overwrite existing secret', async () => {
      await secretUtils.writeSecret(testDir, 'KEY', 'old-value');
      await secretUtils.writeSecret(testDir, 'KEY', 'new-value');

      const secretPath = join(testDir, '.secrets', 'KEY');
      const content = readFileSync(secretPath, 'utf8');
      expect(content).toBe('new-value');
    });
  });

  describe('readSecret', () => {
    it('should read secret from file', async () => {
      const secretsDir = join(testDir, '.secrets');
      mkdirSync(secretsDir, { recursive: true });
      writeFileSync(join(secretsDir, 'API_KEY'), 'secret-value', 'utf8');

      const value = await secretUtils.readSecret(testDir, '.secrets/API_KEY');
      expect(value).toBe('secret-value');
    });

    it('should read secret with absolute path', async () => {
      const secretsDir = join(testDir, '.secrets');
      mkdirSync(secretsDir, { recursive: true });
      const secretPath = join(secretsDir, 'KEY');
      writeFileSync(secretPath, 'value', 'utf8');

      const value = await secretUtils.readSecret(testDir, secretPath);
      expect(value).toBe('value');
    });

    it('should throw if file does not exist', async () => {
      await expect(secretUtils.readSecret(testDir, '.secrets/MISSING')).rejects.toThrow(
        'Failed to read secret file'
      );
    });

    it('should include filename in error message', async () => {
      await expect(secretUtils.readSecret(testDir, '.secrets/MISSING')).rejects.toThrow('MISSING');
    });

    it('should handle secrets with special characters', async () => {
      const secretsDir = join(testDir, '.secrets');
      mkdirSync(secretsDir, { recursive: true });
      writeFileSync(join(secretsDir, 'KEY'), 'value!@#$%^&*()', 'utf8');

      const value = await secretUtils.readSecret(testDir, '.secrets/KEY');
      expect(value).toBe('value!@#$%^&*()');
    });
  });

  describe('toFileReference', () => {
    it('should convert key to file reference', () => {
      const ref = secretUtils.toFileReference('API_KEY');
      expect(ref).toBe('{file:.secrets/API_KEY}');
    });

    it('should handle different key formats', () => {
      expect(secretUtils.toFileReference('simple')).toBe('{file:.secrets/simple}');
      expect(secretUtils.toFileReference('WITH_UNDERSCORE')).toBe(
        '{file:.secrets/WITH_UNDERSCORE}'
      );
      expect(secretUtils.toFileReference('with-hyphen')).toBe('{file:.secrets/with-hyphen}');
    });

    it('should create valid reference format', () => {
      const ref = secretUtils.toFileReference('KEY');
      expect(ref.startsWith('{file:')).toBe(true);
      expect(ref.endsWith('}')).toBe(true);
    });
  });

  describe('isFileReference', () => {
    it('should return true for valid file reference', () => {
      expect(secretUtils.isFileReference('{file:.secrets/API_KEY}')).toBe(true);
    });

    it('should return false for non-reference string', () => {
      expect(secretUtils.isFileReference('plain-value')).toBe(false);
    });

    it('should return false for partial reference', () => {
      expect(secretUtils.isFileReference('{file:.secrets/KEY')).toBe(false);
      expect(secretUtils.isFileReference('file:.secrets/KEY}')).toBe(false);
    });

    it('should require both prefix and suffix', () => {
      expect(secretUtils.isFileReference('{file:something')).toBe(false);
      expect(secretUtils.isFileReference('something}')).toBe(false);
    });

    it('should work with different file paths', () => {
      expect(secretUtils.isFileReference('{file:./path/to/secret}')).toBe(true);
      expect(secretUtils.isFileReference('{file:/absolute/path}')).toBe(true);
    });
  });

  describe('extractFilePath', () => {
    it('should extract file path from reference', () => {
      const path = secretUtils.extractFilePath('{file:.secrets/API_KEY}');
      expect(path).toBe('.secrets/API_KEY');
    });

    it('should throw for invalid reference', () => {
      expect(() => secretUtils.extractFilePath('plain-value')).toThrow('Invalid file reference');
    });

    it('should throw for partial reference', () => {
      expect(() => secretUtils.extractFilePath('{file:path')).toThrow('Invalid file reference');
    });

    it('should handle different path formats', () => {
      expect(secretUtils.extractFilePath('{file:./relative/path}')).toBe('./relative/path');
      expect(secretUtils.extractFilePath('{file:/absolute/path}')).toBe('/absolute/path');
      expect(secretUtils.extractFilePath('{file:simple}')).toBe('simple');
    });

    it('should preserve path structure', () => {
      const path = secretUtils.extractFilePath('{file:.secrets/nested/dir/KEY}');
      expect(path).toBe('.secrets/nested/dir/KEY');
    });
  });

  describe('resolveFileReferences', () => {
    beforeEach(async () => {
      await secretUtils.ensureSecretsDir(testDir);
      await secretUtils.writeSecret(testDir, 'API_KEY', 'secret-api-key');
      await secretUtils.writeSecret(testDir, 'DB_PASSWORD', 'secret-password');
    });

    it('should resolve string file reference', async () => {
      const result = await secretUtils.resolveFileReferences(testDir, '{file:.secrets/API_KEY}');
      expect(result).toBe('secret-api-key');
    });

    it('should leave non-reference strings unchanged', async () => {
      const result = await secretUtils.resolveFileReferences(testDir, 'plain-value');
      expect(result).toBe('plain-value');
    });

    it('should resolve references in object', async () => {
      const obj = {
        apiKey: '{file:.secrets/API_KEY}',
        dbPassword: '{file:.secrets/DB_PASSWORD}',
        plainValue: 'unchanged',
      };

      const result = await secretUtils.resolveFileReferences(testDir, obj);
      expect(result.apiKey).toBe('secret-api-key');
      expect(result.dbPassword).toBe('secret-password');
      expect(result.plainValue).toBe('unchanged');
    });

    it('should resolve references in array', async () => {
      const arr = ['{file:.secrets/API_KEY}', 'plain-value', '{file:.secrets/DB_PASSWORD}'];

      const result = await secretUtils.resolveFileReferences(testDir, arr);
      expect(result[0]).toBe('secret-api-key');
      expect(result[1]).toBe('plain-value');
      expect(result[2]).toBe('secret-password');
    });

    it('should resolve nested objects', async () => {
      const obj = {
        config: {
          auth: {
            apiKey: '{file:.secrets/API_KEY}',
          },
        },
      };

      const result = await secretUtils.resolveFileReferences(testDir, obj);
      expect(result.config.auth.apiKey).toBe('secret-api-key');
    });

    it('should handle mixed nested structures', async () => {
      const obj = {
        secrets: [{ key: '{file:.secrets/API_KEY}' }, { key: 'plain-value' }],
        other: 'value',
      };

      const result = await secretUtils.resolveFileReferences(testDir, obj);
      expect(result.secrets[0].key).toBe('secret-api-key');
      expect(result.secrets[1].key).toBe('plain-value');
      expect(result.other).toBe('value');
    });

    it('should handle null values', async () => {
      const result = await secretUtils.resolveFileReferences(testDir, null);
      expect(result).toBeNull();
    });

    it('should handle undefined values', async () => {
      const result = await secretUtils.resolveFileReferences(testDir, undefined);
      expect(result).toBeUndefined();
    });

    it('should handle number values', async () => {
      const result = await secretUtils.resolveFileReferences(testDir, 42);
      expect(result).toBe(42);
    });

    it('should handle boolean values', async () => {
      const result = await secretUtils.resolveFileReferences(testDir, true);
      expect(result).toBe(true);
    });
  });

  describe('convertSecretsToFileReferences', () => {
    it('should convert secrets to file references', async () => {
      const envVars = {
        API_KEY: 'secret-value',
        DB_PASSWORD: 'password123',
      };

      const result = await secretUtils.convertSecretsToFileReferences(testDir, envVars);

      expect(result.API_KEY).toBe('{file:.secrets/API_KEY}');
      expect(result.DB_PASSWORD).toBe('{file:.secrets/DB_PASSWORD}');

      // Verify files were created
      const apiKeyContent = readFileSync(join(testDir, '.secrets', 'API_KEY'), 'utf8');
      expect(apiKeyContent).toBe('secret-value');
    });

    it('should skip existing file references', async () => {
      const envVars = {
        API_KEY: '{file:.secrets/EXISTING}',
        NEW_KEY: 'new-value',
      };

      const result = await secretUtils.convertSecretsToFileReferences(testDir, envVars);

      expect(result.API_KEY).toBe('{file:.secrets/EXISTING}');
      expect(result.NEW_KEY).toBe('{file:.secrets/NEW_KEY}');
    });

    it('should handle empty values', async () => {
      const envVars = {
        EMPTY: '',
      };

      const result = await secretUtils.convertSecretsToFileReferences(testDir, envVars);
      expect(result.EMPTY).toBe('');
    });

    it('should handle empty object', async () => {
      const result = await secretUtils.convertSecretsToFileReferences(testDir, {});
      expect(result).toEqual({});
    });
  });

  describe('saveSecrets', () => {
    it('should save multiple secrets', async () => {
      const secrets = {
        API_KEY: 'key-value',
        DB_PASSWORD: 'password',
        TOKEN: 'token-value',
      };

      await secretUtils.saveSecrets(testDir, secrets);

      const apiKey = readFileSync(join(testDir, '.secrets', 'API_KEY'), 'utf8');
      const dbPassword = readFileSync(join(testDir, '.secrets', 'DB_PASSWORD'), 'utf8');
      const token = readFileSync(join(testDir, '.secrets', 'TOKEN'), 'utf8');

      expect(apiKey).toBe('key-value');
      expect(dbPassword).toBe('password');
      expect(token).toBe('token-value');
    });

    it('should handle empty secrets object', async () => {
      await expect(secretUtils.saveSecrets(testDir, {})).resolves.toBeUndefined();
    });

    it('should create secrets directory', async () => {
      await secretUtils.saveSecrets(testDir, { KEY: 'value' });
      expect(existsSync(join(testDir, '.secrets'))).toBe(true);
    });

    it('should overwrite existing secrets', async () => {
      await secretUtils.saveSecrets(testDir, { KEY: 'old-value' });
      await secretUtils.saveSecrets(testDir, { KEY: 'new-value' });

      const content = readFileSync(join(testDir, '.secrets', 'KEY'), 'utf8');
      expect(content).toBe('new-value');
    });
  });

  describe('loadSecrets', () => {
    it('should load all secrets from directory', async () => {
      const secretsDir = join(testDir, '.secrets');
      mkdirSync(secretsDir, { recursive: true });
      writeFileSync(join(secretsDir, 'API_KEY'), 'key-value', 'utf8');
      writeFileSync(join(secretsDir, 'DB_PASSWORD'), 'password', 'utf8');
      writeFileSync(join(secretsDir, 'TOKEN'), 'token-value', 'utf8');

      const secrets = await secretUtils.loadSecrets(testDir);

      expect(secrets.API_KEY).toBe('key-value');
      expect(secrets.DB_PASSWORD).toBe('password');
      expect(secrets.TOKEN).toBe('token-value');
    });

    it('should return empty object if directory does not exist', async () => {
      const secrets = await secretUtils.loadSecrets(testDir);
      expect(secrets).toEqual({});
    });

    it('should return empty object if directory is empty', async () => {
      mkdirSync(join(testDir, '.secrets'), { recursive: true });
      const secrets = await secretUtils.loadSecrets(testDir);
      expect(secrets).toEqual({});
    });

    it('should skip subdirectories', async () => {
      const secretsDir = join(testDir, '.secrets');
      mkdirSync(secretsDir, { recursive: true });
      mkdirSync(join(secretsDir, 'subdir'), { recursive: true });
      writeFileSync(join(secretsDir, 'KEY'), 'value', 'utf8');

      const secrets = await secretUtils.loadSecrets(testDir);

      expect(secrets.KEY).toBe('value');
      expect(secrets.subdir).toBeUndefined();
    });

    it('should trim whitespace from values', async () => {
      const secretsDir = join(testDir, '.secrets');
      mkdirSync(secretsDir, { recursive: true });
      writeFileSync(join(secretsDir, 'KEY'), '  value with spaces  \n', 'utf8');

      const secrets = await secretUtils.loadSecrets(testDir);
      expect(secrets.KEY).toBe('value with spaces');
    });

    it('should handle special characters in filenames', async () => {
      const secretsDir = join(testDir, '.secrets');
      mkdirSync(secretsDir, { recursive: true });
      writeFileSync(join(secretsDir, 'key-with-hyphen'), 'value', 'utf8');
      writeFileSync(join(secretsDir, 'key_with_underscore'), 'value2', 'utf8');

      const secrets = await secretUtils.loadSecrets(testDir);
      expect(secrets['key-with-hyphen']).toBe('value');
      expect(secrets['key_with_underscore']).toBe('value2');
    });
  });

  describe('addToGitignore', () => {
    it('should add .secrets/ to gitignore', async () => {
      await secretUtils.addToGitignore(testDir);

      const gitignorePath = join(testDir, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf8');

      expect(content).toContain('.secrets/');
    });

    it('should not duplicate .secrets/ entry', async () => {
      await secretUtils.addToGitignore(testDir);
      await secretUtils.addToGitignore(testDir);

      const gitignorePath = join(testDir, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf8');
      const matches = content.match(/\.secrets\//g);

      expect(matches?.length).toBe(1);
    });

    it('should create .gitignore if missing', async () => {
      await secretUtils.addToGitignore(testDir);

      const gitignorePath = join(testDir, '.gitignore');
      expect(existsSync(gitignorePath)).toBe(true);
    });

    it('should preserve existing gitignore content', async () => {
      const gitignorePath = join(testDir, '.gitignore');
      writeFileSync(gitignorePath, 'node_modules/\n.env\n', 'utf8');

      await secretUtils.addToGitignore(testDir);

      const content = readFileSync(gitignorePath, 'utf8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
      expect(content).toContain('.secrets/');
    });

    it('should not add if .secrets already exists', async () => {
      const gitignorePath = join(testDir, '.gitignore');
      writeFileSync(gitignorePath, '.secrets\n', 'utf8');

      await secretUtils.addToGitignore(testDir);

      const content = readFileSync(gitignorePath, 'utf8');
      expect(content).toBe('.secrets\n');
    });

    it('should not add if .secrets/ already exists', async () => {
      const gitignorePath = join(testDir, '.gitignore');
      writeFileSync(gitignorePath, '.secrets/\n', 'utf8');

      await secretUtils.addToGitignore(testDir);

      const content = readFileSync(gitignorePath, 'utf8');
      expect(content).toBe('.secrets/\n');
    });

    it('should add newline if gitignore does not end with one', async () => {
      const gitignorePath = join(testDir, '.gitignore');
      writeFileSync(gitignorePath, 'node_modules/', 'utf8');

      await secretUtils.addToGitignore(testDir);

      const content = readFileSync(gitignorePath, 'utf8');
      expect(content).toBe('node_modules/\n.secrets/\n');
    });

    it('should handle errors gracefully', async () => {
      // Mock console.warn to suppress expected warning
      const originalWarn = console.warn;
      console.warn = () => {};

      // Create gitignore as a directory to cause write error
      const gitignorePath = join(testDir, '.gitignore');
      mkdirSync(gitignorePath);

      await expect(secretUtils.addToGitignore(testDir)).resolves.toBeUndefined();

      // Restore console.warn
      console.warn = originalWarn;
    });
  });

  describe('Integration', () => {
    it('should support full secret workflow', async () => {
      // Write secrets
      await secretUtils.writeSecret(testDir, 'API_KEY', 'secret-value');
      await secretUtils.writeSecret(testDir, 'DB_PASSWORD', 'password');

      // Load secrets
      const secrets = await secretUtils.loadSecrets(testDir);
      expect(secrets.API_KEY).toBe('secret-value');
      expect(secrets.DB_PASSWORD).toBe('password');

      // Create file references
      const apiKeyRef = secretUtils.toFileReference('API_KEY');
      expect(secretUtils.isFileReference(apiKeyRef)).toBe(true);

      // Resolve reference
      const resolved = await secretUtils.resolveFileReferences(testDir, apiKeyRef);
      expect(resolved).toBe('secret-value');

      // Add to gitignore
      await secretUtils.addToGitignore(testDir);
      const gitignore = readFileSync(join(testDir, '.gitignore'), 'utf8');
      expect(gitignore).toContain('.secrets/');
    });

    it('should support environment variable conversion', async () => {
      const envVars = {
        API_KEY: 'secret',
        DB_PASSWORD: 'password',
        PUBLIC_URL: 'https://example.com',
      };

      // Convert to file references
      const converted = await secretUtils.convertSecretsToFileReferences(testDir, envVars);

      // All should be file references
      expect(secretUtils.isFileReference(converted.API_KEY)).toBe(true);
      expect(secretUtils.isFileReference(converted.DB_PASSWORD)).toBe(true);
      expect(secretUtils.isFileReference(converted.PUBLIC_URL)).toBe(true);

      // Resolve back
      const resolved = await secretUtils.resolveFileReferences(testDir, converted);
      expect(resolved.API_KEY).toBe('secret');
      expect(resolved.DB_PASSWORD).toBe('password');
      expect(resolved.PUBLIC_URL).toBe('https://example.com');
    });

    it('should support batch operations', async () => {
      // Save multiple secrets
      const secrets = {
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: 'value3',
      };
      await secretUtils.saveSecrets(testDir, secrets);

      // Load them back
      const loaded = await secretUtils.loadSecrets(testDir);
      expect(loaded).toEqual(secrets);

      // Create config with references
      const config = {
        auth: {
          key1: secretUtils.toFileReference('KEY1'),
          key2: secretUtils.toFileReference('KEY2'),
        },
        other: secretUtils.toFileReference('KEY3'),
      };

      // Resolve all references
      const resolved = await secretUtils.resolveFileReferences(testDir, config);
      expect(resolved.auth.key1).toBe('value1');
      expect(resolved.auth.key2).toBe('value2');
      expect(resolved.other).toBe('value3');
    });
  });
});
