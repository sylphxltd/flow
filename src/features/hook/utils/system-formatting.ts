/**
 * System Information Formatting Utilities
 * Pure functions for formatting system information for display
 */

import type { ProjectInfo } from './project-detection.js';
import { formatBytes as formatBytesCore } from '../../../core/formatting/bytes.js';

// ===== Types =====

export interface SystemInfo {
  platform: string;
  arch: string;
  workingDirectory: string;
  tempDirectory: string;
  cpuCores: number;
  totalMemory: number;
  freeMemory: number;
  loadAverage: number[];
}

export interface SessionInfo extends SystemInfo {
  projectInfo: ProjectInfo;
}

export interface MessageInfo {
  currentTime: string;
  cpuUsagePercent: number;
  memoryUsagePercent: string;
  freeMemory: number;
}

// ===== Memory Formatting =====

/**
 * Format bytes to human-readable string for system info
 * Pure - delegates to shared formatting (2 decimals, long units)
 */
export function formatBytes(bytes: number): string {
  return formatBytesCore(bytes, { decimals: 2, shortUnits: false });
}

// ===== CPU Usage Calculation =====

/**
 * Calculate CPU usage percentage from load average
 * Pure - percentage calculation
 */
export function calculateCPUUsage(loadAverage: number, cpuCores: number): number {
  if (cpuCores === 0) {
    return 0;
  }

  return Math.round((loadAverage / cpuCores) * 100);
}

// ===== Memory Usage Calculation =====

/**
 * Calculate memory usage percentage
 * Pure - percentage calculation
 */
export function calculateMemoryUsage(totalMemory: number, freeMemory: number): string {
  if (totalMemory === 0) {
    return '0.0';
  }

  const usedMemory = totalMemory - freeMemory;
  const percentage = (usedMemory / totalMemory) * 100;

  return percentage.toFixed(1);
}

// ===== Session Info Formatting =====

/**
 * Format project information for display
 * Pure - string formatting
 */
export function formatProjectInfo(projectInfo: ProjectInfo): string {
  const lines: string[] = [];

  lines.push(`**Project Type:** ${projectInfo.type}`);
  lines.push(`**Package Manager:** ${projectInfo.packageManager}`);

  if (projectInfo.name && projectInfo.name !== 'unnamed') {
    lines.push(`**Project:** ${projectInfo.name} (${projectInfo.version})`);
  }

  return lines.join('\n');
}

/**
 * Format session information for display
 * Pure - string composition
 */
export function formatSessionInfo(info: SessionInfo): string {
  const sections: string[] = [];

  // System Information
  sections.push('## Session Information');
  sections.push('');
  sections.push(`**Platform:** ${info.platform} (${info.arch})`);
  sections.push(`**Working Directory:** ${info.workingDirectory}`);
  sections.push(`**Temp Directory:** ${info.tempDirectory}`);
  sections.push(`**CPU:** ${info.cpuCores} cores`);
  sections.push(`**Total Memory:** ${formatBytes(info.totalMemory)}`);

  // Project Information
  sections.push('');
  sections.push('## Project Information');
  sections.push('');
  sections.push(formatProjectInfo(info.projectInfo));

  return sections.join('\n');
}

// ===== Message Info Formatting =====

/**
 * Format message information for display
 * Pure - string composition
 */
export function formatMessageInfo(info: MessageInfo): string {
  const lines: string[] = [];

  lines.push('## System Status');
  lines.push('');
  lines.push(`**Current Time:** ${info.currentTime}`);
  lines.push(`**CPU:** ${info.cpuUsagePercent}%`);
  lines.push(`**Memory:** ${info.memoryUsagePercent}% used (${formatBytes(info.freeMemory)} free)`);

  return lines.join('\n');
}

// ===== Time Formatting =====

/**
 * Format date to locale string
 * Pure (though Date is not technically pure, we treat it as data transformation)
 */
export function formatCurrentTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
