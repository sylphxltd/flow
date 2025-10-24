import fs from 'node:fs/promises';
import path from 'node:path';

export interface ProjectSettings {
  /** Default target for the project */
  defaultTarget?: string;
  /** Settings version for migration purposes */
  version?: string;
}

const SETTINGS_FILE = '.sylphx-flow/settings.json';
const CURRENT_VERSION = '1.0.0';

/**
 * Project settings manager
 * Handles uncommitted project-specific settings
 */
export class ProjectSettings {
  private settingsPath: string;

  constructor(cwd: string = process.cwd()) {
    this.settingsPath = path.join(cwd, SETTINGS_FILE);
  }

  /**
   * Load project settings from file
   */
  async load(): Promise<ProjectSettings> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf8');
      const settings = JSON.parse(content) as ProjectSettings;
      return settings;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {};
      }
      throw new Error(`Failed to load settings: ${error.message}`);
    }
  }

  /**
   * Save project settings to file
   */
  async save(settings: ProjectSettings): Promise<void> {
    try {
      // Ensure the directory exists
      await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });

      // Add current version if not present
      const settingsWithVersion = {
        ...settings,
        version: settings.version || CURRENT_VERSION,
      };

      // Write settings with proper formatting
      await fs.writeFile(
        this.settingsPath,
        JSON.stringify(settingsWithVersion, null, 2) + '\n',
        'utf8'
      );
    } catch (error: any) {
      throw new Error(`Failed to save settings: ${error.message}`);
    }
  }

  /**
   * Update specific settings properties
   */
  async update(updates: Partial<ProjectSettings>): Promise<void> {
    const currentSettings = await this.load();
    const newSettings = { ...currentSettings, ...updates };
    await this.save(newSettings);
  }

  /**
   * Get the default target from settings
   */
  async getDefaultTarget(): Promise<string | undefined> {
    const settings = await this.load();
    return settings.defaultTarget;
  }

  /**
   * Set the default target
   */
  async setDefaultTarget(targetId: string): Promise<void> {
    await this.update({ defaultTarget: targetId });
  }

  /**
   * Check if settings file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.settingsPath);
      return true;
    } catch {
      return false;
    }
  }
}

// Export a singleton instance for convenience
export const projectSettings = new ProjectSettings();