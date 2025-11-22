#!/usr/bin/env node
/**
 * Hook command - OS notification for Claude Code startup
 *
 * Purpose: Send OS-level notifications when Claude Code starts
 *
 * DESIGN RATIONALE:
 * - Simple notification: Just notify user when Claude Code is ready
 * - Cross-platform: Supports macOS, Linux, and Windows
 * - Non-intrusive: Fails silently if notification system not available
 */

import { exec } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';
import { Command } from 'commander';
import { cli } from '../utils/display/cli-output.js';

const execAsync = promisify(exec);

/**
 * Hook types supported
 */
type HookType = 'notification';

/**
 * Target platforms supported
 */
type TargetPlatform = 'claude-code';

/**
 * Create the hook command
 */
export const hookCommand = new Command('hook')
  .description('Load dynamic system information for Claude Code hooks')
  .requiredOption('--type <type>', 'Hook type (notification)')
  .option('--target <target>', 'Target platform (claude-code)', 'claude-code')
  .option('--verbose', 'Show verbose output', false)
  .action(async (options) => {
    try {
      const hookType = options.type as HookType;
      const target = options.target as TargetPlatform;

      // Validate hook type
      if (hookType !== 'notification') {
        throw new Error(`Invalid hook type: ${hookType}. Must be 'notification'`);
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
  _target: TargetPlatform,
  verbose: boolean = false
): Promise<string> {
  if (hookType === 'notification') {
    return await sendNotification(verbose);
  }

  return '';
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
