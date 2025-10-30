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
  .action(async (options) => {
    try {
      const systemInfo = await getSystemInfo();

      if (options.json) {
        console.log(JSON.stringify(systemInfo, null, 2));
        return;
      }

      // Display formatted system information
      displaySystemInfo(systemInfo);

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
  };
}

function displaySystemInfo(info: any) {
  console.log('');
  console.log(chalk.cyan.bold('▸ System Information'));
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

  // Directory Info
  console.log(chalk.blue.bold('\n📁 Directories:'));
  console.log(`  Temp: ${info.directories.temp}`);
  console.log(`  Working: ${info.directories.workingDirectory}`);
  console.log(`  Home: ${info.directories.homeDirectory}`);

  // Process Info
  console.log(chalk.blue.bold('\n⚡ Process:'));
  console.log(`  PID: ${info.process.pid}`);
  console.log(`  Memory Usage: ${formatBytes(info.process.memoryUsage.rss)}`);

  console.log('');
  console.log(chalk.green('✓ System information retrieved successfully'));
  console.log('');
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}