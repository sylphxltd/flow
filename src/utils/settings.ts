/**
 * Project settings manager - functional implementation
 * Pure functions for managing uncommitted project-specific settings
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { type Result, success, tryCatchAsync } from '../core/functional/result.js';

export interface ProjectSettings {
  /** Default target for the project */
  defaultTarget?: string;
  /** Settings version for migration purposes */
  version?: string;
}

const SETTINGS_FILE = '.sylphx-flow/settings.json';
const CURRENT_VERSION = '1.0.0';

/**
 * Get settings file path for a given working directory
 */
export const getSettingsPath = (cwd: string = process.cwd()): string =>
  path.join(cwd, SETTINGS_FILE);

/**
 * Check if settings file exists
 */
export const settingsExists = async (cwd: string = process.cwd()): Promise<boolean> => {
  try {
    await fs.access(getSettingsPath(cwd));
    return true;
  } catch {
    return false;
  }
};

/**
 * Load project settings from file
 * Returns Result type for explicit error handling
 */
export const loadSettings = async (
  cwd: string = process.cwd()
): Promise<Result<ProjectSettings, Error>> => {
  const settingsPath = getSettingsPath(cwd);

  return tryCatchAsync(
    async () => {
      const content = await fs.readFile(settingsPath, 'utf8');
      return JSON.parse(content) as ProjectSettings;
    },
    (error: any) => {
      // File not found is not an error - return empty settings
      if (error.code === 'ENOENT') {
        return new Error('EMPTY_SETTINGS');
      }
      return new Error(`Failed to load settings: ${error.message}`);
    }
  ).then((result) => {
    // Convert EMPTY_SETTINGS error to success with empty object
    if (result._tag === 'Failure' && result.error.message === 'EMPTY_SETTINGS') {
      return success({});
    }
    return result;
  });
};

/**
 * Save project settings to file
 * Returns Result type for explicit error handling
 */
export const saveSettings = async (
  settings: ProjectSettings,
  cwd: string = process.cwd()
): Promise<Result<void, Error>> => {
  const settingsPath = getSettingsPath(cwd);

  return tryCatchAsync(
    async () => {
      // Ensure the directory exists
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });

      // Add current version if not present
      const settingsWithVersion = {
        ...settings,
        version: settings.version || CURRENT_VERSION,
      };

      // Write settings with proper formatting
      await fs.writeFile(settingsPath, `${JSON.stringify(settingsWithVersion, null, 2)}\n`, 'utf8');
    },
    (error: any) => new Error(`Failed to save settings: ${error.message}`)
  );
};

/**
 * Update specific settings properties
 */
export const updateSettings = async (
  updates: Partial<ProjectSettings>,
  cwd: string = process.cwd()
): Promise<Result<void, Error>> => {
  const currentResult = await loadSettings(cwd);

  if (currentResult._tag === 'Failure') {
    return currentResult;
  }

  const newSettings = { ...currentResult.value, ...updates };
  return saveSettings(newSettings, cwd);
};

/**
 * Get the default target from settings
 */
export const getDefaultTarget = async (
  cwd: string = process.cwd()
): Promise<string | undefined> => {
  const result = await loadSettings(cwd);
  return result._tag === 'Success' ? result.value.defaultTarget : undefined;
};

/**
 * Set the default target in settings
 */
export const setDefaultTarget = async (
  target: string,
  cwd: string = process.cwd()
): Promise<Result<void, Error>> => updateSettings({ defaultTarget: target }, cwd);

/**
 * Legacy class-based interface for backward compatibility
 * @deprecated Use functional exports instead (loadSettings, saveSettings, etc.)
 */
export class ProjectSettings {
  constructor(private cwd: string = process.cwd()) {
    this.settingsPath = getSettingsPath(cwd);
  }

  async load(): Promise<ProjectSettings> {
    const result = await loadSettings(this.cwd);
    if (result._tag === 'Failure') {
      throw result.error;
    }
    return result.value;
  }

  async save(settings: ProjectSettings): Promise<void> {
    const result = await saveSettings(settings, this.cwd);
    if (result._tag === 'Failure') {
      throw result.error;
    }
  }

  async update(updates: Partial<ProjectSettings>): Promise<void> {
    const result = await updateSettings(updates, this.cwd);
    if (result._tag === 'Failure') {
      throw result.error;
    }
  }

  async getDefaultTarget(): Promise<string | undefined> {
    return getDefaultTarget(this.cwd);
  }

  async setDefaultTarget(target: string): Promise<void> {
    const result = await setDefaultTarget(target, this.cwd);
    if (result._tag === 'Failure') {
      throw result.error;
    }
  }

  async exists(): Promise<boolean> {
    return settingsExists(this.cwd);
  }
}

/**
 * Singleton instance for backward compatibility
 * @deprecated Use functional exports with explicit cwd parameter
 */
export const projectSettings = new ProjectSettings();
