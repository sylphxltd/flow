#!/usr/bin/env node
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { cli } from '../utils/cli-output.js';
import type { CommandOptions } from '../types.js';

// Create the sysinfo command
export const sysinfoCommand = new Command('sysinfo')
  .description('Display system information and current status')
  .option('--hook <type>', 'Hook type (session, message)')
  .option('--output <type>', 'Output format (simple, standard, json)', 'simple')
  .action(async (options) => {
    try {
      const systemInfo = await getSystemInfo(options.hook || 'message');

      if (options.output === 'json') {
        console.log(JSON.stringify(systemInfo, null, 2));
        return;
      }

      displaySystemInfo(systemInfo, options.hook || 'message', options.output);
    } catch (error) {
      cli.error(`Failed to get system info: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

async function getSystemInfo(preset?: string) {
  const currentTime = new Date().toISOString();
  const tempDir = os.tmpdir();

  // Get memory information
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsage = ((usedMem / totalMem) * 100).toFixed(1);

  // Get CPU information
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || 'Unknown';
  const cpuCores = cpus.length;

  // Get CPU usage (using load average for fast detection)
  const loadAvg = os.loadavg();
  const cpuUsagePercent = Math.round((loadAvg[0] / cpuCores) * 100);

  // Get system uptime
  const uptime = os.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);

  // Get platform information
  const platform = os.platform();
  const arch = os.arch();
  const hostname = os.hostname();
  const userInfo = os.userInfo();

  const baseInfo = {
    timestamp: currentTime,
    system: {
      hostname,
      platform,
      arch,
      nodeVersion: process.version,
      userInfo: {
        username: userInfo.username,
        uid: userInfo.uid,
      },
    },
    hardware: {
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        usagePercent: `${cpuUsagePercent}%`,
      },
      memory: {
        total: formatBytes(totalMem),
        free: formatBytes(freeMem),
        used: formatBytes(usedMem),
        usagePercent: `${memoryUsage}%`,
      },
      uptime: `${uptimeHours}h ${uptimeMinutes}m`,
    },
    directories: {
      temp: tempDir,
      workingDirectory: process.cwd(),
      homeDirectory: os.homedir(),
    },
    process: {
      pid: process.pid,
      ppid: process.ppid,
      memoryUsage: process.memoryUsage(),
    },
  };

  // Check project information for session hook
  if (preset === 'session') {
    const projectInfo = await detectProjectInfo();
    return { ...baseInfo, project: projectInfo };
  }

  // Legacy support for old preset names (development, full)
  if (preset === 'development' || preset === 'full') {
    const environments = await checkDevelopmentEnvironments();
    return { ...baseInfo, environments };
  }

  return baseInfo;
}

async function checkDevelopmentEnvironments() {
  const envs = [];

  // Node.js environment
  if (process.version) {
    envs.push({
      name: 'Node.js',
      version: process.version.slice(1), // Remove 'v' prefix
      path: process.execPath,
    });
  }

  // Check for common development tools
  const tools = [
    { name: 'Python', check: () => checkCommand('python') || checkCommand('python3') },
    { name: 'Git', check: () => checkCommand('git') },
    { name: 'Docker', check: () => checkCommand('docker') },
    { name: 'Bun', check: () => checkCommand('bun') },
    { name: 'npm', check: () => checkCommand('npm') },
    { name: 'yarn', check: () => checkCommand('yarn') },
    { name: 'pnpm', check: () => checkCommand('pnpm') },
    { name: 'Homebrew', check: () => checkCommand('brew') },
  ];

  for (const tool of tools) {
    try {
      const version = await tool.check();
      if (version) {
        envs.push({
          name: tool.name,
          version,
        });
      }
    } catch {
      // Tool not found
    }
  }

  return envs;
}

async function checkCommand(command: string): Promise<string | null> {
  try {
    const { spawn } = await import('node:child_process');
    return new Promise((resolve, reject) => {
      const child = spawn(command, ['--version'], {
        stdio: 'pipe',
        shell: true,
      });

      let output = '';
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Extract version from output
          const versionMatch = output.match(/v?(\d+\.\d+(\.\d+)?)/);
          resolve(versionMatch ? versionMatch[1] : output.trim());
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  } catch {
    return null;
  }
}

async function detectProjectInfo() {
  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, 'package.json');

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    return {
      type: 'unknown',
      packageManager: 'none',
      description: 'No package.json found'
    };
  }

  try {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Detect project type based on dependencies and scripts
    const projectType = detectProjectType(packageJson);

    // Detect package manager based on lock files
    const packageManager = detectPackageManager(cwd);

    return {
      type: projectType,
      packageManager: packageManager,
      name: packageJson.name || 'unnamed',
      version: packageJson.version || '0.0.0',
      description: packageJson.description || ''
    };
  } catch (error) {
    return {
      type: 'js/ts',
      packageManager: 'unknown',
      description: 'Invalid package.json'
    };
  }
}

function detectProjectType(packageJson: any): string {
  // Check for TypeScript
  const hasTypescript = packageJson.devDependencies?.typescript ||
                       packageJson.dependencies?.typescript ||
                       packageJson.devDependencies?.['@types/node'] ||
                       packageJson.scripts?.build?.includes('tsc') ||
                       packageJson.scripts?.dev?.includes('ts-node');

  if (hasTypescript) {
    return 'typescript';
  }

  // Check for React
  const hasReact = packageJson.dependencies?.react ||
                  packageJson.devDependencies?.react ||
                  packageJson.scripts?.dev?.includes('vite') ||
                  packageJson.scripts?.build?.includes('vite');

  if (hasReact) {
    return 'react';
  }

  // Check for Next.js
  const hasNext = packageJson.dependencies?.next ||
                 packageJson.devDependencies?.next ||
                 packageJson.scripts?.dev === 'next dev' ||
                 packageJson.scripts?.build === 'next build';

  if (hasNext) {
    return 'next.js';
  }

  // Default to JavaScript
  return 'javascript';
}

function detectPackageManager(cwd: string): string {
  // Check for lock files in order of preference
  const lockFiles = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'yarn.lock', manager: 'yarn' },
    { file: 'package-lock.json', manager: 'npm' },
    { file: 'bun.lockb', manager: 'bun' },
  ];

  for (const { file, manager } of lockFiles) {
    if (fs.existsSync(path.join(cwd, file))) {
      return manager;
    }
  }

  return 'npm'; // Default to npm
}

function displaySystemInfo(info: any, preset: string = 'message', output: string = 'simple') {
  if (output !== 'simple') {
    console.log('');
  }

  switch (preset) {
    case 'session':
      output === 'simple' ? displaySimpleSession(info) : displaySession(info);
      break;
    case 'message':
      output === 'simple' ? displaySimpleMessage(info) : displayMessage(info);
      break;
    default:
      displayMessage(info);
      break;
  }

  // Only show success message for non-simple output
  if (output !== 'simple') {
    console.log(chalk.green('✓ System information retrieved successfully'));
    console.log('');
  }
}

// Simple output functions (no decorations, optimized for LLMs)
function displaySimpleMessage(info: any) {
  console.log(`Current Time: ${new Date(info.timestamp).toLocaleString()}`);
  console.log(`CPU: ${info.hardware.cpu.usagePercent}`);
  console.log(`Memory: ${info.hardware.memory.usagePercent} used (${info.hardware.memory.free} free)`);
}

function displaySimpleSession(info: any) {
  console.log(`Platform: ${info.system.platform} (${info.system.arch})`);
  console.log(`Working Directory: ${info.directories.workingDirectory}`);
  console.log(`Temp Directory: ${info.directories.temp}`);
  console.log(`CPU: ${info.hardware.cpu.cores} cores`);
  console.log(`Total Memory: ${info.hardware.memory.total}`);

  // Project information
  if (info.project) {
    console.log(`Project Type: ${info.project.type}`);
    console.log(`Package Manager: ${info.project.packageManager}`);
    if (info.project.name && info.project.name !== 'unnamed') {
      console.log(`Project: ${info.project.name} (${info.project.version})`);
    }
  }
}

// Standard output functions (with colors and decorations)
function displayMessage(info: any) {
  console.log(chalk.cyan('▸ Current Status'));
  console.log(chalk.gray('================'));

  console.log(chalk.blue.bold('\n📅 Time:'));
  console.log(`  ${new Date(info.timestamp).toLocaleString()}`);

  console.log(chalk.blue.bold('\n📊 System Status:'));
  console.log(`  CPU: ${info.hardware.cpu.usagePercent}`);
  console.log(`  Memory: ${info.hardware.memory.usagePercent} used (${info.hardware.memory.free} free)`);
}

function displaySession(info: any) {
  console.log(chalk.cyan('▸ Session System Info'));
  console.log(chalk.gray('===================='));

  console.log(chalk.blue.bold('\n💻 System:'));
  console.log(`  Platform: ${info.system.platform} (${info.system.arch})`);
  console.log(`  Working Dir: ${info.directories.workingDirectory}`);
  console.log(`  Temp Dir: ${info.directories.temp}`);

  console.log(chalk.blue.bold('\n🔧 Hardware:'));
  console.log(`  CPU: ${info.hardware.cpu.cores} cores`);
  console.log(`  Total Memory: ${info.hardware.memory.total}`);

  // Project information
  if (info.project) {
    console.log(chalk.blue.bold('\n📁 Project:'));
    console.log(`  Type: ${info.project.type}`);
    console.log(`  Package Manager: ${info.project.packageManager}`);
    if (info.project.name && info.project.name !== 'unnamed') {
      console.log(`  Name: ${info.project.name} (${info.project.version})`);
    }
    if (info.project.description) {
      console.log(`  Description: ${info.project.description}`);
    }
  }
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}