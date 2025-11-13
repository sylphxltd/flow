/**
 * Central constants for configuration
 */

import os from 'node:os';
import path from 'node:path';

/**
 * Configuration directory name
 */
export const CONFIG_DIR = '.sylphx-flow';

/**
 * User-global settings directory (in home directory)
 */
export const USER_CONFIG_DIR = path.join(os.homedir(), CONFIG_DIR);

/**
 * User-global settings file (for API keys)
 */
export const USER_SETTINGS_FILE = path.join(USER_CONFIG_DIR, 'settings.json');

/**
 * Project-level settings file (shareable)
 */
export function getProjectSettingsFile(cwd: string = process.cwd()): string {
  return path.join(cwd, CONFIG_DIR, 'settings.json');
}

/**
 * Project local settings file (never commit, overrides project settings)
 */
export function getProjectLocalSettingsFile(cwd: string = process.cwd()): string {
  return path.join(cwd, CONFIG_DIR, 'settings.local.json');
}
