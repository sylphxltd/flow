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

import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { cli } from '../utils/cli-output.js';

/**
 * Hook types supported
 */
type HookType = 'session' | 'message';

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
      if (!['session', 'message'].includes(hookType)) {
        throw new Error(`Invalid hook type: ${hookType}. Must be 'session' or 'message'`);
      }

      // Validate target
      if (target !== 'claude-code') {
        throw new Error(`Invalid target: ${target}. Only 'claude-code' is currently supported`);
      }

      // Load and display content based on hook type
      const content = await loadHookContent(hookType, target, options.verbose);

      // Output the content (no extra formatting, just the content)
      console.log(content);
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

  return '';
}

/**
 * Load content for session start hook
 * Includes: system info only (rules and output styles are static files)
 */
async function loadSessionContent(target: TargetPlatform, verbose: boolean): Promise<string> {
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
async function loadMessageContent(target: TargetPlatform, verbose: boolean): Promise<string> {
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
  } catch (error) {
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
function detectProjectType(packageJson: any): string {
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
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}
