#!/usr/bin/env node
import os from 'node:os';
import { Command } from 'commander';
import chalk from 'chalk';
import { cli } from '../utils/cli-output.js';
import type { CommandOptions } from '../types.js';

// Create the sysinfo command
export const sysinfoCommand = new Command('sysinfo')
  .description('Display system information and current status')
  .option('--target <type>', 'Target platform (claude-code, opencode, default: auto-detect)')
  .option('--json', 'Output in JSON format')
  .option('--preset <type>', 'Output preset (hook, development, full)', 'hook')
  .action(async (options) => {
    try {
      const systemInfo = await getSystemInfo();

      if (options.json) {
        console.log(JSON.stringify(systemInfo, null, 2));
        return;
      }

      // Display formatted system information based on preset
      displaySystemInfo(systemInfo, options.preset);

    } catch (error) {
      cli.error(`Failed to get system info: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

async function getSystemInfo() {
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

  // Get system uptime
  const uptime = os.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);

  // Get platform information
  const platform = os.platform();
  const arch = os.arch();
  const hostname = os.hostname();
  const userInfo = os.userInfo();

  // Check for development environments
  const environments = await checkDevelopmentEnvironments();

  return {
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
    environments,
  };
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

function displaySystemInfo(info: any, preset: string = 'hook') {
  console.log('');

  switch (preset) {
    case 'hook':
      displayHookPreset(info);
      break;
    case 'development':
      displayDevelopmentPreset(info);
      break;
    case 'full':
    default:
      displayFullPreset(info);
      break;
  }

  console.log(chalk.green('✓ System information retrieved successfully'));
  console.log('');
}

function displayHookPreset(info: any) {
  console.log(chalk.cyan('▸ System Info'));
  console.log(chalk.gray('=============='));

  // Current Time (essential for context)
  console.log(chalk.blue.bold('\n📅 Time:'));
  console.log(`  ${new Date(info.timestamp).toLocaleString('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })}`);

  // System info
  console.log(chalk.blue.bold('\n💻 System:'));
  console.log(`  Platform: ${info.system.platform} (${info.system.arch})`);
  console.log(`  Memory: ${info.hardware.memory.usagePercent} used`);
  console.log(`  Working Dir: ${info.directories.workingDirectory}`);

  // Temp directory info (useful for file operations)
  console.log(chalk.blue.bold('\n📁 Temp Directory:'));
  console.log(`  ${info.directories.temp}`);
}

function displayDevelopmentPreset(info: any) {
  console.log(chalk.cyan.bold('▸ Development Environment'));
  console.log(chalk.gray('========================'));

  // Current Time
  console.log(chalk.blue.bold('\n📅 Time:'));
  console.log(`  ${new Date(info.timestamp).toLocaleString('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })}`);

  // Development environments
  if (info.environments && info.environments.length > 0) {
    console.log(chalk.blue.bold('\n🛠️  Available Tools:'));
    info.environments.forEach((env: any) => {
      const path = env.path ? ` (${env.path})` : '';
      console.log(`  ${env.name} v${env.version}${path}`);
    });
  }

  // System Info
  console.log(chalk.blue.bold('\n💻 System:'));
  console.log(`  Platform: ${info.system.platform} (${info.system.arch})`);
  console.log(`  Node.js: ${info.system.nodeVersion}`);
  console.log(`  Memory: ${info.hardware.memory.usagePercent} used`);
  console.log(`  Working: ${info.directories.workingDirectory}`);
  console.log(`  Temp Dir: ${info.directories.temp}`);

  // Hardware
  console.log(chalk.blue.bold('\n🔧 Hardware:'));
  console.log(`  CPU: ${info.hardware.cpu.cores} cores`);
  console.log(`  Memory: ${info.hardware.memory.used} / ${info.hardware.memory.total}`);
}

function displayFullPreset(info: any) {
  console.log(chalk.cyan.bold('▸ Complete System Information'));
  console.log(chalk.gray('====================================='));

  // Current Time
  console.log(chalk.blue.bold('\n📅 Current Time:'));
  console.log(`  ${new Date(info.timestamp).toLocaleString('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })}`);

  // System Info
  console.log(chalk.blue.bold('\n💻 System:'));
  console.log(`  Hostname: ${info.system.hostname}`);
  console.log(`  Platform: ${info.system.platform} (${info.system.arch})`);
  console.log(`  Node.js: ${info.system.nodeVersion}`);
  console.log(`  User: ${info.system.userInfo.username}`);

  // Hardware Info
  console.log(chalk.blue.bold('\n🔧 Hardware:'));
  console.log(`  CPU: ${info.hardware.cpu.model}`);
  console.log(`  Cores: ${info.hardware.cpu.cores}`);
  console.log(`  Memory: ${info.hardware.memory.used} / ${info.hardware.memory.total} (${info.hardware.memory.usagePercent})`);
  console.log(`  Uptime: ${info.hardware.uptime}`);

  // Development environments
  if (info.environments && info.environments.length > 0) {
    console.log(chalk.blue.bold('\n🛠️  Development Tools:'));
    info.environments.forEach((env: any) => {
      const path = env.path ? ` (${env.path})` : '';
      console.log(`  ${env.name} v${env.version}${path}`);
    });
  }

  // Directory Info
  console.log(chalk.blue.bold('\n📁 Directories:'));
  console.log(`  Temp: ${info.directories.temp}`);
  console.log(`  Working: ${info.directories.workingDirectory}`);
  console.log(`  Home: ${info.directories.homeDirectory}`);

  // Process Info
  console.log(chalk.blue.bold('\n⚡ Process:'));
  console.log(`  PID: ${info.process.pid}`);
  console.log(`  Memory Usage: ${formatBytes(info.process.memoryUsage.rss)}`);
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}