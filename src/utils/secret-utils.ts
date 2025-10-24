import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Secret management utilities for handling {file:} syntax and .secrets directory
 */
export const secretUtils = {
  /**
   * Get the secrets directory path
   */
  getSecretsDir(cwd: string): string {
    return path.join(cwd, '.secrets');
  },

  /**
   * Ensure secrets directory exists
   */
  async ensureSecretsDir(cwd: string): Promise<void> {
    const secretsDir = secretUtils.getSecretsDir(cwd);
    await fs.mkdir(secretsDir, { recursive: true });
  },

  /**
   * Write a secret to a file in .secrets directory
   */
  async writeSecret(cwd: string, key: string, value: string): Promise<string> {
    await secretUtils.ensureSecretsDir(cwd);

    const secretFile = path.join('.secrets', key);
    const secretPath = path.join(cwd, secretFile);

    await fs.writeFile(secretPath, value.trim(), 'utf8');
    return secretFile;
  },

  /**
   * Read a secret from a file
   */
  async readSecret(cwd: string, secretFile: string): Promise<string> {
    const secretPath = path.resolve(cwd, secretFile);

    try {
      return await fs.readFile(secretPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read secret file ${secretFile}: ${error}`);
    }
  },

  /**
   * Convert a secret key to {file:} reference format
   */
  toFileReference(key: string): string {
    return `{file:.secrets/${key}}`;
  },

  /**
   * Check if a value is a file reference
   */
  isFileReference(value: string): boolean {
    return value.startsWith('{file:') && value.endsWith('}');
  },

  /**
   * Extract file path from {file:} reference
   */
  extractFilePath(reference: string): string {
    if (!secretUtils.isFileReference(reference)) {
      throw new Error(`Invalid file reference: ${reference}`);
    }

    return reference.slice(6, -1); // Remove {file: prefix and } suffix
  },

  /**
   * Resolve file references in an object recursively
   */
  async resolveFileReferences(cwd: string, obj: any): Promise<any> {
    if (typeof obj === 'string' && secretUtils.isFileReference(obj)) {
      const filePath = secretUtils.extractFilePath(obj);
      return await secretUtils.readSecret(cwd, filePath);
    }

    if (Array.isArray(obj)) {
      return Promise.all(obj.map((item) => secretUtils.resolveFileReferences(cwd, item)));
    }

    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = await secretUtils.resolveFileReferences(cwd, value);
      }
      return resolved;
    }

    return obj;
  },

  /**
   * Convert secret values to file references in environment variables
   */
  async convertSecretsToFileReferences(
    cwd: string,
    envVars: Record<string, string>
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(envVars)) {
      if (value && !secretUtils.isFileReference(value)) {
        // Write the secret to a file and create file reference
        const secretFile = await secretUtils.writeSecret(cwd, key, value);
        result[key] = secretUtils.toFileReference(key);
      } else {
        result[key] = value;
      }
    }

    return result;
  },

  /**
   * Save multiple secrets to files
   */
  async saveSecrets(cwd: string, secrets: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(secrets)) {
      await secretUtils.writeSecret(cwd, key, value);
    }
  },

  /**
   * Load all secrets from .secrets directory
   */
  async loadSecrets(cwd: string): Promise<Record<string, string>> {
    const secretsDir = secretUtils.getSecretsDir(cwd);
    const secrets: Record<string, string> = {};

    try {
      const files = await fs.readdir(secretsDir);

      for (const file of files) {
        const filePath = path.join(secretsDir, file);
        const stat = await fs.stat(filePath);

        if (stat.isFile()) {
          const content = await fs.readFile(filePath, 'utf8');
          secrets[file] = content.trim();
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      // Return empty secrets object
    }

    return secrets;
  },

  /**
   * Add .secrets to .gitignore if not already present
   */
  async addToGitignore(cwd: string): Promise<void> {
    const gitignorePath = path.join(cwd, '.gitignore');

    try {
      let gitignoreContent = '';
      try {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
      } catch {
        // .gitignore doesn't exist, create it
      }

      const lines = gitignoreContent.split('\n').map((line) => line.trim());
      if (!lines.includes('.secrets') && !lines.includes('.secrets/')) {
        gitignoreContent +=
          (gitignoreContent && !gitignoreContent.endsWith('\n') ? '\n' : '') + '.secrets/\n';
        await fs.writeFile(gitignorePath, gitignoreContent, 'utf8');
      }
    } catch (error) {
      console.warn('Warning: Could not update .gitignore:', error);
    }
  },
};
