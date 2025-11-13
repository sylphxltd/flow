import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import type { Target } from '../types.js';

/**
 * Files to delete during sync for each target
 */
interface SyncManifest {
  agents: string[];
  slashCommands: string[];
  rules: string[];
  preserve: string[];
}

/**
 * Build sync manifest - list files to delete and preserve
 */
export async function buildSyncManifest(cwd: string, target: Target): Promise<SyncManifest> {
  const manifest: SyncManifest = {
    agents: [],
    slashCommands: [],
    rules: [],
    preserve: [],
  };

  // Agent files
  if (target.config.agentDir) {
    const agentsDir = path.join(cwd, target.config.agentDir);
    if (fs.existsSync(agentsDir)) {
      const files = fs.readdirSync(agentsDir, { withFileTypes: true });
      manifest.agents = files
        .filter((f) => f.isFile() && f.name.endsWith(target.config.agentExtension || '.md'))
        .map((f) => path.join(agentsDir, f.name));
    }
  }

  // Slash command files
  if (target.config.slashCommandsDir) {
    const commandsDir = path.join(cwd, target.config.slashCommandsDir);
    if (fs.existsSync(commandsDir)) {
      const files = fs.readdirSync(commandsDir, { withFileTypes: true });
      manifest.slashCommands = files
        .filter((f) => f.isFile() && f.name.endsWith('.md'))
        .map((f) => path.join(commandsDir, f.name));
    }
  }

  // Rules files
  if (target.config.rulesFile) {
    const rulesPath = path.join(cwd, target.config.rulesFile);
    if (fs.existsSync(rulesPath)) {
      manifest.rules.push(rulesPath);
    }
  }

  // Files to preserve
  manifest.preserve = [
    '.sylphx-flow/',
    '.secrets/',
    target.config.configFile || '',
    '.mcp.json',
    'opencode.jsonc',
  ]
    .filter(Boolean)
    .map((p) => path.join(cwd, p));

  return manifest;
}

/**
 * Show sync preview - what will be deleted
 */
export function showSyncPreview(manifest: SyncManifest, cwd: string): void {
  console.log(chalk.cyan.bold('📋 Sync Preview\n'));
  console.log(chalk.dim('The following files will be deleted and re-installed:\n'));

  const allFiles = [...manifest.agents, ...manifest.slashCommands, ...manifest.rules];

  if (allFiles.length === 0) {
    console.log(chalk.yellow('  No template files found\n'));
    return;
  }

  // Group by type
  if (manifest.agents.length > 0) {
    console.log(chalk.cyan('  Agents:'));
    manifest.agents.forEach((file) => {
      const relative = path.relative(cwd, file);
      console.log(chalk.dim(`    - ${relative}`));
    });
    console.log('');
  }

  if (manifest.slashCommands.length > 0) {
    console.log(chalk.cyan('  Slash Commands:'));
    manifest.slashCommands.forEach((file) => {
      const relative = path.relative(cwd, file);
      console.log(chalk.dim(`    - ${relative}`));
    });
    console.log('');
  }

  if (manifest.rules.length > 0) {
    console.log(chalk.cyan('  Rules:'));
    manifest.rules.forEach((file) => {
      const relative = path.relative(cwd, file);
      console.log(chalk.dim(`    - ${relative}`));
    });
    console.log('');
  }

  console.log(chalk.green('✓ Preserved:'));
  manifest.preserve.forEach((file) => {
    const relative = path.relative(cwd, file);
    if (fs.existsSync(file)) {
      console.log(chalk.dim(`    - ${relative}`));
    }
  });
  console.log('');
}

/**
 * Execute sync - delete template files
 */
export async function executeSyncDelete(manifest: SyncManifest): Promise<number> {
  const allFiles = [...manifest.agents, ...manifest.slashCommands, ...manifest.rules];
  let deletedCount = 0;

  for (const file of allFiles) {
    try {
      await fs.promises.unlink(file);
      deletedCount++;
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(chalk.yellow(`⚠ Failed to delete: ${file}`));
      }
    }
  }

  return deletedCount;
}

/**
 * Confirm sync with user
 */
export async function confirmSync(): Promise<boolean> {
  const { default: inquirer } = await import('inquirer');
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Proceed with sync? This will delete the files listed above.',
      default: false,
    },
  ]);
  return confirm;
}
