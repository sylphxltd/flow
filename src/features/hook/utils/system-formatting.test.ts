import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  calculateCPUUsage,
  calculateMemoryUsage,
  formatProjectInfo,
  formatSessionInfo,
  formatMessageInfo,
  formatCurrentTime,
  type SessionInfo,
  type MessageInfo,
} from './system-formatting.js';

describe('formatBytes', () => {
  it('should format zero bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(1610612736)).toBe('1.5 GB');
  });

  it('should format terabytes', () => {
    expect(formatBytes(1099511627776)).toBe('1 TB');
  });
});

describe('calculateCPUUsage', () => {
  it('should calculate CPU usage percentage', () => {
    expect(calculateCPUUsage(1.0, 4)).toBe(25);
    expect(calculateCPUUsage(2.0, 4)).toBe(50);
    expect(calculateCPUUsage(4.0, 4)).toBe(100);
  });

  it('should handle zero cores', () => {
    expect(calculateCPUUsage(1.0, 0)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(calculateCPUUsage(1.23, 4)).toBe(31);
    expect(calculateCPUUsage(1.27, 4)).toBe(32);
  });
});

describe('calculateMemoryUsage', () => {
  it('should calculate memory usage percentage', () => {
    expect(calculateMemoryUsage(16000000000, 8000000000)).toBe('50.0');
    expect(calculateMemoryUsage(16000000000, 4000000000)).toBe('75.0');
  });

  it('should handle zero total memory', () => {
    expect(calculateMemoryUsage(0, 0)).toBe('0.0');
  });

  it('should format to one decimal place', () => {
    expect(calculateMemoryUsage(1000, 333)).toBe('66.7');
    expect(calculateMemoryUsage(1000, 666)).toBe('33.4');
  });
});

describe('formatProjectInfo', () => {
  it('should format complete project info', () => {
    const info = {
      type: 'typescript',
      packageManager: 'bun',
      name: 'my-app',
      version: '1.0.0',
      description: 'My app',
    };

    const result = formatProjectInfo(info);

    expect(result).toContain('**Project Type:** typescript');
    expect(result).toContain('**Package Manager:** bun');
    expect(result).toContain('**Project:** my-app (1.0.0)');
  });

  it('should skip project name if unnamed', () => {
    const info = {
      type: 'javascript',
      packageManager: 'npm',
      name: 'unnamed',
      version: '0.0.0',
    };

    const result = formatProjectInfo(info);

    expect(result).toContain('**Project Type:** javascript');
    expect(result).not.toContain('**Project:**');
  });

  it('should skip project name if missing', () => {
    const info = {
      type: 'javascript',
      packageManager: 'npm',
    };

    const result = formatProjectInfo(info);

    expect(result).not.toContain('**Project:**');
  });
});

describe('formatSessionInfo', () => {
  it('should format complete session info', () => {
    const info: SessionInfo = {
      platform: 'darwin',
      arch: 'arm64',
      workingDirectory: '/Users/test/project',
      tempDirectory: '/tmp',
      cpuCores: 10,
      totalMemory: 25769803776,
      freeMemory: 8589934592,
      loadAverage: [2.0, 1.5, 1.0],
      projectInfo: {
        type: 'typescript',
        packageManager: 'bun',
        name: 'test-app',
        version: '1.0.0',
      },
    };

    const result = formatSessionInfo(info);

    expect(result).toContain('## Session Information');
    expect(result).toContain('**Platform:** darwin (arm64)');
    expect(result).toContain('**Working Directory:** /Users/test/project');
    expect(result).toContain('**Temp Directory:** /tmp');
    expect(result).toContain('**CPU:** 10 cores');
    expect(result).toContain('**Total Memory:** 24 GB');

    expect(result).toContain('## Project Information');
    expect(result).toContain('**Project Type:** typescript');
    expect(result).toContain('**Package Manager:** bun');
    expect(result).toContain('**Project:** test-app (1.0.0)');
  });
});

describe('formatMessageInfo', () => {
  it('should format message info', () => {
    const info: MessageInfo = {
      currentTime: '1/3/2025, 1:00:00 PM',
      cpuUsagePercent: 25,
      memoryUsagePercent: '75.0',
      freeMemory: 8589934592,
    };

    const result = formatMessageInfo(info);

    expect(result).toContain('## System Status');
    expect(result).toContain('**Current Time:** 1/3/2025, 1:00:00 PM');
    expect(result).toContain('**CPU:** 25%');
    expect(result).toContain('**Memory:** 75.0% used (8 GB free)');
  });
});

describe('formatCurrentTime', () => {
  it('should format timestamp to locale string', () => {
    const timestamp = new Date('2025-01-03T13:00:00Z').getTime();
    const result = formatCurrentTime(timestamp);

    // Just check it's a string (locale formatting varies by system)
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
