import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import type { Target } from '../types.js';
import { MCP_SERVER_REGISTRY } from '../config/servers.js';
import { getAgentsDir, getSlashCommandsDir, getRulesDir } from './paths.js';

/**
 * Scan directory for .md files and return basenames
 */
function scanTemplateDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith('.md'))
      .map((f) => f.name);
  } catch {
    return [];
  }
}

/**
 * Flow template filenames (scanned from assets at runtime)
 */
const FLOW_AGENTS = scanTemplateDir(getAgentsDir());
const FLOW_SLASH_COMMANDS = scanTemplateDir(getSlashCommandsDir());
const FLOW_RULES = scanTemplateDir(getRulesDir());

/**
 * Categorized files for sync
 */
interface CategorizedFiles {
  inFlow: string[];      // Files that exist locally and in Flow templates (will reinstall)
  unknown: string[];     // Files not in Flow templates (custom or removed)
  missing: string[];     // Flow templates that don't exist locally (will install)
}

/**
 * Sync manifest with categorization
 */
interface SyncManifest {
  agents: CategorizedFiles;
  slashCommands: CategorizedFiles;
  rules: CategorizedFiles;
  mcpServers: {
    inRegistry: string[];
    notInRegistry: string[];
  };
  preserve: string[];
}

/**
 * Categorize files into Flow templates vs unknown, and detect missing templates
 */
function categorizeFiles(files: string[], flowTemplates: string[]): CategorizedFiles {
  const inFlow: string[] = [];
  const unknown: string[] = [];
  const existingBasenames = files.map((f) => path.basename(f));

  // Find missing Flow templates (in flowTemplates but not in files)
  const missing = flowTemplates.filter((template) => !existingBasenames.includes(template));

  for (const file of files) {
    const basename = path.basename(file);
    if (flowTemplates.includes(basename)) {
      inFlow.push(file);
    } else {
      unknown.push(file);
    }
  }

  return { inFlow, unknown, missing };
}

/**
 * Build sync manifest - categorize all files
 */
export async function buildSyncManifest(cwd: string, target: Target): Promise<SyncManifest> {
  const manifest: SyncManifest = {
    agents: { inFlow: [], unknown: [], missing: [] },
    slashCommands: { inFlow: [], unknown: [], missing: [] },
    rules: { inFlow: [], unknown: [], missing: [] },
    mcpServers: { inRegistry: [], notInRegistry: [] },
    preserve: [],
  };

  // Agent files
  if (target.config.agentDir) {
    const agentsDir = path.join(cwd, target.config.agentDir);
    if (fs.existsSync(agentsDir)) {
      const files = fs.readdirSync(agentsDir, { withFileTypes: true });
      const agentFiles = files
        .filter((f) => f.isFile() && f.name.endsWith(target.config.agentExtension || '.md'))
        .map((f) => path.join(agentsDir, f.name));

      manifest.agents = categorizeFiles(agentFiles, FLOW_AGENTS);
    }
  }

  // Slash command files
  if (target.config.slashCommandsDir) {
    const commandsDir = path.join(cwd, target.config.slashCommandsDir);
    if (fs.existsSync(commandsDir)) {
      const files = fs.readdirSync(commandsDir, { withFileTypes: true });
      const commandFiles = files
        .filter((f) => f.isFile() && f.name.endsWith('.md'))
        .map((f) => path.join(commandsDir, f.name));

      manifest.slashCommands = categorizeFiles(commandFiles, FLOW_SLASH_COMMANDS);
    }
  }

  // Rules files - only for targets with separate rules directory
  // Claude Code has rules in agent files, so skip
  if (target.config.rulesFile) {
    const rulesPath = path.join(cwd, target.config.rulesFile);

    // Check if it's a directory or file
    if (fs.existsSync(rulesPath)) {
      const stat = fs.statSync(rulesPath);

      if (stat.isDirectory()) {
        // Scan directory for rule files
        const files = fs.readdirSync(rulesPath, { withFileTypes: true });
        const ruleFiles = files
          .filter((f) => f.isFile() && f.name.endsWith('.md'))
          .map((f) => path.join(rulesPath, f.name));

        manifest.rules = categorizeFiles(ruleFiles, FLOW_RULES);
      } else {
        // Single rules file - check if it matches Flow templates
        manifest.rules = categorizeFiles([rulesPath], FLOW_RULES);
      }
    }
  }

  // MCP servers
  const mcpPath = path.join(cwd, '.mcp.json');
  if (fs.existsSync(mcpPath)) {
    try {
      const content = await fs.promises.readFile(mcpPath, 'utf-8');
      const mcpConfig = JSON.parse(content);

      if (mcpConfig.mcpServers) {
        const installedServers = Object.keys(mcpConfig.mcpServers);
        const registryServers = Object.keys(MCP_SERVER_REGISTRY);

        manifest.mcpServers.inRegistry = installedServers.filter(id =>
          registryServers.includes(id)
        );
        manifest.mcpServers.notInRegistry = installedServers.filter(id =>
          !registryServers.includes(id)
        );
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠ Failed to read .mcp.json'));
    }
  }

  // Files to preserve
  manifest.preserve = [
    '.sylphx-flow/',
    '.secrets/',
    target.config.configFile || '',
  ]
    .filter(Boolean)
    .map((p) => path.join(cwd, p));

  return manifest;
}

/**
 * Show sync preview with categorization
 */
export function showSyncPreview(manifest: SyncManifest, cwd: string): void {
  console.log(chalk.cyan.bold('━━━ 🔄 Sync Preview\n'));

  // Will sync section
  const hasFlowFiles =
    manifest.agents.inFlow.length > 0 ||
    manifest.slashCommands.inFlow.length > 0 ||
    manifest.rules.inFlow.length > 0 ||
    manifest.mcpServers.inRegistry.length > 0;

  if (hasFlowFiles) {
    console.log(chalk.green('Will sync (delete + reinstall):\n'));

    if (manifest.agents.inFlow.length > 0) {
      console.log(chalk.dim('  Agents:'));
      manifest.agents.inFlow.forEach((file) => {
        console.log(chalk.dim(`    ✓ ${path.basename(file)}`));
      });
      console.log('');
    }

    if (manifest.slashCommands.inFlow.length > 0) {
      console.log(chalk.dim('  Commands:'));
      manifest.slashCommands.inFlow.forEach((file) => {
        console.log(chalk.dim(`    ✓ ${path.basename(file)}`));
      });
      console.log('');
    }

    if (manifest.rules.inFlow.length > 0) {
      console.log(chalk.dim('  Rules:'));
      manifest.rules.inFlow.forEach((file) => {
        console.log(chalk.dim(`    ✓ ${path.basename(file)}`));
      });
      console.log('');
    }

    if (manifest.mcpServers.inRegistry.length > 0) {
      console.log(chalk.dim('  MCP Servers:'));
      manifest.mcpServers.inRegistry.forEach((server) => {
        console.log(chalk.dim(`    ✓ ${server}`));
      });
      console.log('');
    }
  }

  // Missing templates section (will be installed)
  const hasMissingFiles =
    manifest.agents.missing.length > 0 ||
    manifest.slashCommands.missing.length > 0 ||
    manifest.rules.missing.length > 0;

  if (hasMissingFiles) {
    console.log(chalk.green('Will install (new templates):\n'));

    if (manifest.agents.missing.length > 0) {
      console.log(chalk.dim('  Agents:'));
      manifest.agents.missing.forEach((file) => {
        console.log(chalk.dim(`    + ${file}`));
      });
      console.log('');
    }

    if (manifest.slashCommands.missing.length > 0) {
      console.log(chalk.dim('  Commands:'));
      manifest.slashCommands.missing.forEach((file) => {
        console.log(chalk.dim(`    + ${file}`));
      });
      console.log('');
    }

    if (manifest.rules.missing.length > 0) {
      console.log(chalk.dim('  Rules:'));
      manifest.rules.missing.forEach((file) => {
        console.log(chalk.dim(`    + ${file}`));
      });
      console.log('');
    }
  }

  // Unknown files section
  const hasUnknownFiles =
    manifest.agents.unknown.length > 0 ||
    manifest.slashCommands.unknown.length > 0 ||
    manifest.rules.unknown.length > 0 ||
    manifest.mcpServers.notInRegistry.length > 0;

  if (hasUnknownFiles) {
    console.log(chalk.yellow('Unknown files (not in Flow templates):\n'));

    if (manifest.agents.unknown.length > 0) {
      console.log(chalk.dim('  Agents:'));
      manifest.agents.unknown.forEach((file) => {
        console.log(chalk.dim(`    ? ${path.basename(file)}`));
      });
      console.log('');
    }

    if (manifest.slashCommands.unknown.length > 0) {
      console.log(chalk.dim('  Commands:'));
      manifest.slashCommands.unknown.forEach((file) => {
        console.log(chalk.dim(`    ? ${path.basename(file)}`));
      });
      console.log('');
    }

    if (manifest.rules.unknown.length > 0) {
      console.log(chalk.dim('  Rules:'));
      manifest.rules.unknown.forEach((file) => {
        console.log(chalk.dim(`    ? ${path.basename(file)}`));
      });
      console.log('');
    }

    if (manifest.mcpServers.notInRegistry.length > 0) {
      console.log(chalk.dim('  MCP Servers:'));
      manifest.mcpServers.notInRegistry.forEach((server) => {
        console.log(chalk.dim(`    ? ${server}`));
      });
      console.log('');
    }
  } else {
    console.log(chalk.green('✓ No unknown files\n'));
  }

  // Preserved section
  console.log(chalk.green('Preserved:\n'));
  manifest.preserve.forEach((file) => {
    const relative = path.relative(cwd, file);
    if (fs.existsSync(file)) {
      console.log(chalk.dim(`  ${relative}`));
    }
  });
  console.log('');
}

/**
 * Select unknown files to remove
 */
export async function selectUnknownFilesToRemove(manifest: SyncManifest): Promise<string[]> {
  const unknownFiles: Array<{ name: string; value: string; type: string }> = [];

  // Collect all unknown files
  manifest.agents.unknown.forEach((file) => {
    unknownFiles.push({
      name: `Agents: ${path.basename(file)}`,
      value: file,
      type: 'agent',
    });
  });

  manifest.slashCommands.unknown.forEach((file) => {
    unknownFiles.push({
      name: `Commands: ${path.basename(file)}`,
      value: file,
      type: 'command',
    });
  });

  manifest.rules.unknown.forEach((file) => {
    unknownFiles.push({
      name: `Rules: ${path.basename(file)}`,
      value: file,
      type: 'rule',
    });
  });

  manifest.mcpServers.notInRegistry.forEach((server) => {
    unknownFiles.push({
      name: `MCP: ${server}`,
      value: server,
      type: 'mcp',
    });
  });

  if (unknownFiles.length === 0) {
    return [];
  }

  const { default: inquirer } = await import('inquirer');
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select files to remove (space to select, enter to continue):',
      choices: unknownFiles.map((f) => ({ name: f.name, value: f.value })),
    },
  ]);

  return selected;
}

/**
 * Show final summary before execution
 */
export function showFinalSummary(
  manifest: SyncManifest,
  selectedUnknowns: string[]
): void {
  console.log(chalk.cyan.bold('\n━━━ 📋 Final Summary\n'));

  // Will delete + reinstall
  const flowFiles = [
    ...manifest.agents.inFlow,
    ...manifest.slashCommands.inFlow,
    ...manifest.rules.inFlow,
  ];

  if (flowFiles.length > 0 || manifest.mcpServers.inRegistry.length > 0) {
    console.log(chalk.yellow('Delete + reinstall:\n'));
    flowFiles.forEach((file) => {
      console.log(chalk.dim(`  - ${path.basename(file)}`));
    });
    if (manifest.mcpServers.inRegistry.length > 0) {
      manifest.mcpServers.inRegistry.forEach((server) => {
        console.log(chalk.dim(`  - MCP: ${server}`));
      });
    }
    console.log('');
  }

  // Will remove (selected unknowns)
  if (selectedUnknowns.length > 0) {
    console.log(chalk.red('Remove (selected):\n'));
    selectedUnknowns.forEach((file) => {
      const name = file.includes('/') ? path.basename(file) : file;
      console.log(chalk.dim(`  - ${name}`));
    });
    console.log('');
  }

  // Will preserve
  const preservedUnknowns = [
    ...manifest.agents.unknown,
    ...manifest.slashCommands.unknown,
    ...manifest.rules.unknown,
    ...manifest.mcpServers.notInRegistry,
  ].filter((file) => !selectedUnknowns.includes(file));

  if (preservedUnknowns.length > 0) {
    console.log(chalk.green('Preserve:\n'));
    preservedUnknowns.forEach((file) => {
      const name = file.includes('/') ? path.basename(file) : file;
      console.log(chalk.dim(`  - ${name}`));
    });
    console.log('');
  }
}

/**
 * Execute sync - delete Flow templates and selected unknowns
 */
export async function executeSyncDelete(
  manifest: SyncManifest,
  selectedUnknowns: string[]
): Promise<{ templates: number; unknowns: number }> {
  const flowFiles = [
    ...manifest.agents.inFlow,
    ...manifest.slashCommands.inFlow,
    ...manifest.rules.inFlow,
  ];

  let templatesDeleted = 0;
  let unknownsDeleted = 0;

  console.log(chalk.cyan('\n🗑️  Deleting files...\n'));

  // Delete Flow templates
  for (const file of flowFiles) {
    try {
      await fs.promises.unlink(file);
      console.log(chalk.dim(`  ✓ Deleted: ${path.basename(file)}`));
      templatesDeleted++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(chalk.yellow(`  ⚠ Failed to delete: ${path.basename(file)}`));
      }
    }
  }

  // Delete selected unknown files
  for (const file of selectedUnknowns) {
    // Skip MCP servers (handled separately)
    if (!file.includes('/')) continue;

    try {
      await fs.promises.unlink(file);
      console.log(chalk.dim(`  ✓ Deleted: ${path.basename(file)}`));
      unknownsDeleted++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(chalk.yellow(`  ⚠ Failed to delete: ${path.basename(file)}`));
      }
    }
  }

  console.log('');

  return { templates: templatesDeleted, unknowns: unknownsDeleted };
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
      message: 'Proceed with sync?',
      default: false,
    },
  ]);
  return confirm;
}

/**
 * Remove MCP servers from .mcp.json
 */
export async function removeMCPServers(cwd: string, serversToRemove: string[]): Promise<number> {
  if (serversToRemove.length === 0) {
    return 0;
  }

  const mcpPath = path.join(cwd, '.mcp.json');

  try {
    const content = await fs.promises.readFile(mcpPath, 'utf-8');
    const mcpConfig = JSON.parse(content);

    if (!mcpConfig.mcpServers) {
      return 0;
    }

    let removedCount = 0;
    for (const server of serversToRemove) {
      if (mcpConfig.mcpServers[server]) {
        delete mcpConfig.mcpServers[server];
        console.log(chalk.dim(`  ✓ Removed MCP: ${server}`));
        removedCount++;
      }
    }

    // Write back
    await fs.promises.writeFile(
      mcpPath,
      JSON.stringify(mcpConfig, null, 2) + '\n',
      'utf-8'
    );

    return removedCount;
  } catch (error) {
    console.warn(chalk.yellow('⚠ Failed to update .mcp.json'));
    return 0;
  }
}
