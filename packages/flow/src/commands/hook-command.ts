#!/usr/bin/env node
/**
 * Hook command - Dynamic content loading for Claude Code hooks
 *
 * Purpose: Load rules and output styles dynamically via session hooks
 * instead of installing them as static files
 *
 * DESIGN RATIONALE:
 * - Single source of truth: assets/ directory
 * - Dynamic loading: No static file maintenance
 * - Flexible: Easy to extend for different hook types and targets
 * - Consistent: Follows sysinfo command pattern
 */

import { exec } from 'node:child_process';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Command } from 'commander';
import { cli } from '../utils/cli-output.js';

const execAsync = promisify(exec);

/**
 * Hook types supported
 */
type HookType = 'session' | 'message' | 'notification';

/**
 * Target platforms supported
 */
type TargetPlatform = 'claude-code';

/**
 * Create the hook command
 */
export const hookCommand = new Command('hook')
  .description('Load dynamic system information for Claude Code hooks')
  .requiredOption('--type <type>', 'Hook type (session, message)')
  .option('--target <target>', 'Target platform (claude-code)', 'claude-code')
  .option('--verbose', 'Show verbose output', false)
  .action(async (options) => {
    try {
      const hookType = options.type as HookType;
      const target = options.target as TargetPlatform;

      // Validate hook type
      if (!['session', 'message', 'notification'].includes(hookType)) {
        throw new Error(
          `Invalid hook type: ${hookType}. Must be 'session', 'message', or 'notification'`
        );
      }

      // Validate target
      if (target !== 'claude-code') {
        throw new Error(`Invalid target: ${target}. Only 'claude-code' is currently supported`);
      }

      // Load and display content based on hook type
      const content = await loadHookContent(hookType, target, options.verbose);

      // Output the content (no extra formatting, just the content)
      console.log(content);

      // Explicitly exit to ensure process terminates
      // REASON: Even with parseAsync(), the process may not exit due to:
      // 1. Logger instances keeping event loop active
      // 2. Other global resources (timers, listeners) not being cleaned up
      // 3. This is a short-lived CLI command that should exit immediately after output
      // Many CLI tools use process.exit() for this reason - it's the right pattern here
      process.exit(0);
    } catch (error) {
      cli.error(
        `Failed to load hook content: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

/**
 * Load content for a specific hook type and target
 */
async function loadHookContent(
  hookType: HookType,
  target: TargetPlatform,
  verbose: boolean = false
): Promise<string> {
  if (hookType === 'session') {
    return await loadSessionContent(target, verbose);
  }

  if (hookType === 'message') {
    return await loadMessageContent(target, verbose);
  }

  if (hookType === 'notification') {
    return await sendNotification(verbose);
  }

  return '';
}

/**
 * Load content for session start hook
 * Includes: system info only (rules and output styles are static files)
 */
async function loadSessionContent(_target: TargetPlatform, verbose: boolean): Promise<string> {
  // Load system info for session
  if (verbose) {
    cli.info('Loading system info...');
  }
  return await getSystemInfo('session');
}

/**
 * Load content for message hook
 * Includes: system status
 */
async function loadMessageContent(_target: TargetPlatform, verbose: boolean): Promise<string> {
  if (verbose) {
    cli.info('Loading system status...');
  }
  return await getSystemInfo('message');
}

/**
 * Get system information
 */
async function getSystemInfo(hookType: 'session' | 'message'): Promise<string> {
  const currentTime = new Date().toISOString();
  const tempDir = os.tmpdir();

  // Get memory information
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsage = ((usedMem / totalMem) * 100).toFixed(1);

  // Get CPU information
  const cpus = os.cpus();
  const cpuCores = cpus.length;

  // Get CPU usage (using load average for fast detection)
  const loadAvg = os.loadavg();
  const cpuUsagePercent = Math.round((loadAvg[0] / cpuCores) * 100);

  // Get platform information
  const platform = os.platform();
  const arch = os.arch();

  if (hookType === 'session') {
    // Session info includes project information
    const projectInfo = await detectProjectInfo();

    return `## Session Information

**Platform:** ${platform} (${arch})
**Working Directory:** ${process.cwd()}
**Temp Directory:** ${tempDir}
**CPU:** ${cpuCores} cores
**Total Memory:** ${formatBytes(totalMem)}

## Project Information

**Project Type:** ${projectInfo.type}
**Package Manager:** ${projectInfo.packageManager}${
      projectInfo.name && projectInfo.name !== 'unnamed'
        ? `\n**Project:** ${projectInfo.name} (${projectInfo.version})`
        : ''
    }`;
  }

  // Message info - just current status
  return `## System Status

**Current Time:** ${new Date(currentTime).toLocaleString()}
**CPU:** ${cpuUsagePercent}%
**Memory:** ${memoryUsage}% used (${formatBytes(freeMem)} free)`;
}

/**
 * Detect project information
 */
async function detectProjectInfo() {
  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, 'package.json');

  // Check if package.json exists
  if (!fsSync.existsSync(packageJsonPath)) {
    return {
      type: 'unknown',
      packageManager: 'none',
      description: 'No package.json found',
    };
  }

  try {
    // Read package.json
    const packageJson = JSON.parse(fsSync.readFileSync(packageJsonPath, 'utf8'));

    // Detect project type based on dependencies and scripts
    const projectType = detectProjectType(packageJson);

    // Detect package manager based on package.json field, then lock files
    const packageManager = detectPackageManager(cwd, packageJson);

    return {
      type: projectType,
      packageManager: packageManager,
      name: packageJson.name || 'unnamed',
      version: packageJson.version || '0.0.0',
      description: packageJson.description || '',
    };
  } catch (_error) {
    return {
      type: 'js/ts',
      packageManager: 'unknown',
      description: 'Invalid package.json',
    };
  }
}

/**
 * Detect project type from package.json
 */
function detectProjectType(packageJson: Record<string, unknown>): string {
  // Check for TypeScript
  const hasTypescript =
    packageJson.devDependencies?.typescript ||
    packageJson.dependencies?.typescript ||
    packageJson.devDependencies?.['@types/node'] ||
    packageJson.scripts?.build?.includes('tsc') ||
    packageJson.scripts?.dev?.includes('ts-node');

  if (hasTypescript) {
    return 'typescript';
  }

  // Check for React
  const hasReact =
    packageJson.dependencies?.react ||
    packageJson.devDependencies?.react ||
    packageJson.scripts?.dev?.includes('vite') ||
    packageJson.scripts?.build?.includes('vite');

  if (hasReact) {
    return 'react';
  }

  // Check for Next.js
  const hasNext =
    packageJson.dependencies?.next ||
    packageJson.devDependencies?.next ||
    packageJson.scripts?.dev === 'next dev' ||
    packageJson.scripts?.build === 'next build';

  if (hasNext) {
    return 'next.js';
  }

  // Default to JavaScript
  return 'javascript';
}

/**
 * Detect package manager from lock files
 */
function detectPackageManager(cwd: string, packageJson?: any): string {
  // First, check package.json for explicit packageManager field (most accurate)
  if (packageJson?.packageManager) {
    const packageManagerField = packageJson.packageManager;
    // Extract manager name from "bun@1.3.1" format
    const managerName = packageManagerField.split('@')[0];
    if (['npm', 'yarn', 'pnpm', 'bun'].includes(managerName)) {
      return managerName;
    }
  }

  // Fallback: Check for lock files in order of preference
  const lockFiles = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'yarn.lock', manager: 'yarn' },
    { file: 'package-lock.json', manager: 'npm' },
    { file: 'bun.lockb', manager: 'bun' },
  ];

  for (const { file, manager } of lockFiles) {
    if (fsSync.existsSync(path.join(cwd, file))) {
      return manager;
    }
  }

  return 'npm'; // Default to npm
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) {
    return '0 Bytes';
  }

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Send OS-level notification
 */
async function sendNotification(verbose: boolean): Promise<string> {
  const title = '🔮 Sylphx Flow';
  const message = 'Claude Code is ready';
  const platform = os.platform();

  if (verbose) {
    cli.info(`Sending notification on ${platform}...`);
  }

  try {
    switch (platform) {
      case 'darwin':
        await sendMacNotification(title, message);
        break;
      case 'linux':
        await sendLinuxNotification(title, message);
        break;
      case 'win32':
        await sendWindowsNotification(title, message);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return ''; // Notifications don't output to stdout
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (verbose) {
      cli.error(`Failed to send notification: ${errorMsg}`);
    }
    // Don't fail the hook, just silently skip notification
    return '';
  }
}

/**
 * Send notification on macOS using terminal-notifier or osascript
 */
async function sendMacNotification(title: string, message: string): Promise<void> {
  const iconPath = '/Users/kyle/flow/assets/icons/flow-notification-icon.png';

  // Try terminal-notifier if available (supports custom icons)
  try {
    await execAsync('which terminal-notifier');
    await execAsync(
      `terminal-notifier -message "${escapeForShell(message)}" -title "${escapeForShell(title)}" -appIcon "${iconPath}"`
    );
  } catch {
    // Fallback to osascript if terminal-notifier not available
    // Note: osascript doesn't support custom icons, will show Terminal app icon
    const script = `display notification "${escapeForAppleScript(message)}" with title "${escapeForAppleScript(title)}"`;
    await execAsync(`osascript -e '${script}'`);
  }
}

/**
 * Send notification on Linux using notify-send
 */
async function sendLinuxNotification(title: string, message: string): Promise<void> {
  // Try to use notify-send, fail silently if not available
  try {
    await execAsync('which notify-send');
    // Use Flow-themed spiral emoji as icon for Sylphx Flow
    await execAsync(
      `notify-send -i "🌀" "${escapeForShell(title)}" "${escapeForShell(message)}"`
    );
  } catch {
    // notify-send not available, skip notification silently
  }
}

/**
 * Send notification on Windows using PowerShell
 */
async function sendWindowsNotification(title: string, message: string): Promise<void> {
  const script = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$template = @"
<toast>
    <visual>
        <binding template="ToastImageAndText02">
            <image id="1" src="%SystemRoot%\\System32\\Shell32.dll,-16739" alt="info icon"/>
            <text id="1">${escapeForXml(title)}</text>
            <text id="2">${escapeForXml(message)}</text>
        </binding>
    </visual>
</toast>
"@

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = New-Object Windows.UI.Notifications.ToastNotification $xml
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Claude Code").Show($toast)
`;

  await execAsync(`powershell -Command "${escapeForPowerShell(script)}"`);
}

/**
 * Escape string for AppleScript
 */
function escapeForAppleScript(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Escape string for shell
 */
function escapeForShell(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
}

/**
 * Escape string for XML
 */
function escapeForXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape string for PowerShell
 */
function escapeForPowerShell(str: string): string {
  return str.replace(/"/g, '""');
}
